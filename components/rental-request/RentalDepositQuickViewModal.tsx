"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import { rentalOnboardingService, type RentalOnboarding } from "@/services/rental-onboarding.service";
import paymentService from "@/services/payment-request.service";
import storageService from "@/services/storage.service";
import type { PaymentRequest } from "@/types/payment-request.type";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import { getApiErrorMessage } from "@/utils/apiError";
import { canReviewReservationReceipt, paymentSummaryTitle, reservationPaymentStatus, reservationPaymentTitle, selectOnboardingPayment } from "@/lib/rental-deposit-quick-view";
import { formatVND } from "./rental-request.helper";

const button="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50";
const instant=(value?:string)=>value?new Date(value).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"}):"—";

export function RentalReceiptNotice({request,onOpen}:{request:RentalRequestResponse;onOpen:()=>void}) {
  const payment=request.initialPayment;
  if(request.status!=="ACCEPTED" || payment?.status!=="TRANSFER_REPORTED")return null;
  return <section aria-label="Khoản chuyển chờ xác nhận" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
    <div className="space-y-1 text-sm">
      <p className="font-semibold">{paymentSummaryTitle(payment)} · Khách đã báo chuyển, chờ bạn xác nhận</p>
      <p className="text-lg font-bold">{formatVND(payment.totalAmount)}</p>
      {payment.transferReference && <p className="break-all text-xs">Nội dung chuyển khoản: {payment.transferReference}</p>}
      {payment.payerReportedAt && <p className="text-xs">Báo chuyển: {instant(payment.payerReportedAt)} (giờ Việt Nam)</p>}
      {payment.confirmationDueAt && <p className="text-xs">Hạn xác nhận: {instant(payment.confirmationDueAt)} (giờ Việt Nam)</p>}
      <p className="text-xs">Báo chuyển chưa có nghĩa đã nhận tiền. Đối chiếu chứng từ và tài khoản trước khi xác nhận.</p>
    </div>
    <button type="button" className={`${button} border-primary bg-primary text-primary-foreground hover:bg-primary/90`} onClick={onOpen}>Kiểm tra & xác nhận</button>
  </section>;
}

export function ReservationReceipt({payment,actorId,isLandlord,busy=false,onConfirm,onReject,onProof}: {
  payment:PaymentRequest;actorId:string|null;isLandlord:boolean;busy?:boolean;
  onConfirm:()=>void;onReject:()=>void;onProof:(storageId:string)=>void;
}) {
  const review=canReviewReservationReceipt(payment,actorId,isLandlord);
  const account=payment.payeeBankAccountSnapshot || payment.payeeAccount;
  return <div className="space-y-4">
    <div className="space-y-2 rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <h3 className="font-semibold">{reservationPaymentTitle(payment)}</h3>
      <p className="text-2xl font-extrabold text-primary">{formatVND(payment.totalAmount)}</p>
      <p className="text-sm font-medium">{reservationPaymentStatus(payment)}</p>
      {payment.type==="RESERVATION_DEPOSIT" && <p className="text-xs text-muted-foreground">Khoản này chỉ là cọc giữ chỗ, không gồm tiền thuê tháng đầu.</p>}
      {payment.type==="INITIAL" && payment.lineItems?.map(line=><div key={line.id} className="flex justify-between gap-3 text-sm"><span>{line.displayName}</span><span>{formatVND(line.amount)}</span></div>)}
    </div>
    <dl className="grid gap-3 rounded-2xl border p-4 text-sm sm:grid-cols-2">
      <div><dt className="text-xs text-muted-foreground">Nội dung chuyển khoản</dt><dd className="mt-1 break-all font-semibold">{payment.transferReference || "—"}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Khách báo chuyển lúc</dt><dd className="mt-1">{instant(payment.payerReportedAt)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">Hạn báo chuyển</dt><dd className="mt-1">{instant(payment.dueAt)}</dd></div>
      <div><dt className="text-xs text-muted-foreground">{payment.status==="CONFIRMED"?"Đã xác nhận lúc":"Hạn xác nhận"}</dt><dd className="mt-1">{instant(payment.status==="CONFIRMED"?payment.confirmedAt:payment.confirmationDueAt)}</dd></div>
      {account && <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Tài khoản nhận tiền</dt><dd className="mt-1 break-words">{account.bankName} · {account.accountNumber} · {account.accountHolderName}</dd></div>}
    </dl>
    <div className="space-y-3 rounded-2xl border p-4">
      <h3 className="text-sm font-semibold">Chứng từ người thuê đã gửi</h3>
      {payment.evidences?.length ? payment.evidences.map((e,index)=><div key={e.id} className="space-y-1 text-sm">
        <button type="button" className={button} disabled={busy} onClick={()=>onProof(e.storageObjectId)}>Xem chứng từ {index+1}</button>
        {e.bankTransactionReference && <p>Mã giao dịch: {e.bankTransactionReference}</p>}
        {e.note && <p className="break-words text-muted-foreground">{e.note}</p>}
      </div>):<p className="text-sm text-muted-foreground">Chưa có chứng từ.</p>}
    </div>
    {payment.rejectedReason && <p className="rounded-xl border p-3 text-sm">Lý do chưa xác nhận: {payment.rejectedReason}</p>}
    {review && <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:bg-amber-950/20">
      <p className="text-sm">Đối chiếu chứng từ và tài khoản ngân hàng. Chỉ xác nhận khi bạn đã thực nhận đủ {formatVND(payment.totalAmount)}; báo chuyển chưa có nghĩa đã nhận tiền.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={`${button} border-primary bg-primary text-primary-foreground hover:bg-primary/90`} onClick={onConfirm}>Xác nhận đã nhận đủ tiền</button>
        <button type="button" disabled={busy} className={button} onClick={onReject}>Chưa nhận đủ / Từ chối chứng từ</button>
      </div>
    </div>}
    {["DISPUTED","REJECTED","EXPIRED","OVERDUE"].includes(payment.status) && <p className="text-sm text-muted-foreground">Cần đối soát thêm? Mở chi tiết yêu cầu để xử lý theo tiến trình nhận nhà.</p>}
  </div>;
}

export default function RentalDepositQuickViewModal({request,onClose,onUpdated,onOpenDetail}: {
  request:RentalRequestResponse;onClose:()=>void;onUpdated:()=>void|Promise<void>;onOpenDetail:()=>void;
}) {
  const {userId}=useAuth();
  const dialog=useRef<HTMLDialogElement>(null);
  const alive=useRef(false), sequence=useRef(0), actionLock=useRef(false);
  const retainedPaymentId=useRef<string|null>(null);
  const [selectedPaymentId,setSelectedPaymentId]=useState<string|null>(null);
  const [data,setData]=useState<{key:string;view:RentalOnboarding;payment:PaymentRequest}|null>(null);
  const [loading,setLoading]=useState(true), [busy,setBusy]=useState(false), [error,setError]=useState("");
  const key=JSON.stringify([request.id,userId,selectedPaymentId]);
  const current=data?.key===key?data:null;
  const load=useCallback(async()=>{
    const seq=++sequence.current;
    const view=await rentalOnboardingService.refresh(request.id);
    if(view.askerRole!=="LANDLORD")throw new Error("Bạn không có quyền xem nhanh với vai trò chủ nhà.");
    const selected=selectOnboardingPayment(view.payments,request.id,selectedPaymentId ?? retainedPaymentId.current);
    if(!selected)throw new Error("Không tìm thấy khoản thanh toán đã chọn trong hồ sơ này. Vui lòng tải lại danh sách.");
    const payment=await paymentService.getPaymentRequest(selected.id);
    if(payment.id!==selected.id || !selectOnboardingPayment([payment],request.id,payment.id) || payment.payeeId!==userId)
      throw new Error("Bạn không có quyền nhận tiền của khoản thanh toán này.");
    if(alive.current && seq===sequence.current){retainedPaymentId.current=selected.id;setData({key,view,payment});setError("");}
  },[request.id,userId,key,selectedPaymentId]);
  useEffect(()=>{
    alive.current=true;
    let active=true;
    void load().catch(e=>{if(active)setError(getApiErrorMessage(e,"Không tải được khoản thanh toán."));})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;alive.current=false;};
  },[load]);
  useEffect(()=>{
    const element=dialog.current;element?.showModal();
    return ()=>element?.close();
  },[]);
  async function refresh() {
    if(actionLock.current)return;
    setLoading(true);
    try{await load();}catch(e){setError(getApiErrorMessage(e,"Không tải được khoản thanh toán."));}
    finally{if(alive.current)setLoading(false);}
  }
  function selectPayment(id:string) {
    if(actionLock.current || loading || !current || !selectOnboardingPayment(current.view.payments,request.id,id))return;
    setSelectedPaymentId(id);
  }
  async function decide(received:boolean) {
    if(actionLock.current || loading || error || !current || !canReviewReservationReceipt(current.payment,userId,true))return;
    let reason="";
    if(received) {if(!window.confirm(`Bạn xác nhận đã thực nhận đủ ${formatVND(current.payment.totalAmount)} vào tài khoản ngân hàng?`))return;}
    else {reason=window.prompt("Lý do chưa nhận đủ tiền / từ chối chứng từ:")?.trim() || "";if(!reason)return;}
    actionLock.current=true;setBusy(true);sequence.current++;
    try {
      const payment=received?await paymentService.confirmReceipt(current.payment.id):await paymentService.rejectReceipt(current.payment.id,{reason});
      if(alive.current)setData({...current,payment});
      toast.success(received?"Đã xác nhận nhận đủ tiền.":"Đã ghi nhận từ chối chứng từ.");
      const updates=await Promise.allSettled([load(),Promise.resolve().then(onUpdated)]);
      if(alive.current && updates.some(result=>result.status==="rejected"))setError("Thao tác đã được ghi nhận nhưng chưa làm mới được dữ liệu. Vui lòng bấm Làm mới.");
    } catch(e) {
      toast.error(getApiErrorMessage(e,"Không thể cập nhật khoản thanh toán."));
      try{await load();}catch{if(alive.current)setError("Chưa cập nhật được trạng thái; hãy làm mới trước khi tiếp tục.");}
    } finally {actionLock.current=false;if(alive.current)setBusy(false);}
  }
  async function proof(storageId:string) {
    const tab=window.open("about:blank","_blank");if(tab)tab.opener=null;
    if(!tab){toast.error("Trình duyệt đang chặn mở chứng từ. Vui lòng cho phép cửa sổ mới.");return;}
    try{tab.location.href=await storageService.getPaymentProofViewUrl(storageId);}
    catch{tab.close();toast.error("Không mở được chứng từ hoặc bạn không có quyền truy cập.");}
  }
  return <dialog ref={dialog} aria-labelledby="deposit-quick-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    onCancel={e=>{e.preventDefault();if(!actionLock.current)onClose();}}>
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card p-5">
      <h2 id="deposit-quick-title" className="flex items-center gap-2 text-lg font-bold"><CreditCard className="h-5 w-5 text-primary"/>Xem nhanh thanh toán</h2>
      <button type="button" className={button} disabled={busy} onClick={onClose} aria-label="Đóng xem nhanh thanh toán"><X className="h-4 w-4"/></button>
    </header>
    <div className="space-y-4 p-5">
      <p className="text-sm font-medium">{request.listingTitle}</p>
      {error && <p role="alert" className="rounded-xl border border-amber-300 p-3 text-sm">{error}</p>}
      {loading || !current && !error ? <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin"/>Đang tải khoản thanh toán…</p> : current && <>
        <p className="text-xs text-muted-foreground">Người thuê: {request.renterName} · Ngày vào ở: {current.view.startsOn.split("-").reverse().join("/")} · Cập nhật {instant(current.view.serverNow)} (giờ Việt Nam)</p>
        <div className="flex flex-wrap gap-2" aria-label="Chọn khoản thanh toán">{current.view.payments.filter(p=>selectOnboardingPayment([p],request.id,p.id)).map(p=><button key={p.id} type="button" disabled={busy} aria-pressed={p.id===current.payment.id} className={`${button} ${p.id===current.payment.id?"border-primary text-primary":""}`} onClick={()=>void selectPayment(p.id)}>
          {reservationPaymentTitle(p)} · {reservationPaymentStatus(p)}
        </button>)}</div>
        <ReservationReceipt payment={current.payment} actorId={userId} isLandlord={current.view.askerRole==="LANDLORD"} busy={busy || !!error}
          onConfirm={()=>void decide(true)} onReject={()=>void decide(false)} onProof={id=>void proof(id)}/>
      </>}
    </div>
    <footer className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t bg-card p-4">
      <button type="button" className={button} disabled={busy || loading} onClick={()=>void refresh()}><RefreshCw className="mr-1 inline h-4 w-4"/>Làm mới</button>
      <button type="button" className={button} disabled={busy} onClick={onOpenDetail}>Chi tiết yêu cầu</button>
      <button type="button" className={button} disabled={busy} onClick={onClose}>Đóng</button>
    </footer>
  </dialog>;
}
