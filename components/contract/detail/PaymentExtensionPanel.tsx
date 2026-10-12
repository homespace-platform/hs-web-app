"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { monthlyInvoiceService } from "@/services/monthly-invoice.service";
import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import { getApiErrorMessage } from "@/utils/apiError";

const dateTime = (s: string) => new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const money = (n: number) => `${n.toLocaleString("vi-VN")} đ`;
const statuses = { PENDING: "Chờ chủ nhà duyệt", APPROVED: "Đã đồng ý", REJECTED: "Đã từ chối", EXPIRED: "Hết hạn phản hồi", CLOSED: "Đã đóng" };

export default function PaymentExtensionPanel({ invoice, isLandlord, isTenant, refresh }: {
  invoice: MonthlyInvoice; isLandlord: boolean; isTenant: boolean; refresh: () => Promise<void>;
}) {
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const mutex = useRef(false);
  const history = invoice.paymentExtensions || [];
  const pending = history.find(r => r.status === "PENDING");
  const canRequest = isTenant && invoice.canRequestExtension;
  const canDirect = isLandlord && invoice.canResolveOverdue && !pending;
  if (!canRequest && !canDirect && history.length === 0 && !invoice.lateFeeExempt) return null;

  async function perform(action: () => Promise<unknown>, success: string) {
    if (mutex.current) return;
    mutex.current = true; setBusy(true);
    try { await action(); toast.success(success); }
    catch (error) { toast.error(getApiErrorMessage(error, "Không thể xử lý gia hạn thanh toán.")); }
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
  return <section className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3 text-sm">
    <h4 className="font-semibold">Gia hạn thời gian thanh toán</h4>
    {invoice.originalDueAt && <p className="text-xs text-muted-foreground">Hạn ban đầu: {dateTime(invoice.originalDueAt)}. Hạn hiện tại: {invoice.dueAt ? dateTime(invoice.dueAt) : "—"}.</p>}
    {invoice.lateFeeExempt && <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
      Chủ nhà đã đồng ý gia hạn. Phí phạt của hóa đơn này giữ ở {money(invoice.lateFeeAmount)}, không tăng thêm kể cả trễ hạn mới. Nghĩa vụ thanh toán vẫn còn.
    </p>}
    {pending && <div className="rounded-lg border border-sky-200 bg-white p-3 space-y-2">
      <p className="font-medium">Đang xin thêm {pending.days} ngày, tính từ lúc chủ nhà đồng ý</p>
      <p className="whitespace-pre-wrap break-words text-xs">{pending.note}</p>
      <p className="text-xs">Phản hồi trước: {dateTime(pending.respondBy)}. Phí đã chốt: {money(pending.frozenLateFee)}.</p>
      <p className="text-xs text-muted-foreground">Nếu bị từ chối hoặc hết hạn phản hồi, phí được tính bù từ hạn cũ. Không thể gửi chồng yêu cầu để kéo dài việc dừng phạt.</p>
      {isLandlord && invoice.workflowState !== "UNDER_REVIEW" && invoice.activeResolution === "EXTENSION_REQUEST" &&
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void perform(() => monthlyInvoiceService.decidePaymentExtension(invoice.id, pending.id, true), "Đã đồng ý gia hạn.")}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">Đồng ý thêm {pending.days} ngày</button>
          <button type="button" disabled={busy} onClick={() => {
            if (window.confirm("Từ chối yêu cầu? Phí phạt sẽ được tính bù theo hạn ban đầu."))
              void perform(() => monthlyInvoiceService.decidePaymentExtension(invoice.id, pending.id, false), "Đã từ chối và cập nhật phí.");
          }} className="rounded-lg border border-rose-300 px-3 py-2 text-xs text-rose-700 disabled:opacity-50">Từ chối</button>
        </div>}
    </div>}
    {(canRequest || canDirect) && <div className="space-y-2">
      <p className="text-xs">{canRequest ? "Bạn có thể xin thêm thời gian trả hóa đơn. Đây không phải gia hạn thời gian thuê." : "Phương án thứ ba: dời hạn trả chính hóa đơn này, không chuyển công nợ sang kỳ sau."}</p>
      <label className="block text-xs font-medium">Số ngày (1–30)
        <input aria-label="Số ngày gia hạn thanh toán" type="number" min={1} max={30} step={1} value={days}
          onChange={e => setDays(Number(e.target.value))} className="mt-1 block w-28 rounded-lg border bg-background px-3 py-2" />
      </label>
      <textarea aria-label="Lý do gia hạn thanh toán" maxLength={1000} value={note} rows={2} onChange={e => setNote(e.target.value)}
        placeholder="Lý do hoặc thỏa thuận (ít nhất 10 ký tự)" className="w-full rounded-lg border bg-background p-2 text-xs" />
      <button type="button" disabled={busy} onClick={submit} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
        {busy ? "Đang xử lý…" : canRequest ? "Gửi yêu cầu gia hạn" : "Dời hạn thanh toán"}
      </button>
    </div>}
    {history.length > 0 && <details className="text-xs">
      <summary className="cursor-pointer font-medium">Lịch sử gia hạn ({history.length})</summary>
      <ol className="mt-2 space-y-2">{[...history].reverse().map(r => <li key={r.id} className="rounded-lg border bg-white p-2">
        <p>{statuses[r.status]} · {r.days} ngày · {dateTime(r.requestedAt)}</p>
        {r.newDueAt && <p>Hạn mới: {dateTime(r.newDueAt)}</p>}
        <p className="whitespace-pre-wrap break-words text-muted-foreground">{r.note}</p>
      </li>)}</ol>
    </details>}
  </section>;
}
