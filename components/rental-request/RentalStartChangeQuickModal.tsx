"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import { rentalOnboardingService as service, type RentalOnboarding } from "@/services/rental-onboarding.service";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import { calendarDate, vietnamTime, canHandleStartChange, startChangeStatus } from "@/lib/rental-start-change-quick-view";
import { getApiErrorMessage } from "@/utils/apiError";

type Mode="RECEIVED"|"SENT";
type Action="approve"|"reject"|"withdraw";
const button="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50";

export function StartChangeNotice({request,mode,onOpen}:{request:RentalRequestResponse;mode:Mode;onOpen:()=>void}) {
  const change=request.latestStartChange;
  if(!change)return null;
  const pending=change.status==="REQUESTED" && request.status==="ACCEPTED";
  return <section aria-label="Đề nghị bắt đầu thuê sớm" className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm ${pending?"border-amber-300 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100":"border-border bg-muted/20"}`}>
    <div className="min-w-0 space-y-1">
      <p className="font-semibold">{pending?(mode==="RECEIVED"?"Có đề nghị bắt đầu sớm cần xử lý":"Đã gửi đề nghị bắt đầu sớm · Chờ chủ nhà duyệt"):`Đề nghị bắt đầu sớm · ${startChangeStatus[change.status] || "Cần kiểm tra"}`}</p>
      <p>{calendarDate(change.previousDate)} → <strong>{calendarDate(change.requestedDate)}</strong></p>
      {pending && <p className="text-xs">Hạn phản hồi: {vietnamTime(change.respondBy)} (giờ Việt Nam)</p>}
    </div>
    <button type="button" className={button} onClick={onOpen}>{pending&&mode==="RECEIVED"?"Xử lý đề nghị":"Xem đề nghị"}</button>
  </section>;
}

export function StartChangeReview({request,view,actorId,mode,busy,onAction}:{
  request:RentalRequestResponse;view:RentalOnboarding;actorId:string|null;mode:Mode;busy:boolean;onAction:(id:string,action:Action)=>void;
}) {
  return <div className="space-y-3">{view.startChanges.length===0?<p className="text-sm text-muted-foreground">Chưa có đề nghị bắt đầu sớm.</p>:view.startChanges.map(change=>{
    const actionable=canHandleStartChange(request,view,change,actorId,mode);
    return <article key={change.id} className="space-y-3 rounded-xl border p-4 text-sm">
      <p className="font-semibold">{calendarDate(change.previousDate)} → {calendarDate(change.requestedDate)}</p>
      <p>{startChangeStatus[change.status] || "Cần kiểm tra trạng thái"}</p>
      <p className="whitespace-pre-wrap break-words">{change.reason}</p>
      <p className="text-xs text-muted-foreground">Gửi: {vietnamTime(change.requestedAt)} · Hạn phản hồi: {vietnamTime(change.respondBy)} (giờ Việt Nam)</p>
      {change.decidedAt && <p className="text-xs text-muted-foreground">Đã xử lý: {vietnamTime(change.decidedAt)}</p>}
      {change.responseNote && <p className="break-words">{change.responseNote}</p>}
      {actionable && <div className="flex flex-wrap gap-2">{mode==="RECEIVED"?<>
        <button type="button" className={button} disabled={busy || view.stage!=="WAITING_START"} onClick={()=>onAction(change.id,"approve")}>Đồng ý đổi ngày</button>
        <button type="button" className={button} disabled={busy} onClick={()=>onAction(change.id,"reject")}>Không đồng ý</button>
      </>:<button type="button" className={button} disabled={busy} onClick={()=>onAction(change.id,"withdraw")}>Rút đề nghị</button>}</div>}
    </article>;
  })}</div>;
}

export default function RentalStartChangeQuickModal({request,mode,onClose,onUpdated}:{
  request:RentalRequestResponse;mode:Mode;onClose:()=>void;onUpdated:()=>void|Promise<void>;
}) {
  const {userId}=useAuth();
  const dialog=useRef<HTMLDialogElement>(null),alive=useRef(false),sequence=useRef(0),lock=useRef(false);
  const [data,setData]=useState<{key:string;view:RentalOnboarding}|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [startsOn,setStartsOn]=useState(""),[reason,setReason]=useState("");
  const key=JSON.stringify([request.id,userId,mode]);
  const view=data?.key===key?data.view:null;
  const authorized=!!userId && (mode==="RECEIVED"?userId===request.ownerId:userId===request.renterId);
  const load=useCallback(async()=>{
    const seq=++sequence.current;
    if(!authorized)throw new Error("Bạn không có quyền xem đề nghị của hồ sơ này.");
    const next=await service.refresh(request.id);
    if(next.askerRole!==(mode==="RECEIVED"?"LANDLORD":"TENANT"))throw new Error("Vai trò truy cập không phù hợp.");
    if(alive.current && seq===sequence.current){setData({key,view:next});setError("");}
  },[authorized,request.id,mode,key]);
  useEffect(()=>{
    alive.current=true;let active=true;
    void load().catch(e=>{if(active)setError(getApiErrorMessage(e,"Không tải được đề nghị."));}).finally(()=>{if(active)setLoading(false);});
    const timer=window.setInterval(()=>{if(!lock.current && document.visibilityState==="visible")void load().catch(()=>{if(active)setError("Chưa làm mới được trạng thái. Hãy bấm Làm mới trước khi xử lý.");});},15000);
    return()=>{active=false;alive.current=false;window.clearInterval(timer);};
  },[load]);
  useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close();},[]);
  async function refresh(){if(lock.current)return;setLoading(true);try{await load();}catch(e){setError(getApiErrorMessage(e,"Không tải được đề nghị."));}finally{if(alive.current)setLoading(false);}}
  async function mutate(task:()=>Promise<RentalOnboarding>) {
    if(lock.current || loading || error || !authorized)return;
    lock.current=true;setBusy(true);sequence.current++;
    try {
      const next=await task();if(alive.current){setData({key,view:next});setReason("");setStartsOn("");}
      toast.success("Đã cập nhật đề nghị bắt đầu thuê sớm.");
      const results=await Promise.allSettled([load(),Promise.resolve().then(onUpdated)]);
      if(alive.current && results.some(r=>r.status==="rejected"))setError("Đã ghi nhận thao tác nhưng chưa làm mới được danh sách. Vui lòng bấm Làm mới.");
    } catch(e){toast.error(getApiErrorMessage(e,"Không thể xử lý đề nghị. Điều kiện hoặc thời hạn có thể đã thay đổi."));
      const results=await Promise.allSettled([load(),Promise.resolve().then(onUpdated)]);
      if(alive.current && results[0].status==="rejected")setError("Chưa xác định được kết quả mới nhất. Hãy bấm Làm mới trước khi thao tác tiếp.");
    }finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  function decide(id:string,action:Action) {
    const change=view?.startChanges.find(c=>c.id===id);
    if(!view || !change || !canHandleStartChange(request,view,change,userId,mode) || action==="approve"&&view.stage!=="WAITING_START")return;
    const prompt=action==="approve"?`Đồng ý bắt đầu thuê từ ${calendarDate(change.requestedDate)} thay cho ${calendarDate(change.previousDate)}? Ngày kết thúc và các kỳ hóa đơn sẽ đổi theo ngày mới; cọc đã nhận không thu lại.`:action==="reject"?"Không đồng ý đề nghị đổi ngày này? Ngày thuê hiện tại và cọc được giữ nguyên.":"Rút đề nghị bắt đầu sớm? Ngày thuê hiện tại và cọc được giữ nguyên.";
    if(!window.confirm(prompt))return;
    void mutate(()=>action==="withdraw"?service.withdraw(request.id,id):service.decide(request.id,id,action==="approve"));
  }
  const canRequest=authorized && mode==="SENT" && view?.askerRole==="TENANT" && view.canRequestEarlierStart;
  const minDate=view?new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Ho_Chi_Minh",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(view.serverNow)):"";
  const maxDate=view?new Date(Date.parse(view.startsOn+"T00:00:00Z")-86400000).toISOString().slice(0,10):"";
  return <dialog ref={dialog} aria-labelledby="start-change-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    onCancel={e=>{e.preventDefault();if(!lock.current)onClose();}}>
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card p-5">
      <h2 id="start-change-title" className="flex items-center gap-2 text-lg font-bold"><CalendarClock className="h-5 w-5 text-primary"/>Đề nghị bắt đầu thuê sớm</h2>
      <button type="button" className={button} disabled={busy} onClick={()=>{if(!lock.current)onClose();}} aria-label="Đóng đề nghị bắt đầu sớm"><X className="h-4 w-4"/></button>
    </header>
    <div className="space-y-4 p-5">
      <p className="font-medium">{request.listingTitle}</p>
      {error && <p role="alert" className="rounded-xl border border-amber-300 p-3 text-sm">{error}</p>}
      {loading?<p role="status">Đang tải đề nghị…</p>:view&&<>
        <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-sm"><p>Người thuê: {request.renterName}</p><p>Ngày bắt đầu hiện tại: <strong>{calendarDate(view.startsOn)}</strong> · Kết thúc: {calendarDate(view.endExclusive)} (không gồm ngày này)</p><p>{view.message}</p></div>
        <p className="text-sm text-muted-foreground">Đồng ý sẽ đổi ngày bắt đầu thuê, ngày kết thúc và kỳ hóa đơn, không chỉ đổi ngày ký. Giữ nguyên số tháng, đơn giá và cọc đã nhận. Hợp đồng thuê chỉ tự tạo khi đã đến ngày vào và xác nhận đủ cọc, tiền tháng đầu. Hợp đồng cọc được lập riêng sau khi xác nhận nhận cọc, không đợi đến ngày vào.</p>
        <StartChangeReview request={request} view={view} actorId={userId} mode={mode} busy={busy||!!error} onAction={decide}/>
        {canRequest && <form className="space-y-3 rounded-xl border p-4" onSubmit={e=>{e.preventDefault();if(startsOn>=minDate&&startsOn<view.startsOn&&reason.trim().length>=10)void mutate(()=>service.request(request.id,startsOn,reason.trim()));}}>
          <label className="block text-sm">Ngày bắt đầu thuê mới<input required type="date" min={minDate} max={maxDate} value={startsOn} disabled={busy||!!error} onChange={e=>setStartsOn(e.target.value)} className="mt-1 block rounded-lg border bg-background p-2"/></label>
          <label className="block text-sm">Lý do<textarea required minLength={10} maxLength={1000} disabled={busy||!!error} value={reason} onChange={e=>setReason(e.target.value)} className="mt-1 w-full rounded-lg border bg-background p-2"/></label>
          <button type="submit" className={button} disabled={busy||!!error||!startsOn||startsOn<minDate||startsOn>=view.startsOn||reason.trim().length<10}>Gửi đề nghị bắt đầu sớm</button>
        </form>}
        {!canRequest && view.startChanges.length===0 && <p className="text-sm text-muted-foreground">Hồ sơ chưa đủ điều kiện hoặc đã qua giai đoạn đổi ngày bắt đầu thuê.</p>}
        <p className="text-xs text-muted-foreground">Cập nhật {vietnamTime(view.serverNow)} (giờ Việt Nam)</p>
      </>}
    </div>
    <footer className="sticky bottom-0 flex justify-end gap-2 border-t bg-card p-4">
      <button type="button" className={button} disabled={busy||loading} onClick={()=>void refresh()}>Làm mới</button>
      <button type="button" className={button} disabled={busy} onClick={()=>{if(!lock.current)onClose();}}>Đóng</button>
    </footer>
  </dialog>;
}
