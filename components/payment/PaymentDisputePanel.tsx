"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import paymentService from "@/services/payment-request.service";
import { paymentDisputeService as service } from "@/services/payment-dispute.service";
import storageService from "@/services/storage.service";
import { useAuth } from "@/features/auth/useAuth";
import { getApiErrorMessage } from "@/utils/apiError";
import type { PaymentRequest } from "@/types/payment-request.type";
import { disputeActionLabels, disputeResolutionLabels, disputeEventResolution, type DisputeAction, type DisputeResolution, type PaymentDisputeCase } from "@/types/payment-dispute.type";

type Props = { payment: PaymentRequest; onUpdated: () => Promise<unknown> | void };
const date = (s?: string) => s ? new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const button = "rounded-lg border bg-background px-3 py-2 text-xs font-semibold disabled:opacity-50";

export default function PaymentDisputePanel({ payment, onUpdated }: Props) {
  const { profile } = useAuth();
  const [expanded, setExpanded] = useState(payment.status === "DISPUTED");
  const [rows, setRows] = useState<PaymentDisputeCase[]>([]), [selected, setSelected] = useState("");
  const [reason, setReason] = useState(""), [file, setFile] = useState<File | null>(null);
  const [resolution, setResolution] = useState<DisputeResolution>("REVIEW_TRANSFER");
  const [loading, setLoading] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const generation = useRef(0), actionScope = useRef(0), mutex = useRef(false);
  const scopedRows = rows.filter(c => c.paymentId === payment.id);
  const current = scopedRows.find(c => c.id === selected) ?? scopedRows.find(c => c.status !== "RESOLVED") ?? scopedRows[0];
  const canOpen = ["TRANSFER_REPORTED", "REJECTED"].includes(payment.status)
    || ["INITIAL", "RESERVATION_DEPOSIT"].includes(payment.type) && ["AWAITING_TRANSFER", "EXPIRED"].includes(payment.status);
  const allowed = current?.allowedActions ?? [];
  const reasonValid = reason.trim().length >= 10 && reason.trim().length <= 500;
  const refresh = useCallback(async () => {
    const token = ++generation.current;
    try { const list = await service.list(payment.id); if (token === generation.current) { setRows(list); setError(""); } }
    catch (cause) { if (token === generation.current) setError(getApiErrorMessage(cause, "Chưa tải được hồ sơ đối soát.")); }
    finally { if (token === generation.current) setLoading(false); }
  }, [payment.id]);
  useEffect(() => {
    const scope = generation, actions = actionScope;
    setRows([]); setSelected(""); setReason(""); setFile(null); setBusy(false); setExpanded(payment.status === "DISPUTED");
    return () => { scope.current++; actions.current++; };
    // A status update is handled below without discarding an in-progress note.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.id]);
  useEffect(() => { if (payment.status === "DISPUTED") setExpanded(true); }, [payment.status]);
  // A successful parent list update (realtime/recovery) hands this card a new payment object; refresh an
  // open case silently so case-only changes (propose/evidence/decline/escalate keep DISPUTED) show at once.
  // Id/status changes are already handled above; drafts (reason, file, selection) are never touched.
  const seenPayment = useRef(payment);
  useEffect(() => {
    const previous = seenPayment.current;
    if (previous === payment) return;
    seenPayment.current = payment;
    if (!expanded || previous.id !== payment.id || previous.status !== payment.status) return;
    void refresh();
  }, [payment, expanded, refresh]);
  useEffect(() => {
    const scope = generation;
    if (!expanded) return;
    setLoading(true); void refresh();
    const timer = window.setInterval(() => void refresh(), 20_000);
    return () => { scope.current++; window.clearInterval(timer); };
  }, [expanded, refresh, payment.status]);

  async function perform(action: () => Promise<unknown>) {
    if (mutex.current) return;
    const scope = actionScope.current;
    mutex.current = true; setBusy(true);
    try {
      await action(); if (scope !== actionScope.current) return;
      setReason(""); setFile(null); setSelected(""); await refresh();
      if (scope !== actionScope.current) return;
      await onUpdated(); toast.success("Đã cập nhật hồ sơ đối soát.");
    }
    catch (cause) { if (scope === actionScope.current) { toast.error(getApiErrorMessage(cause, "Chưa thể xử lý đối soát.")); await refresh(); } }
    finally { mutex.current = false; if (scope === actionScope.current) setBusy(false); }
  }
  function act(action: DisputeAction) {
    if (!current || !reasonValid) return;
    const reviewed = current;
    void perform(async () => {
      let evidenceStorageId: string | undefined;
      if (action === "COMMENT" && file) {
        if (file.size > 15 * 1024 * 1024) throw new Error("Chứng cứ không quá 15 MB.");
        evidenceStorageId = await storageService.uploadPaymentProof(file, payment.id);
      }
      return service.act(reviewed.id, action, { expectedRevision: reviewed.revision, reason: reason.trim(),
        resolution: action === "PROPOSE" ? resolution : undefined, evidenceStorageId });
    });
  }
  async function proof(id: string) {
    const tab = window.open("", "_blank");
    try { const url = await storageService.getPaymentProofViewUrl(id); if (tab) { tab.opener = null; tab.location.href = url; } }
    catch (cause) { tab?.close(); toast.error(getApiErrorMessage(cause, "Không mở được chứng cứ.")); }
  }
  if (!profile?.id || ![payment.payerId, payment.payeeId].includes(profile.id)) return null;
  return <section aria-label="Đối soát thanh toán" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/30 p-3 text-sm">
    <button type="button" className="font-semibold text-amber-900" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
      {payment.status === "DISPUTED" ? "Khoản tiền đang đối soát" : "Đối soát và lịch sử xử lý"}
    </button>
    {expanded && <>
      {loading && <p>Đang tải hồ sơ…</p>}
      {error && <p role="alert" className="text-rose-700">{error} <button type="button" className="underline" onClick={() => void refresh()}>Thử lại</button></p>}
      {!loading && !error && <>
        {scopedRows.length > 1 && <label className="block text-xs">Lịch sử hồ sơ <select value={current?.id ?? ""} onChange={e => setSelected(e.target.value)} className="ml-2 rounded border bg-background p-2">{scopedRows.map(c => <option key={c.id} value={c.id}>{date(c.openedAt)} · {c.status === "RESOLVED" ? "Đã mở hướng xử lý" : c.status === "ESCALATED" ? "Chờ quản trị viên" : "Hai bên đối soát"}</option>)}</select></label>}
        {current && <>
          <p><strong>{current.status === "RESOLVED" ? "Đã thống nhất / quyết định hướng xử lý" : current.status === "ESCALATED" ? "Đã chuyển quản trị viên" : "Chờ hai bên thống nhất"}</strong> · {date(current.openedAt)}</p>
          <p>Lý do: {current.reason}</p>
          <p className="text-xs text-muted-foreground">Giá trị lúc mở: {current.amount.toLocaleString("vi-VN")} {current.currency}. Đối soát không tự thay số tiền hoặc ghi nhận đã nhận tiền.</p>
          {current.status === "OPEN" && current.proposedResolution && <div className="rounded-lg border bg-background p-3"><strong>{disputeResolutionLabels[current.proposedResolution]}</strong><p>{current.proposalReason}</p><p className="text-xs">{current.proposedBy === profile.id ? "Bạn đã đề xuất; chờ bên còn lại phản hồi." : "Đề xuất của bên còn lại; đọc chứng cứ trước khi đồng ý."}</p></div>}
          {current.status === "RESOLVED" && <div className="rounded-lg border bg-emerald-50 p-3 text-emerald-900"><p>{current.resolution && disputeResolutionLabels[current.resolution]}</p><p>{current.resolutionReason}</p><p className="mt-1 text-xs">{current.resolution === "REVIEW_TRANSFER" ? "Bên nhận cần kiểm tra tài khoản và bấm xác nhận nhận tiền ở phần thanh toán." : "Bên chuyển có thể gửi lại chứng từ theo số tiền và thời hạn hiện tại ở phần thanh toán."} Chưa có xác nhận thực nhận từ quyết định này.</p></div>}
          {!!current.evidences.length && <div className="flex flex-wrap gap-2">{current.evidences.map((e, i) => <button type="button" key={`${e.storageId}-${i}`} className={button} onClick={() => void proof(e.storageId)}>Xem chứng cứ {i + 1}</button>)}</div>}
          <details className="text-xs"><summary className="cursor-pointer font-semibold">Lịch sử phản hồi và quyết định ({current.events.length})</summary><ol className="mt-2 max-h-64 space-y-2 overflow-y-auto">{current.events.map(e => <li key={e.revision} className="rounded border bg-background p-2"><strong>{disputeActionLabels[e.action] ?? e.action}</strong> · {e.actorId === profile.id ? "Bạn" : e.actorRole === "ADMIN" ? "Quản trị viên" : "Bên còn lại"} · {date(e.occurredAt)}<p>{e.reason}</p>{disputeEventResolution(e.metadataJson) && <p>{disputeEventResolution(e.metadataJson)}</p>}</li>)}</ol></details>
        </>}
        {(allowed.length > 0 || canOpen || payment.status === "DISPUTED" && !scopedRows.some(c => c.status !== "RESOLVED")) && <div className="space-y-2">
          <textarea aria-label="Nội dung đối soát" maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="Phản hồi / lý do xử lý (10–500 ký tự)" className="min-h-20 w-full rounded-lg border bg-background p-2" />
          {allowed.includes("COMMENT") && <div className="space-y-2"><input aria-label="Chứng cứ đối soát" type="file" accept="image/*,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} className="block text-xs"/><button type="button" className={button} disabled={busy || !reasonValid} onClick={() => act("COMMENT")}>Gửi phản hồi / chứng cứ</button></div>}
          {allowed.includes("PROPOSE") && <div className="space-y-2"><div className="flex flex-wrap gap-2"><select aria-label="Hướng xử lý đối soát" value={resolution} onChange={e => setResolution(e.target.value as DisputeResolution)} className="max-w-full rounded-lg border bg-background p-2 text-xs">{Object.entries(disputeResolutionLabels).map(([key, label]) => <option key={key} value={key} disabled={key === "REVIEW_TRANSFER" && !current?.evidences.length}>{label}</option>)}</select><button type="button" className={button} disabled={busy || !reasonValid || resolution === "REVIEW_TRANSFER" && !current?.evidences.length} onClick={() => act("PROPOSE")}>Gửi đề xuất</button></div>{!current?.evidences.length && <p className="text-xs text-muted-foreground">Bổ sung chứng cứ trước khi đề xuất kiểm tra khoản đã chuyển.</p>}</div>}
          <div className="flex flex-wrap gap-2">
            {allowed.includes("ACCEPT") && <button type="button" className={button} disabled={busy || !reasonValid} onClick={() => act("ACCEPT")}>Đồng ý hướng xử lý</button>}
            {allowed.includes("DECLINE") && <button type="button" className={button} disabled={busy || !reasonValid} onClick={() => act("DECLINE")}>Chưa đồng ý</button>}
            {allowed.includes("ESCALATE") && <button type="button" className={button} disabled={busy || !reasonValid} onClick={() => act("ESCALATE")}>Chuyển quản trị viên</button>}
            {canOpen && !scopedRows.some(c => c.status !== "RESOLVED") && <button type="button" className={button} disabled={busy || !reasonValid} onClick={() => void perform(() => paymentService.dispute(payment.id, { reason: reason.trim() }))}>Mở đối soát khoản tiền</button>}
            {payment.status === "DISPUTED" && !scopedRows.some(c => c.status !== "RESOLVED") && <button type="button" className={button} disabled={busy || !reasonValid} onClick={() => void perform(() => service.adopt(payment.id, reason.trim()))}>Tiếp nhận khoản đang đối soát</button>}
          </div>
        </div>}
      </>}
    </>}
  </section>;
}
