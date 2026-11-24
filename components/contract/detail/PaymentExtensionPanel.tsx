"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarClock } from "lucide-react";
import { monthlyInvoiceService } from "@/services/monthly-invoice.service";
import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import { getApiErrorMessage } from "@/utils/apiError";
import { useActionDialog } from "@/components/common/ActionDialog";

import { PolicyNotice } from "@/components/common/PolicyDialog";
const dateTime = (s: string) => new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const money = (n: number) => `${n.toLocaleString("vi-VN")} đ`;
// Extension-request states only (not contract states): no shared map exists for them.
const statuses = { PENDING: "Chờ chủ nhà duyệt", APPROVED: "Đã đồng ý", REJECTED: "Đã từ chối", EXPIRED: "Hết hạn phản hồi", CLOSED: "Đã đóng" };
const field = "w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const primary = "inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50";

/** "Dời hạn thanh toán" moves the due date of ONE invoice. It is not "Gia hạn thời gian thuê" (a longer lease). */
export default function PaymentExtensionPanel({ invoice, isLandlord, isTenant, refresh }: {
  invoice: MonthlyInvoice; isLandlord: boolean; isTenant: boolean; refresh: () => Promise<void>;
}) {
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const mutex = useRef(false);
  const { confirm, dialog } = useActionDialog();
  const history = invoice.paymentExtensions || [];
  const pending = history.find(r => r.status === "PENDING");
  const approved = [...history].reverse().find(r => r.status === "APPROVED");
  const resumedFees = approved?.lateFeeResumesAfterDue === true && approved.newDueAt === invoice.dueAt;
  const canRequest = isTenant && invoice.canRequestExtension;
  const canDirect = isLandlord && invoice.canResolveOverdue && !pending;
  if (!canRequest && !canDirect && history.length === 0) return null;

  async function perform(action: () => Promise<unknown>, success: string) {
    if (mutex.current) return;
    mutex.current = true; setBusy(true);
    try { await action(); toast.success(success); }
    catch (error) { toast.error(getApiErrorMessage(error, "Không thể xử lý yêu cầu dời hạn thanh toán.")); }
    finally {
      try { await refresh(); } finally { mutex.current = false; setBusy(false); }
    }
  }
  function submit() {
    if (!Number.isInteger(days) || days < 1 || days > 30 || note.trim().length < 10 || note.trim().length > 1000) {
      toast.error("Chọn 1–30 ngày và nhập lý do từ 10 đến 1000 ký tự."); return;
    }
    void perform(() => canRequest ? monthlyInvoiceService.requestPaymentExtension(invoice.id, days, note.trim())
      : monthlyInvoiceService.extendPaymentDirectly(invoice.id, days, note.trim()),
      canRequest ? "Đã gửi yêu cầu; phí phạt tạm dừng trong thời gian chờ duyệt." : "Đã cập nhật hạn thanh toán.");
  }
  async function reject(id: string) {
    const ok = await confirm({ title: "Từ chối yêu cầu dời hạn?", description: "Phí phạt sẽ được tính bù theo hạn thanh toán hiện tại.", confirmLabel: "Từ chối", tone: "danger" });
    if (ok) void perform(() => monthlyInvoiceService.decidePaymentExtension(invoice.id, id, false), "Đã từ chối và cập nhật phí.");
  }
  return <section className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm">
    <div>
      <h4 className="flex items-center gap-2 text-base font-semibold"><CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />Dời hạn thanh toán</h4>
      <p className="mt-1 text-muted-foreground">Dời hạn trả riêng hóa đơn này; khác với “Gia hạn thời gian thuê” (kéo dài hợp đồng).</p>
    </div>
    {invoice.originalDueAt && <p className="text-muted-foreground">Hạn ban đầu: {dateTime(invoice.originalDueAt)}. Hạn hiện tại: {invoice.dueAt ? dateTime(invoice.dueAt) : "—"}.</p>}
    {resumedFees && <PolicyNotice tone="info" title="Phí đã chốt trước khi dời hạn" summary="Không tăng phí trong thời gian dời hạn."><p>Phí đã chốt trước khi dời hạn: {money(approved.frozenLateFee)}. Không tăng phí trong thời gian dời hạn. Quá hạn mới, phí tiếp tục tính theo hợp đồng và cộng vào khoản đã chốt; trần tổng phí của hóa đơn không đặt lại.</p></PolicyNotice>}
    {invoice.lateFeeExempt && approved && <p className="rounded-xl bg-emerald-500/10 p-3 text-emerald-700 dark:text-emerald-300">
      Quyết định dời hạn cũ miễn tăng phí cho hóa đơn này. Phí đã chốt là {money(invoice.lateFeeAmount)}; hệ thống giữ nguyên quyết định cũ, không tự truy thu.
    </p>}
    {pending && <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
      <p className="font-semibold">Đang xin dời hạn thêm {pending.days} ngày</p>
      <PolicyNotice tone="neutral" title="Cách tính số ngày dời hạn" summary="Duyệt trước hạn: cộng số ngày vào hạn hiện tại."><p>Duyệt trước hạn: cộng số ngày vào hạn hiện tại. Đã quá hạn: tính từ lúc chủ nhà đồng ý.</p></PolicyNotice>
      <p className="whitespace-pre-wrap break-words">{pending.note}</p>
      <p className="text-muted-foreground">Phản hồi trước: {dateTime(pending.respondBy)}. Phí đã chốt: {money(pending.frozenLateFee)}.</p>
      <PolicyNotice tone="neutral" title="Yêu cầu dời hạn đang chờ" summary="Nếu bị từ chối hoặc hết hạn phản hồi, phí được tính bù từ hạn cũ."><p>Nếu bị từ chối hoặc hết hạn phản hồi, phí được tính bù từ hạn cũ. Không thể gửi chồng yêu cầu để kéo dài việc dừng phạt.</p></PolicyNotice>
      {isLandlord && invoice.workflowState !== "UNDER_REVIEW" && invoice.activeResolution === "EXTENSION_REQUEST" &&
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void perform(() => monthlyInvoiceService.decidePaymentExtension(invoice.id, pending.id, true), "Đã đồng ý dời hạn.")}
            className={primary}>Đồng ý thêm {pending.days} ngày</button>
          <button type="button" disabled={busy} onClick={() => void reject(pending.id)}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-destructive/40 px-4 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">Từ chối</button>
        </div>}
    </div>}
    {(canRequest || canDirect) && <div className="space-y-3">
      <p>{canRequest ? "Bạn có thể xin thêm thời gian trả hóa đơn này." : "Phương án thứ ba: dời hạn trả chính hóa đơn này, không chuyển công nợ sang kỳ sau."}</p>
      <PolicyNotice tone="neutral" title="Quy tắc dời hạn thanh toán" summary="Trong thời gian được dời hạn không tăng phí.">
        <p>Nếu được duyệt trước hạn, số ngày được cộng vào hạn hiện tại; nếu đã quá hạn, tính từ lúc chủ nhà đồng ý.</p>
        <p>Trong thời gian được dời hạn không tăng phí. Nếu vẫn trả trễ hạn mới, phí tiếp tục cộng theo hợp đồng; phí một lần không thu lần hai, phí theo ngày giữ trần tổng 5 ngày/hóa đơn.</p>
      </PolicyNotice>
      <label className="block font-medium">Số ngày (1–30)
        <input aria-label="Số ngày dời hạn thanh toán" type="number" min={1} max={30} step={1} value={days}
          onChange={e => setDays(Number(e.target.value))} className={`${field} mt-1 block w-32`} />
      </label>
      <textarea aria-label="Lý do dời hạn thanh toán" maxLength={1000} value={note} rows={2} onChange={e => setNote(e.target.value)}
        placeholder="Lý do hoặc thỏa thuận (ít nhất 10 ký tự)" className={field} />
      <button type="button" disabled={busy} onClick={submit} className={primary}>
        {busy ? "Đang xử lý…" : canRequest ? "Gửi yêu cầu dời hạn" : "Dời hạn thanh toán"}
      </button>
    </div>}
    {history.length > 0 && <details>
      <summary className="cursor-pointer font-medium">Lịch sử dời hạn ({history.length})</summary>
      <ol className="mt-2 space-y-2">{[...history].reverse().map(r => <li key={r.id} className="rounded-xl border border-border bg-background p-3">
        <p>{statuses[r.status]} · {r.days} ngày · {dateTime(r.requestedAt)}</p>
        {r.newDueAt && <p>Hạn mới: {dateTime(r.newDueAt)}</p>}
        <p className="whitespace-pre-wrap break-words text-muted-foreground">{r.note}</p>
      </li>)}</ol>
    </details>}
    {dialog}
  </section>;
}
