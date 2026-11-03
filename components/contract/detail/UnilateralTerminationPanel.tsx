"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { monthlyInvoiceService } from "@/services/monthly-invoice.service";
import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import { getApiErrorMessage } from "@/utils/apiError";

const dateTime = (value: string) => new Date(value).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
const statusLabel = { NOTICE: "Đã thông báo — chờ 24 giờ", REVIEW_REQUESTED: "Đang chờ chủ nhà xử lý khiếu nại",
  REPLACED: "Đã đổi phương án", WITHDRAWN: "Chủ nhà đã rút quyết định", CANCELLED_PAID: "Đã rút vì thanh toán được xác nhận", ENDED: "Hợp đồng đã chấm dứt" };

export default function UnilateralTerminationPanel({ invoice, isLandlord, isTenant, canIssue, refresh }: {
  invoice: MonthlyInvoice; isLandlord: boolean; isTenant: boolean; canIssue: boolean; refresh: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [option, setOption] = useState<"ROLLOVER" | "PAYMENT_EXTENSION">(invoice.canDeferToNextPeriod ? "ROLLOVER" : "PAYMENT_EXTENSION");
  const [days, setDays] = useState(5);
  const [handover, setHandover] = useState(false);
  const [busy, setBusy] = useState(false);
  const mutex = useRef(false);
  const alive = useRef(true);
  const notice = invoice.unilateralTermination;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (notice?.status !== "NOTICE" && notice?.status !== "REVIEW_REQUESTED") return;
    const timer = setInterval(() => { if (alive.current && !mutex.current) void refresh(); }, 30000);
    return () => clearInterval(timer);
  }, [notice?.status, refresh]);
  if ((!isLandlord && !isTenant) || (!notice && !canIssue)) return null;
  const selectedOption = option === "ROLLOVER" && !invoice.canDeferToNextPeriod ? "PAYMENT_EXTENSION" : option;
  const noteValid = (text: string) => text.trim().length >= 10 && text.trim().length <= 1000;
  async function perform(action: () => Promise<unknown>, confirmation: string) {
    if (mutex.current || !window.confirm(confirmation)) return;
    mutex.current = true; setBusy(true);
    try { await action(); if (alive.current) toast.success("Đã cập nhật hồ sơ xử lý quá hạn."); }
    catch (error) { if (alive.current) toast.error(getApiErrorMessage(error, "Không thể xử lý quyết định. Vui lòng kiểm tra hồ sơ mới nhất.")); }
    finally { try { if (alive.current) await refresh(); } finally { mutex.current = false; if (alive.current) setBusy(false); } }
  }
  return <section className="rounded-xl border border-rose-200 bg-white p-3 space-y-3 text-sm">
    <h4 className="font-semibold text-rose-800">Đơn phương chấm dứt hợp đồng</h4>
    {notice && <div className="space-y-2">
      <p className="font-medium">{statusLabel[notice.status]}</p>
      <p className="whitespace-pre-wrap break-words">Lý do: {notice.reason}</p>
      <p className="text-xs">Thông báo: {dateTime(notice.notifiedAt)}. Hạn khiếu nại xin đổi phương án: {dateTime(notice.respondBy)}.</p>
      {notice.status === "NOTICE" && <p className="text-xs">Không cần người thuê xác nhận đồng ý. Hết 24 giờ mà không khiếu nại, hợp đồng tự chấm dứt. Đang đối soát tiền thì tạm dừng; đã xác nhận thanh toán thì rút quyết định.</p>}
      {notice.requestedAt && <div className="rounded-lg bg-amber-50 p-2 text-xs">
        <p>Người thuê xin {notice.requestedOption === "ROLLOVER" ? "cộng nợ sang kỳ sau" : `dời hạn ${notice.requestedDays} ngày`} lúc {dateTime(notice.requestedAt)}.</p>
        <p className="whitespace-pre-wrap break-words">{notice.requestReason}</p>
      </div>}
      {notice.status === "REVIEW_REQUESTED" && <p className="text-xs">Đã khiếu nại đúng hạn nên tạm dừng tự chấm dứt, chờ chủ nhà quyết định. Chủ nhà từ chối thì hợp đồng chấm dứt ngay.</p>}
      {notice.decisionReason && <p className="whitespace-pre-wrap break-words text-xs">Kết quả: {notice.decisionReason}</p>}
      {notice.endedAt && <p className="text-xs">Chấm dứt lúc {dateTime(notice.endedAt)}. Công nợ còn phải thanh toán. {notice.handoverAt ? `Đã xác nhận bàn giao lúc ${dateTime(notice.handoverAt)}.` : "Chưa xác nhận bàn giao; tin đăng chưa được mở lại."}</p>}
    </div>}
    {isLandlord && canIssue && <div className="space-y-2">
      <p className="text-xs">Gửi thông báo cho người thuê trên hồ sơ. Khách có 24 giờ để khiếu nại xin cộng nợ hoặc dời hạn. Nếu không khiếu nại, hợp đồng tự chấm dứt; không tự coi là đã bàn giao phòng.</p>
      <textarea aria-label="Lý do đơn phương chấm dứt" value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} className="w-full rounded-lg border p-2 text-xs" placeholder="Lý do (10–1000 ký tự)" />
      <button type="button" disabled={busy || !noteValid(reason)} onClick={() => void perform(() => monthlyInvoiceService.issueUnilateralTermination(invoice.id, reason.trim()), "Gửi quyết định đơn phương? Hết 24 giờ không khiếu nại, hợp đồng sẽ chấm dứt; công nợ vẫn còn.")}
        className="rounded-lg bg-rose-700 px-3 py-2 text-xs text-white disabled:opacity-50">Thông báo đơn phương chấm dứt</button>
    </div>}
    {isTenant && notice && invoice.canRequestTerminationReview && <div className="space-y-2">
      <label className="block text-xs">Phương án xin chủ nhà xem xét
        <select aria-label="Phương án khiếu nại" value={selectedOption} onChange={e => setOption(e.target.value as typeof option)} className="mt-1 block rounded-lg border p-2">
          {invoice.canDeferToNextPeriod && <option value="ROLLOVER">Cộng dồn sang kỳ sau</option>}
          <option value="PAYMENT_EXTENSION">Dời hạn thanh toán</option>
        </select>
      </label>
      {selectedOption === "PAYMENT_EXTENSION" && <label className="block text-xs">Số ngày xin thêm (1–30)
        <input aria-label="Số ngày xin dời hạn" type="number" min={1} max={30} step={1} value={days} onChange={e => setDays(Number(e.target.value))} className="ml-2 w-20 rounded-lg border p-2" />
      </label>}
      <textarea aria-label="Lý do khiếu nại xin đổi phương án" value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} className="w-full rounded-lg border p-2 text-xs" placeholder="Lý do xin đổi phương án (10–1000 ký tự)" />
      <button type="button" disabled={busy || !noteValid(reason) || selectedOption === "PAYMENT_EXTENSION" && (!Number.isInteger(days) || days < 1 || days > 30)}
        onClick={() => void perform(() => monthlyInvoiceService.requestTerminationReview(invoice.id, notice.id, { expectedVersion: notice.version, option: selectedOption,
          ...(selectedOption === "PAYMENT_EXTENSION" ? { days } : {}), reason: reason.trim() }), "Gửi khiếu nại xin đổi phương án? Tự chấm dứt sẽ tạm dừng để chờ chủ nhà quyết định.")}
        className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50">Khiếu nại — xin đổi phương án</button>
    </div>}
    {isLandlord && notice && invoice.canDecideTerminationReview && <div className="space-y-2">
      {notice.requestedOption === "ROLLOVER" && !invoice.canDeferToNextPeriod && <p className="text-xs text-amber-800">Kỳ sau không còn nhận được công nợ. Bạn có thể rút quyết định để chọn dời hạn hoặc từ chối khiếu nại; không thể cộng nợ vào hóa đơn đã phát hành.</p>}
      <textarea aria-label="Lý do quyết định khiếu nại" value={decisionReason} maxLength={1000} onChange={e => setDecisionReason(e.target.value)} className="w-full rounded-lg border p-2 text-xs" placeholder="Lý do quyết định (10–1000 ký tự)" />
      <div className="flex flex-wrap gap-2">{[true, false].map(approve => <button key={String(approve)} type="button" disabled={busy || !noteValid(decisionReason) || approve && notice.requestedOption === "ROLLOVER" && !invoice.canDeferToNextPeriod}
        onClick={() => void perform(() => monthlyInvoiceService.decideTerminationReview(invoice.id, notice.id, notice.version, approve, decisionReason.trim()),
          approve ? "Đồng ý phương án người thuê đã xin và rút quyết định chấm dứt?" : "Từ chối khiếu nại và chấm dứt hợp đồng ngay? Công nợ vẫn còn, bàn giao được xác nhận riêng.")}
        className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50">{approve ? "Đồng ý đổi phương án" : "Từ chối — chấm dứt ngay"}</button>)}</div>
    </div>}
    {isLandlord && notice && (notice.status === "NOTICE" || notice.status === "REVIEW_REQUESTED") && <button type="button" disabled={busy}
      onClick={() => void perform(() => monthlyInvoiceService.withdrawUnilateralTermination(invoice.id, notice.id, notice.version), "Rút quyết định đơn phương và tiếp tục hợp đồng?")}
      className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50">Rút quyết định đơn phương</button>}
    {isLandlord && notice && invoice.canCompleteTerminationHandover && <div className="space-y-2">
      <label className="flex gap-2 text-xs"><input type="checkbox" checked={handover} onChange={e => setHandover(e.target.checked)} />Tôi đã nhận lại phòng trống, chìa khóa và tài sản; đồng ý hoàn tất xử lý cọc đã thực nhận theo nhánh vi phạm.</label>
      <button type="button" disabled={busy || !handover} onClick={() => void perform(() => monthlyInvoiceService.completeUnilateralHandover(invoice.id, notice.id, notice.version), "Xác nhận đã thực tế nhận lại phòng? Hệ thống sẽ xử lý cọc thực nhận cho chủ nhà và mở lại tin đăng.")}
        className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50">Xác nhận đã nhận lại phòng</button>
    </div>}
  </section>;
}
