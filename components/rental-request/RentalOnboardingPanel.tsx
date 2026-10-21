"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { rentalOnboardingService as service, type RentalOnboarding } from "@/services/rental-onboarding.service";
import paymentService from "@/services/payment-request.service";
import storageService from "@/services/storage.service";
import { getApiErrorMessage } from "@/utils/apiError";
import RentalPaymentModal from "./RentalPaymentModal";

const date = (s: string) => s.split("T")[0].split("-").reverse().join("/");
const instant = (s?: string) => s ? new Date(s).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—";
const money = (n: number) => n.toLocaleString("vi-VN") + " đ";
const statuses: Record<string, string> = { CONFIRMED: "Đã xác nhận", TRANSFER_REPORTED: "Đã báo chuyển · Chờ xác nhận", AWAITING_TRANSFER: "Chưa thanh toán", DISPUTED: "Cần đối soát", REJECTED: "Chứng từ chưa được chấp nhận", EXPIRED: "Đã hết hạn", CANCELLED: "Đã hủy" };
const decisions: Record<string, string> = { REQUESTED: "Chờ chủ nhà duyệt", APPROVED: "Đã đồng ý", REJECTED: "Không đồng ý", EXPIRED: "Đã hết hạn", WITHDRAWN: "Đã rút" };
const button = "rounded-lg border px-3 py-2 text-sm disabled:opacity-50";

export default function RentalOnboardingPanel({ rentalRequestId, isLandlord, onUpdated, onSnapshot }: {
  rentalRequestId: string; isLandlord?: boolean; onUpdated?: (view: RentalOnboarding) => void | Promise<void>;
  onSnapshot?: (view: RentalOnboarding) => void;
}) {
  const [view, setView] = useState<RentalOnboarding | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const actionLock=useRef(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [startsOn, setStartsOn] = useState("");
  const [reason, setReason] = useState("");
  const [showForm, setShowForm] = useState(false);
  const isOwner = view ? view.askerRole === "LANDLORD" : isLandlord;
  const noticeOpen=!!view && !["COMPLETED","CANCELLED_BY_SYSTEM","CANCELLED_BY_RENTER","CANCELLED_BY_OWNER","EXPIRED","REJECTED"].includes(view.stage);
  useEffect(() => { if (view) onSnapshot?.(view); }, [view, onSnapshot]);
  const load = useCallback(async () => {
    try { const data = await service.refresh(rentalRequestId); setView(data); setError(""); }
    catch (e) { setError(getApiErrorMessage(e, "Chưa tải được tiến trình nhận nhà.")); }
  }, [rentalRequestId]);
  useEffect(() => {
    let active = true;
    async function refresh() { try { const data = await service.refresh(rentalRequestId); if (active) { setView(data); setError(""); } } catch (e) { if (active) setError(getApiErrorMessage(e, "Chưa tải được tiến trình nhận nhà.")); } }
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15000);
    return () => { active = false; clearInterval(timer); };
  }, [rentalRequestId]);
  async function action(task: () => Promise<unknown>) {
    if(actionLock.current)return;
    actionLock.current=true;
    setBusy(true);
    try { await task(); const data = await service.refresh(rentalRequestId); setView(data); await onUpdated?.(data); setShowForm(false); toast.success("Đã cập nhật hồ sơ."); }
    catch (e) { toast.error(getApiErrorMessage(e, "Không thể thực hiện thao tác.")); }
    finally { actionLock.current=false;setBusy(false); }
  }
  async function proof(id: string) {
    const tab = window.open("about:blank", "_blank"); if (tab) tab.opener = null;
    try { const url = await storageService.getPaymentProofViewUrl(id); if (tab) tab.location.href = url; }
    catch { tab?.close(); toast.error("Không mở được chứng từ."); }
  }
  return <section className="space-y-4 rounded-2xl border bg-card p-4">
    <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">Đặt cọc & nhận nhà</h3><button type="button" className={button} disabled={busy} onClick={() => void load()}>Làm mới</button></div>
    {error && <p role="alert" className="text-sm text-amber-700">{error} Dữ liệu đang hiển thị có thể chưa cập nhật.</p>}
    {!view ? <p className="text-sm">Đang tải tiến trình…</p> : <>
      <div className="rounded-xl bg-muted/40 p-3 text-sm"><p>Bắt đầu thuê: <strong>{date(view.startsOn)}</strong> · Kết thúc: <strong>{date(view.endExclusive)}</strong> (không bao gồm ngày này)</p><p className="mt-2">{view.message}</p><p className="mt-2 text-xs text-muted-foreground">Cập nhật {instant(view.serverNow)} · Giờ Việt Nam</p></div>
      {view.deposit && <div className="rounded-xl border p-3 text-sm"><p>Trạng thái cọc: <strong>{({HELD:"Đang giữ cọc",PENDING:"Chưa xác nhận",RETAINED_BY_LANDLORD:"Chủ nhà đã giữ cọc",REFUND_DUE:"Chờ hoàn cọc",REFUNDED:"Đã hoàn cọc",DISPUTED:"Đang đối soát"} as Record<string,string>)[view.deposit.status] || view.deposit.status}</strong></p><p>Đang giữ: {money(view.deposit.heldAmount)} · Đã chốt giữ: {money(view.deposit.retainedAmount || 0)}</p>{view.deposit.retainedReason && <p>{view.deposit.retainedReason}</p>}</div>}
      {view.defaultCase?.notifiedAt && <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        <p className="font-semibold">{view.defaultCase.completedAt ? "Đã hủy hồ sơ và chốt giữ cọc" : !noticeOpen ? "Hồ sơ đã kết thúc / hoàn tất ký · Thông báo cũ không còn áp dụng" : view.defaultCase.disputedAt ? "Đang có phản hồi · Chặn giữ cọc, cần đối soát" : "Thông báo cuối cùng trước khi xử lý giữ cọc"}</p>
        <p>{view.defaultCase.reason}</p><p>Hạn phản hồi: {instant(view.defaultCase.respondBy)} (giờ Việt Nam). Tiền thuê đã nhận phải hoàn riêng.</p>
        {!isOwner && noticeOpen && !view.defaultCase.completedAt && !view.defaultCase.disputedAt && <button type="button" disabled={busy} className={button} onClick={()=>{const note=window.prompt("Nội dung phản hồi / yêu cầu đối soát (ít nhất 10 ký tự):");if(note&&note.trim().length>=10)void action(()=>service.disputeDefault(rentalRequestId,note.trim()));}}>Phản hồi / Yêu cầu đối soát</button>}
        {isOwner && view.defaultCase.canComplete && <button type="button" disabled={busy} className={button} onClick={()=>{
          const note=window.prompt("Lý do chốt giữ cọc (10–500 ký tự):");
          if(note && note.trim().length>=10 && note.trim().length<=500 && window.confirm("Tôi xác nhận đã thông báo cho người thuê, đã đủ hạn phản hồi, chưa bàn giao nhà/chìa khóa và không có tranh chấp hay khoản chuyển đang chờ xác minh. Hủy hồ sơ, giữ 100% cọc thực nhận; hoàn riêng tiền thuê đã nhận?"))void action(()=>service.completeDefault(rentalRequestId,note.trim()));
        }}>Chốt giữ cọc & hủy hồ sơ chưa ký</button>}
      </div>}
      {isOwner && view.defaultCase?.eligibleKind && !view.defaultCase.completedAt && !view.defaultCase.canComplete && <button type="button" disabled={busy} className={button} onClick={()=>{const note=window.prompt("Nội dung thông báo cuối cùng, nêu nghĩa vụ quá hạn và cách liên hệ (ít nhất 10 ký tự):");if(note&&note.trim().length>=10 && window.confirm("Gửi thông báo cuối cùng và mở thêm ít nhất 24 giờ để người thuê thanh toán/ký hoặc phản hồi? Không tự giữ cọc ở bước này."))void action(()=>service.notifyDefault(rentalRequestId,note.trim()));}}>Thông báo quá hạn trước khi xử lý cọc</button>}
      {isOwner && !view.defaultCase?.policyVersion && view.stage !== "COMPLETED" && <p className="text-xs text-muted-foreground">Hồ sơ chưa ghi nhận đồng ý điều kiện giữ cọc trước thanh toán; không cho phép chốt mất cọc tự động hay hồi tố.</p>}
      {view.stage === "WAITING_START" && <p className="text-sm">Mở tiền tháng đầu và ký từ {instant(view.paymentOpensAt)}. Cọc đã nhận được giữ riêng, không thu lại.</p>}
      {view.signingDueAt && view.stage !== "COMPLETED" && <p className="text-sm">Hạn hoàn tất ký: {instant(view.signingDueAt)}. Quá hạn cần đối soát hồ sơ, phòng không tự được giải phóng.</p>}
      {isOwner && view.stage === "REQUIRES_REVIEW" && view.signingDueAt && <button type="button" className={button} disabled={busy} onClick={() => { const note = window.prompt("Lý do mở lại thời hạn ký sau khi đã kiểm tra đủ tiền (tối thiểu 10 ký tự):"); if (note && note.trim().length >= 10) void action(() => service.reopenSigning(rentalRequestId, note.trim())); }}>Đã đối soát · Mở lại thời hạn ký</button>}
      <div className="space-y-3">{view.payments.map(p => <article key={p.id} className="space-y-2 rounded-xl border p-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2"><strong>{p.type === "INITIAL_PAYMENT_REFUND" ? "Chủ nhà hoàn tiền sau hủy" : p.type === "RESERVATION_DEPOSIT" ? "Tiền cọc giữ chỗ" : p.lineItems.some(l => l.type === "DEPOSIT") ? "Cọc + tiền thuê tháng đầu" : "Tiền thuê tháng đầu"}</strong><strong>{money(p.totalAmount)}</strong></div>
        <p>{p.type === "RESERVATION_DEPOSIT" && p.totalAmount === 0 ? "Không yêu cầu đặt cọc · Không cần chuyển khoản" : statuses[p.status] ?? p.status}</p>
        {p.status === "CONFIRMED" ? <p className="text-xs text-emerald-700">Xác nhận: {instant(p.confirmedAt)}</p> : p.dueAt && <p className="text-xs">Hạn báo chuyển: {instant(p.dueAt)}</p>}
        <p className="text-xs">Nội dung chuyển khoản: {p.transferReference}</p>
        <div className="flex flex-wrap gap-2">
          {(p.direction === "LANDLORD_TO_TENANT" ? isOwner : !isOwner && !view.cancellationRequestedAt) && p.totalAmount > 0 && (p.status === "AWAITING_TRANSFER" || p.type === "INITIAL_PAYMENT_REFUND" && p.status === "REJECTED") && (p.type === "INITIAL_PAYMENT_REFUND" || !p.dueAt || new Date(view.serverNow) < new Date(p.dueAt)) && <button type="button" className={button} disabled={busy} onClick={() => setPaymentId(p.id)}>Chuyển khoản / Gửi chứng từ</button>}
          {p.evidences?.map(e => <button type="button" className={button} key={e.id} onClick={() => void proof(e.storageObjectId)}>Xem chứng từ</button>)}
          {(p.direction === "LANDLORD_TO_TENANT" ? !isOwner : isOwner) && p.status === "TRANSFER_REPORTED" && <>
            <button type="button" className={button} disabled={busy} onClick={() => { if (window.confirm(`Xác nhận bạn đã nhận đủ ${money(p.totalAmount)} vào tài khoản?`)) void action(() => paymentService.confirmReceipt(p.id)); }}>Xác nhận đã nhận đủ tiền</button>
            <button type="button" className={button} disabled={busy} onClick={() => { const note = window.prompt("Lý do chưa xác nhận nhận tiền:"); if (note?.trim()) void action(() => paymentService.rejectReceipt(p.id, { reason: note.trim() })); }}>Chưa nhận đủ / Từ chối chứng từ</button>
          </>}
          {!isOwner && ["REJECTED", "TRANSFER_REPORTED", "AWAITING_TRANSFER"].includes(p.status) && p.direction === "TENANT_TO_LANDLORD" && <button type="button" className={button} disabled={busy} onClick={() => { const note = window.prompt("Nội dung cần đối soát (tối thiểu 10 ký tự):"); if (note && note.trim().length >= 10) void action(() => paymentService.dispute(p.id, { reason: note.trim() })); }}>Tôi đã chuyển / Cần đối soát</button>}
          {isOwner && (["REJECTED", "DISPUTED"].includes(p.status) || p.status === "AWAITING_TRANSFER" && p.dueAt && new Date(view.serverNow) >= new Date(p.dueAt)) && p.direction === "TENANT_TO_LANDLORD" && <>
            <button type="button" className={button} disabled={busy} onClick={() => { const note = window.prompt("Ghi nhận đối soát đã nhận đủ tiền (tối thiểu 10 ký tự):"); if (note && note.trim().length >= 10) void action(() => service.review(rentalRequestId, p.id, true, note.trim())); }}>Đối soát: đã nhận đủ</button>
            <button type="button" className={button} disabled={busy} onClick={() => { const note = window.prompt("Ghi rõ chưa nhận tiền và mở lại hạn thanh toán (tối thiểu 10 ký tự):"); if (note && note.trim().length >= 10) void action(() => service.review(rentalRequestId, p.id, false, note.trim())); }}>Chưa nhận: mở lại thanh toán</button>
          </>}
        </div>
      </article>)}</div>
      {!isOwner && view.canRequestEarlierStart && <button type="button" className={button} onClick={() => setShowForm(!showForm)}>Đề nghị nhận nhà và bắt đầu hợp đồng sớm</button>}
      {!isOwner && view.canRequestCancellation && !view.cancellationRequestedAt && view.stage !== "COMPLETED" && <button type="button" className={button} disabled={busy} onClick={() => { const note = window.prompt("Lý do đề nghị hủy và hoàn tiền (tối thiểu 10 ký tự):"); if (note && note.trim().length >= 10) void action(() => service.cancel(rentalRequestId, note.trim())); }}>Đề nghị hủy và hoàn tiền</button>}
      {view.cancellationRequestedAt && view.stage === "CANCELLATION_REQUESTED" && <div className="rounded-xl border p-3 text-sm"><p>{view.cancellationReason}</p>{isOwner && <div className="mt-2 flex gap-2"><button type="button" className={button} disabled={busy} onClick={() => { if (window.confirm("Đồng ý hủy và tạo nghĩa vụ hoàn toàn bộ khoản đã xác nhận? Bạn cần chuyển khoản hoàn và người thuê xác nhận nhận tiền.")) void action(() => service.decideCancel(rentalRequestId, true)); }}>Đồng ý hủy, hoàn tiền</button><button type="button" className={button} disabled={busy} onClick={() => void action(() => service.decideCancel(rentalRequestId, false))}>Không đồng ý hủy</button></div>}</div>}
      {showForm && <form className="space-y-3 rounded-xl border p-3" onSubmit={e => { e.preventDefault(); void action(() => service.request(rentalRequestId, startsOn, reason)); }}>
        <label className="block text-sm">Ngày bắt đầu thuê mới<input required type="date" min={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(view.serverNow))} max={view.startsOn} value={startsOn} onChange={e => setStartsOn(e.target.value)} className="mt-1 block rounded-lg border p-2" /></label>
        <label className="block text-sm">Lý do<textarea required minLength={10} maxLength={1000} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 w-full rounded-lg border p-2" /></label>
        <p className="text-sm">Nếu được chấp nhận, ngày bắt đầu, ngày kết thúc thuê và các kỳ hóa đơn sẽ đổi theo ngày mới. Thời hạn và đơn giá đã thống nhất được giữ nguyên.</p>
        <button type="submit" className={button} disabled={busy || startsOn >= view.startsOn}>Gửi đề nghị</button>
      </form>}
      {!!view.startChanges.length && <details className="rounded-xl border p-3" open={view.startChanges.some(c => c.status === "REQUESTED")}><summary className="cursor-pointer text-sm font-medium">Lịch sử đề nghị bắt đầu sớm ({view.startChanges.length})</summary>
        {view.startChanges.map(c => <article key={c.id} className="mt-3 space-y-2 border-t pt-3 text-sm"><p><strong>{date(c.previousDate)} → {date(c.requestedDate)}</strong> · {decisions[c.status]}</p><p>{c.reason}</p><p className="text-xs">Hạn phản hồi: {instant(c.respondBy)} {c.decidedAt && `· Xử lý: ${instant(c.decidedAt)}`}</p>{c.responseNote && <p>{c.responseNote}</p>}
          {c.status === "REQUESTED" && (isOwner ? <div className="flex gap-2"><button type="button" className={button} disabled={busy} onClick={() => { if (window.confirm(`Đổi ngày bắt đầu thuê sang ${date(c.requestedDate)}? Ngày kết thúc và kỳ hóa đơn cũng thay đổi.`)) void action(() => service.decide(rentalRequestId, c.id, true)); }}>Đồng ý đổi ngày</button><button type="button" className={button} disabled={busy} onClick={() => void action(() => service.decide(rentalRequestId, c.id, false))}>Không đồng ý</button></div> : <button type="button" className={button} disabled={busy} onClick={() => void action(() => service.withdraw(rentalRequestId, c.id))}>Rút đề nghị</button>)}
        </article>)}
      </details>}
      {!!view.history?.length && <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-medium">Lịch sử xử lý hồ sơ</summary>{view.history.map(e => <p key={e.id} className="mt-2 text-sm">{instant(e.occurredAt)} · {({ CANCELLATION_REQUESTED: "Đề nghị hủy và hoàn tiền", CANCELLATION_APPROVED: "Đồng ý hủy và hoàn tiền", CANCELLATION_REJECTED: "Không đồng ý hủy", PAYMENT_RECEIPT_VERIFIED: "Đã đối soát nhận đủ tiền", PAYMENT_REOPENED: "Mở lại thanh toán", SIGNING_REOPENED: "Mở lại thời hạn ký" } as Record<string, string>)[e.action] ?? "Cập nhật hồ sơ"} · {e.note}</p>)}</details>}
    </>}
    {paymentId && <RentalPaymentModal request={{ id: rentalRequestId }} paymentId={paymentId} isOpen onClose={() => { setPaymentId(null); void load(); }} onPaymentSuccess={() => { setPaymentId(null); void load(); }} />}
  </section>;
}
