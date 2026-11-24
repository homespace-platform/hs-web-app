"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import { useActionDialog } from "@/components/common/ActionDialog";
import { rentalOnboardingService as service, type RentalOnboarding } from "@/services/rental-onboarding.service";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import { calendarDate, vietnamTime, startChangeStatus } from "@/lib/rental-start-change-quick-view";
import { readOnboarding } from "@/lib/rental-onboarding-read";
import { toneClasses } from "@/lib/rental-labels";
import { getApiErrorMessage } from "@/utils/apiError";
import ModalShell from "./ModalShell";
import { EarlierStartForm, StartChangeReview, confirmStartChange, type StartChangeAction } from "./EarlierStart";

export { StartChangeReview };
type Mode="RECEIVED"|"SENT";
const button="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50";

/** One line on the list card: a pending or decided earlier-start request and where to open it. */
export function StartChangeNotice({request,mode,onOpen}:{request:RentalRequestResponse;mode:Mode;onOpen:()=>void}) {
  const change=request.latestStartChange;
  if(!change)return null;
  const pending=change.status==="REQUESTED" && request.status==="ACCEPTED";
  return <section aria-label="Đề nghị bắt đầu thuê sớm" className={`flex flex-col gap-3 rounded-2xl border p-3 text-sm sm:flex-row sm:items-center sm:justify-between ${pending?toneClasses.warning:"border-border bg-muted/30"}`}>
    <div className="min-w-0 space-y-1">
      <p className="flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true"/>{pending?(mode==="RECEIVED"?"Có đề nghị bắt đầu sớm cần xử lý":"Đã gửi đề nghị bắt đầu sớm · Chờ chủ nhà duyệt"):`Đề nghị bắt đầu sớm · ${startChangeStatus[change.status] || "Cần kiểm tra"}`}</p>
      <p>{calendarDate(change.previousDate)} → <strong>{calendarDate(change.requestedDate)}</strong></p>
      {pending && <p className="text-xs opacity-80">Hạn phản hồi: {vietnamTime(change.respondBy)} (giờ Việt Nam)</p>}
    </div>
    <button type="button" className={button} onClick={onOpen}>{pending&&mode==="RECEIVED"?"Xử lý đề nghị":"Xem đề nghị"}</button>
  </section>;
}

export default function RentalStartChangeQuickModal({request,mode,onClose,onUpdated}:{
  request:RentalRequestResponse;mode:Mode;onClose:()=>void;onUpdated:()=>void|Promise<void>;
}) {
  const {userId}=useAuth();
  const {confirm,dialog}=useActionDialog();
  const alive=useRef(false),sequence=useRef(0),lock=useRef(false);
  const [data,setData]=useState<{key:string;view:RentalOnboarding}|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const key=JSON.stringify([request.id,userId,mode]);
  const view=data?.key===key?data.view:null;
  const authorized=!!userId && (mode==="RECEIVED"?userId===request.ownerId:userId===request.renterId);
  const load=useCallback(async(sync=false)=>{
    const seq=++sequence.current;
    if(!authorized)throw new Error("Bạn không có quyền xem đề nghị của hồ sơ này.");
    // First open syncs stages on the server; polling only reads.
    const next=sync?await service.refresh(request.id):await readOnboarding(request.id);
    if(next.askerRole!==(mode==="RECEIVED"?"LANDLORD":"TENANT"))throw new Error("Vai trò truy cập không phù hợp.");
    if(alive.current && seq===sequence.current){setData({key,view:next});setError("");}
  },[authorized,request.id,mode,key]);
  useEffect(()=>{
    alive.current=true;let active=true;
    void load(true).catch(e=>{if(active)setError(getApiErrorMessage(e,"Không tải được đề nghị."));}).finally(()=>{if(active)setLoading(false);});
    const timer=window.setInterval(()=>{if(!lock.current && document.visibilityState==="visible")void load().catch(()=>{if(active)setError("Chưa làm mới được trạng thái. Hãy bấm Làm mới trước khi xử lý.");});},15000);
    return()=>{active=false;alive.current=false;window.clearInterval(timer);};
  },[load]);
  async function refresh(){if(lock.current)return;setLoading(true);try{await load(true);}catch(e){setError(getApiErrorMessage(e,"Không tải được đề nghị."));}finally{if(alive.current)setLoading(false);}}
  async function mutate(task:()=>Promise<RentalOnboarding>) {
    if(lock.current || loading || error || !authorized)return;
    lock.current=true;setBusy(true);sequence.current++;
    try {
      const next=await task();if(alive.current)setData({key,view:next});
      toast.success("Đã cập nhật đề nghị bắt đầu thuê sớm.");
      const results=await Promise.allSettled([load(),Promise.resolve().then(onUpdated)]);
      if(alive.current && results.some(r=>r.status==="rejected"))setError("Đã ghi nhận thao tác nhưng chưa làm mới được danh sách. Vui lòng bấm Làm mới.");
    } catch(e){toast.error(getApiErrorMessage(e,"Không thể xử lý đề nghị. Điều kiện hoặc thời hạn có thể đã thay đổi."));
      const results=await Promise.allSettled([load(),Promise.resolve().then(onUpdated)]);
      if(alive.current && results[0].status==="rejected")setError("Chưa xác định được kết quả mới nhất. Hãy bấm Làm mới trước khi thao tác tiếp.");
    }finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  async function decide(id:string,action:StartChangeAction) {
    const change=view?.startChanges.find(c=>c.id===id);
    if(!view || !change || action==="approve"&&view.stage!=="WAITING_START")return;
    if(!await confirmStartChange(confirm,change,action))return;
    void mutate(()=>action==="withdraw"?service.withdraw(request.id,id):service.decide(request.id,id,action==="approve"));
  }
  const canRequest=authorized && mode==="SENT" && view?.askerRole==="TENANT" && view.canRequestEarlierStart;
  return <>
    <ModalShell title="Đề nghị bắt đầu thuê sớm" icon={<CalendarClock className="h-5 w-5"/>} onClose={onClose} closeDisabled={busy} size="md"
      footer={<>
        <button type="button" className={button} disabled={busy||loading} onClick={()=>void refresh()}><RefreshCw className="h-4 w-4" aria-hidden="true"/>Làm mới</button>
        <button type="button" className={button} disabled={busy} onClick={onClose}>Đóng</button>
      </>}>
      <div className="space-y-4">
        <p className="text-base font-bold">{request.listingTitle}</p>
        {error && <p role="alert" className={`rounded-2xl border p-3 text-sm ${toneClasses.warning}`}>{error}</p>}
        {loading?<p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>Đang tải đề nghị…</p>:view&&<>
          <div className="space-y-1 rounded-2xl border border-border bg-card p-4 text-sm shadow-sm"><p>Người thuê: <strong>{request.renterName}</strong></p><p>Ngày bắt đầu hiện tại: <strong>{calendarDate(view.startsOn)}</strong> · Kết thúc: {calendarDate(view.endExclusive)} (không gồm ngày này)</p><p className="text-muted-foreground">{view.message}</p></div>
          <StartChangeReview request={request} view={view} actorId={userId} mode={mode} busy={busy||!!error} onAction={(id,action)=>void decide(id,action)}/>
          {canRequest && <EarlierStartForm key={view.startChanges.length} view={view} busy={busy||!!error} onSubmit={(startsOn,reason)=>void mutate(()=>service.request(request.id,startsOn,reason))}/>}
          {!canRequest && view.startChanges.length===0 && <p className="text-sm text-muted-foreground">Hồ sơ chưa đủ điều kiện hoặc đã qua giai đoạn đổi ngày bắt đầu thuê.</p>}
          <p className="text-xs text-muted-foreground">Cập nhật {vietnamTime(view.serverNow)} (giờ Việt Nam)</p>
        </>}
      </div>
    </ModalShell>
    {dialog}
  </>;
}
