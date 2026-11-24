"use client";
import { PolicyNotice } from "@/components/common/PolicyDialog";
import {useCallback,useEffect,useRef,useState} from "react";
import {useAuth} from "@/features/auth/useAuth";
import {toast} from "sonner";
import {rentalWorkflowService as service} from "@/services/rental-workflow.service";
import storage from "@/services/storage.service";
import {invoiceDetailPath} from "@/lib/contract-routes";
import {getApiErrorMessage} from "@/utils/apiError";
import notificationService from "@/services/notification.service";
import {workflowTitles,workflowStatuses,workflowActions,workflowObligations,type RentalWorkflow,type WorkflowKind,type WorkflowProposal} from "@/types/rental-workflow.type";
import RentalPaymentModal from "./RentalPaymentModal";
import {Calendar} from "@/components/ui/calendar";
import WorkflowDocumentsPanel from "./WorkflowDocumentsPanel";
import type {FinalRentCalculation} from "@/types/rental-workflow.type";

const button="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";
const input="mt-1 block w-full rounded-lg border bg-background p-2 text-sm";
const date=(s?:string)=>s?new Date(s).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"}):"—";
const money=(n?:number|null)=>n==null?"Chưa ghi nhận":n.toLocaleString("vi-VN")+" đ";
const calendarDate=(value:string)=>value.split("-").reverse().join("/");
const dateKey=(value:Date)=>`${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`;
const parseDate=(value:string)=>{const [year,month,day]=value.split("-").map(Number);return new Date(year,month-1,day);};
// contractId (root lease) scopes notices to this panel; focusRequest opens, highlights and scrolls to it once.
type Props={rentalRequestId:string;kind:WorkflowKind;contractId?:string;focusRequest?:boolean;agreementId?:string;onUpdated?:()=>Promise<unknown>|void};
const keyOf=(w:RentalWorkflow)=>`${w.revision}:${w.status}`;
export default function RentalWorkflowPanel(props:Props){
  const {profile}=useAuth();
  if(!profile?.id||!props.rentalRequestId)return null;
  return <ScopedWorkflowPanel key={`${props.rentalRequestId}:${props.kind}:${profile.id}`} {...props}/>;
}
export function WorkflowSummary({proposal:p,lastOccupiedDay}:{proposal:WorkflowProposal;lastOccupiedDay?:string}){
  return <div className="space-y-2 text-sm">
    {p.reason&&<p className="whitespace-pre-wrap">{p.reason}</p>}
    {p.endExclusive&&<>{lastOccupiedDay?<p>Ngày ở cuối cùng: <strong>{calendarDate(lastOccupiedDay)}</strong></p>:<p>Ngày kết thúc (không tính ngày này): <strong>{p.endExclusive}</strong></p>}{p.handoverTerms&&<p>Bàn giao: {p.handoverTerms}</p>}<p>{p.finalRentPolicy==="DAILY_PRORATED"?"Tiền thuê kỳ cuối tính theo ngày thực tế của kỳ; các phí khác theo HĐ/hóa đơn.":"Tiền thuê và phí cố định tính trọn kỳ đã bắt đầu."} Cọc quyết toán riêng sau hóa đơn cuối.</p>{p.rentRefunds?.length?<table className="w-full text-left text-xs"><thead><tr><th>Khoản hoàn đã thống nhất</th><th>Số tiền</th></tr></thead><tbody>{p.rentRefunds.map((r,i)=><tr key={r.paymentId}><td>Khoản {i+1}</td><td>{money(r.amount)}</td></tr>)}</tbody></table>:null}</>}
  </div>;
}
function Evidence({ids}:{ids?:string[]}){
  return <div className="flex flex-wrap gap-3">{ids?.map((id,i)=><button className="text-xs text-primary underline" type="button" key={id} onClick={async()=>{const tab=window.open("about:blank","_blank");if(tab)tab.opener=null;try{const url=await storage.getViewUrl(id);if(tab)tab.location.href=url;}catch(e){tab?.close();toast.error(getApiErrorMessage(e,"Không mở được bằng chứng."));}}}>Xem bằng chứng {i+1} ↗</button>)}</div>;
}
function ScopedWorkflowPanel({rentalRequestId,kind,contractId,focusRequest,agreementId,onUpdated}:Props){
  const [expanded,setExpanded]=useState(!!focusRequest),[data,setData]=useState<RentalWorkflow|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [creating,setCreating]=useState(false),[reason,setReason]=useState(""),[ack,setAck]=useState(false),[contacted,setContacted]=useState(false),[files,setFiles]=useState<File[]>([]);
  const [end,setEnd]=useState(""),[paymentId,setPaymentId]=useState<string>();
  const [reviewedKey,setReviewedKey]=useState<string|null>(null);
  const mounted=useRef(true),mutex=useRef(false),uploaded=useRef(new Map<File,string>());
  const inflight=useRef<Promise<void>|null>(null),dirty=useRef(false),hiddenDirty=useRef(false),keyRef=useRef<string|null>(null),focused=useRef(false);
  const needsReview=!busy&&!!data&&reviewedKey!==null&&reviewedKey!==keyOf(data);
  const [selectedAction,setSelectedAction]=useState<string|null>(null);
  const earlyExit=kind==="early-exit";
  const actionLabel=(action:string)=>earlyExit&&action==="ACCEPT"?"Đồng ý và tạo phụ lục":action==="CANCEL"?"Hủy đề nghị chờ ký":workflowActions[action]??action;
  const choices=data?.terminationOptions?.choices??[];
  const selectedDate=choices.find(choice=>choice.endExclusive===end)?.lastOccupiedDay;
  const allowedDates=new Set(choices.map(choice=>choice.lastOccupiedDay));
  const proposalValid=!earlyExit||Boolean(selectedDate);
  const dialog=useRef<HTMLDialogElement>(null);
  function closeModal(){if(mutex.current)return;setExpanded(false);setCreating(false);setSelectedAction(null);setAck(false);setReason("");setFiles([]);}
  function chooseAction(action:string){
    setSelectedAction(action);setAck(false);setFiles([]);
    setReason(action==="ACCEPT"?"Tôi đồng ý lập phụ lục điều chỉnh thời hạn để hai bên ký số":action==="CONFIRM_RETURN"?"Tôi xác nhận nhà, chìa khóa và tài sản đã được bàn giao thực tế":"");
  }

  // One GET at a time; callers arriving meanwhile share it and get one fresh follow-up (even after a failed GET),
  // so notices, manual reloads and own actions cannot storm the API or let an older read overwrite a newer one.
  const refresh=useCallback(():Promise<void>=>{
    if(!mounted.current)return Promise.resolve();
    if(inflight.current){dirty.current=true;return inflight.current;}
    let done=false;
    const run=(async()=>{
      try{for(;;){
        dirty.current=false;
        try{
          const next=await service.get(rentalRequestId,kind);
          if(!mounted.current)return;
          const key=keyOf(next),changed=keyRef.current!==null&&keyRef.current!==key;
          keyRef.current=key;setData(next);setError("");setReviewedKey(prev=>prev??key);
          // Drafts survive a refresh; the acknowledgement only belongs to the revision that was reviewed.
          if(changed){setAck(false);setContacted(false);setSelectedAction(null);}
        }catch(e){if(!mounted.current)return;setError(getApiErrorMessage(e,"Chưa tải được hồ sơ."));}
        if(!dirty.current)return;
        if(document.visibilityState!=="visible"){hiddenDirty.current=true;return;}
      }}finally{done=true;inflight.current=null;}
    })();
    if(!done)inflight.current=run;
    return run;
  },[rentalRequestId,kind]);
  // Only the revision/status the own action actually returned counts as reviewed; a newer counterparty transition fetched meanwhile still needs review.
  const acceptResult=(result?:RentalWorkflow)=>{if(mounted.current&&typeof result?.revision==="number"&&typeof result.status==="string")setReviewedKey(keyOf(result));};
  useEffect(()=>{const active=mounted;active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{if(kind==="early-exit"||expanded)void refresh();},[expanded,kind,refresh]);
  useEffect(()=>{
    const element=dialog.current;if(!earlyExit||!expanded||!element)return;
    if(!element.open)element.showModal();
    const overflow=document.body.style.overflow;document.body.style.overflow="hidden";
    return()=>{element.close();document.body.style.overflow=overflow;};
  },[earlyExit,expanded]);
  // Matching workflow notices and reconnect/focus/push recovery: 250 ms coalesce; a hidden tab only marks dirty.
  const earlyExitContractId=data?.contractId??contractId;
  useEffect(()=>{
    if(kind!=="early-exit"||!expanded)return;
    let timer:ReturnType<typeof setTimeout>|undefined;
    const schedule=()=>{
      if(document.visibilityState!=="visible"){hiddenDirty.current=true;return;}
      clearTimeout(timer);
      timer=setTimeout(()=>{if(document.visibilityState!=="visible"){hiddenDirty.current=true;return;}void refresh();},250);
    };
    const unsubscribe=notificationService.subscribe(event=>{
      if(kind==="early-exit"&&event.type==="agreement-changed"&&(!event.agreementId||event.agreementId===earlyExitContractId))schedule();
      if(kind==="early-exit"&&event.type==="payment-changed")schedule();
    });
    const onVisible=()=>{if(document.visibilityState==="visible"&&hiddenDirty.current){hiddenDirty.current=false;schedule();}};
    document.addEventListener("visibilitychange",onVisible);
    return()=>{clearTimeout(timer);unsubscribe();document.removeEventListener("visibilitychange",onVisible);};
  },[kind,expanded,earlyExitContractId,refresh]);
  useEffect(()=>{
    if(!focusRequest||focused.current)return;
    focused.current=true;setExpanded(true);
    const target=document.getElementById(`workflow-${kind}`);
    target?.scrollIntoView({behavior:"smooth",block:"start"});target?.focus({preventScroll:true});
  },[focusRequest,kind]);
  const valid=reason.trim().length>=10&&reason.trim().length<=1000;
  function start(){if(!data)return;setSelectedAction(null);setReason("");setAck(false);setContacted(false);setFiles([]);setEnd(choices.some(choice=>choice.endExclusive===data.proposal.endExclusive)?data.proposal.endExclusive!:"");setCreating(true);}
  async function perform(action:string){
    if(mutex.current||!data||!data.allowedActions.includes(action)||!valid||needsReview||(action==="PROPOSE"&&!proposalValid))return;
    if((["REQUEST_RESUME","RESUME","ACCEPT","CONFIRM_RETURN","FULL_REFUND_EXIT"].includes(action)||action==="PROPOSE"&&!earlyExit)&&!ack)return;
    if(action==="FULL_REFUND_EXIT"&&!contacted)return;
    if(action!=="PROPOSE"&&files.length){toast.error("Bằng chứng cần được gắn vào đề xuất mới trước khi thao tác.");return;}
    const reviewed=data;let result:RentalWorkflow|undefined;let saved=false;mutex.current=true;setBusy(true);
    try{
      if(action==="PROPOSE"){
        const evidenceIds:string[]=[];
        for(const file of files){let id=uploaded.current.get(file);if(!id){id=await storage.uploadComplaintEvidence(file,rentalRequestId);uploaded.current.set(file,id);}if(!mounted.current)return;evidenceIds.push(id);}
        let payload:object={expectedRevision:reviewed.revision,reason:reason.trim(),evidenceIds};
        if(kind==="early-exit")payload={...payload,endExclusive:end};
        result=await service.propose(rentalRequestId,kind,payload);
      }else result=await service.act(rentalRequestId,kind,action,{expectedRevision:reviewed.revision,reason:reason.trim(),acknowledged:ack,tenantContacted:contacted});
      saved=true;if(!mounted.current)return;setReason("");setFiles([]);setCreating(false);setSelectedAction(null);setAck(false);await refresh();acceptResult(result);toast.success("Đã ghi nhận thao tác và lịch sử.");if(mounted.current)await onUpdated?.();
    }catch(e){if(mounted.current){toast.error(saved?"Thao tác đã được ghi nhận, nhưng chưa làm mới được toàn bộ hồ sơ. Vui lòng tải lại; không cần gửi lại thao tác.":getApiErrorMessage(e,"Chưa thể thực hiện. Kiểm tra dữ liệu mới trước khi gửi lại."));if(!saved)await refresh();}}
    finally{mutex.current=false;if(mounted.current)setBusy(false);}
  }
  const content=<>
      {kind==="cancellation"&&<PolicyNotice tone="neutral" title="Đề nghị hủy và hoàn tiền" summary="Dùng khi đã nhận tiền nhưng chưa hoàn tất HĐ thuê."><p>Dùng khi đã nhận tiền nhưng chưa hoàn tất HĐ thuê. Đề nghị này hoàn toàn bộ khoản thực nhận; không tự mất cọc. Nếu không phản hồi, chủ nhà chỉ kết thúc sau hạn, đã liên hệ khách và phòng chưa bàn giao. Chữ ký/chứng từ chưa rõ phải đối soát trước.</p></PolicyNotice>}
      {error&&<p role="alert" className="text-rose-700">{error}</p>}
      {!data&&!error&&<p>Đang tải…</p>}
      {data&&<>
        {needsReview&&<div role="status" className="space-y-2 rounded-lg border border-sky-300 bg-sky-50 p-3 text-xs text-sky-950"><PolicyNotice tone="info" title="Hồ sơ đã được cập nhật" summary="Nội dung hồ sơ đã được cập nhật."><p>Nội dung hồ sơ đã được cập nhật. Phần bạn đang nhập vẫn được giữ lại; hãy đọc nội dung mới và xác nhận đã xem trước khi thao tác.</p></PolicyNotice><button type="button" className={button} onClick={()=>setReviewedKey(keyOf(data))}>Tôi đã xem nội dung mới</button></div>}
        <p className="font-medium">{workflowStatuses[data.status]??data.status}</p><p className="text-xs">{workflowObligations[data.depositObligation]??"Nghĩa vụ đang được theo dõi"}</p>
        {data.blockedReason&&<p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{data.blockedReason}</p>}
        {earlyExit&&data.terminationOptions&&<p className="text-xs">Mốc kết thúc hiện đang áp dụng: <strong>{calendarDate(data.terminationOptions.currentEndExclusive)}</strong> lúc 00:00 (không gồm ngày này).</p>}
        {earlyExit&&data.status==="APPROVED"&&<PolicyNotice tone="info" title="Phụ lục chấm dứt sớm" summary="Chủ nhà đã đồng ý và hệ thống đã tạo phụ lục Word/PDF."><p>Chủ nhà đã đồng ý và hệ thống đã tạo phụ lục Word/PDF. Hãy đọc văn bản bên dưới; chủ nhà ký trước, người thuê ký sau. Chưa đủ hai chữ ký hợp lệ thì ngày kết thúc hiện tại vẫn giữ nguyên.</p></PolicyNotice>}
        {data.respondBy&&<PolicyNotice tone="neutral" title="Hạn phản hồi" summary="Quá hạn không tự xác nhận đồng ý hoặc nhận tiền."><p>Hạn phản hồi: {date(data.respondBy)}. Quá hạn không tự xác nhận đồng ý hoặc nhận tiền.</p></PolicyNotice>}
        {/* While composing, the newest persisted record is shown read-only only when it changed and needs review; the draft below stays separate. */}
        {(!creating||needsReview)&&(!earlyExit||data.revision>0)&&<div className={creating?"space-y-2 rounded-lg border border-dashed p-3":"space-y-3"} aria-label={creating?"Nội dung mới nhất đã lưu (chỉ đọc)":undefined}>
          {creating&&<p className="text-xs font-semibold">Nội dung mới nhất đã lưu (chỉ đọc) — bản nháp bạn đang nhập nằm riêng bên dưới.</p>}
          <WorkflowSummary proposal={data.proposal} lastOccupiedDay={data.terminationOptions?.proposedLastOccupiedDay}/><Evidence ids={data.proposal.evidenceIds}/><p className="text-xs">Chủ nhà xác nhận: {date(data.ownerConfirmedAt)} · Người thuê xác nhận: {date(data.tenantConfirmedAt)}</p>
          {data.rentCalculation&&(data.rentCalculation.policy==="DAILY_PRORATED"||data.rentCalculation.requiredRefund>0)&&<RentCalculation value={data.rentCalculation}/>}
        </div>}
        <div className="flex flex-wrap gap-2">{data.allowedActions.includes("PROPOSE")&&!creating&&<button className={button} type="button" disabled={busy} onClick={start}>{earlyExit?(data.revision>0?"Soạn đề nghị điều chỉnh":"Lập đề nghị chấm dứt sớm"):workflowActions.PROPOSE}</button>}<button className={button} disabled={busy} type="button" onClick={()=>void refresh()}>Tải lại nội dung</button>{creating&&<button className={button} disabled={busy} type="button" onClick={()=>{setCreating(false);setFiles([]);setAck(false);}}>Quay lại hồ sơ</button>}</div>
        {creating&&<div className="space-y-3 rounded-lg border p-3">
          {earlyExit&&<fieldset className="min-w-0 space-y-3" disabled={busy}>
            <legend className="font-semibold">Chọn ngày ở cuối cùng</legend>
            <PolicyNotice tone="neutral" title="Chọn ngày ở cuối cùng" summary="Chỉ chọn ngày cuối kỳ thuê được hệ thống cho phép, trước khi hết hạn hợp đồng."><p>Chỉ chọn ngày cuối kỳ thuê được hệ thống cho phép, trước khi hết hạn hợp đồng. Chủ nhà từ chối thì ngày kết thúc hiện tại được giữ nguyên.</p></PolicyNotice>
            {choices.length?<><Calendar mode="single" required selected={selectedDate?parseDate(selectedDate):undefined}
              defaultMonth={parseDate(selectedDate??choices[0].lastOccupiedDay)}
              startMonth={parseDate(choices[0].lastOccupiedDay)} endMonth={parseDate(choices[choices.length-1].lastOccupiedDay)} showOutsideDays={false}
              disabled={day=>busy||!allowedDates.has(dateKey(day))}
              modifiers={{eligible:day=>allowedDates.has(dateKey(day))}}
              modifiersClassNames={{eligible:"bg-primary/10 text-primary font-semibold rounded-xl"}}
              labels={{labelDayButton:day=>`Ngày ${calendarDate(dateKey(day))}`,labelNext:()=>"Tháng sau",labelPrevious:()=>"Tháng trước"}}
              onSelect={day=>{const choice=day&&choices.find(value=>value.lastOccupiedDay===dateKey(day));if(choice){setEnd(choice.endExclusive);setAck(false);}}}
            /><p className="text-sm">{selectedDate?`Ngày ở cuối cùng: ${calendarDate(selectedDate)}`:"Chọn ngày được tô nổi bật trên lịch."}</p></>:<p role="status" className="rounded-lg bg-muted/40 p-3 text-xs">Không còn ngày cuối kỳ hợp lệ để chấm dứt sớm. Hãy tải lại hồ sơ nếu thông tin vừa thay đổi.</p>}
          </fieldset>}
          {!earlyExit&&<label className="block">Ảnh / PDF bằng chứng (tối đa 5, 15 MB/tệp)<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy} className={input} onChange={e=>{const list=Array.from(e.target.files??[]);if(list.length>5||list.some(f=>f.size<=0||f.size>15*1024*1024||!/[.](jpe?g|png|webp|pdf)$/i.test(f.name))){toast.error("Tối đa 5 ảnh/PDF, 15 MB/tệp.");setFiles([]);e.target.value="";}else setFiles(list);setAck(false);}}/></label>}
        </div>}
        {earlyExit&&!creating&&<div className="flex flex-wrap gap-2" aria-label="Chọn phản hồi đề nghị">{data.allowedActions.filter(action=>action!=="PROPOSE").map(action=><button key={action} type="button" aria-pressed={selectedAction===action} disabled={busy||needsReview} className={`${button} ${selectedAction===action?"border-primary bg-primary/5 text-primary":""}`} onClick={()=>chooseAction(action)}>{actionLabel(action)}</button>)}</div>}
        {(creating||(earlyExit?selectedAction&&data.allowedActions.includes(selectedAction):data.allowedActions.some(a=>a!=="PROPOSE")))&&<div className="space-y-3 rounded-lg border p-3" aria-label="Xác nhận thao tác thỏa thuận">
          {earlyExit&&<><h3 className="font-semibold">{creating?"Gửi đề nghị chấm dứt sớm":actionLabel(selectedAction!)}</h3>{selectedAction==="ACCEPT"&&!creating&&<PolicyNotice tone="neutral" title="Đồng ý đề nghị chấm dứt sớm" summary="Đồng ý sẽ tự tạo phụ lục Word/PDF để hai bên ký số."><p>Đồng ý sẽ tự tạo phụ lục Word/PDF để hai bên ký số. Đây chưa phải chữ ký số SmartCA và chưa xác nhận bàn giao hay nhận tiền.</p></PolicyNotice>}{selectedAction==="CANCEL"&&<PolicyNotice tone="neutral" title="Hủy đề nghị đang chờ ký" summary="Hủy đề nghị đang chờ ký."><p>Hủy đề nghị đang chờ ký. Chữ ký đã hoàn tất của một bên vẫn được lưu để đối chiếu, nhưng không còn hiệu lực áp dụng hạn thuê mới.</p></PolicyNotice>}</>}
          <label className="block">{creating?"Lý do lập / chỉnh đề xuất":"Nội dung phản hồi"}<textarea aria-label="Nội dung thao tác" minLength={10} maxLength={1000} disabled={busy} className={input} value={reason} onChange={e=>{setReason(e.target.value);setAck(false);}}/></label>
          {(!earlyExit||!creating&&["ACCEPT","CONFIRM_RETURN"].includes(selectedAction??""))&&<label className="flex gap-2"><input type="checkbox" checked={ack} disabled={busy||needsReview} onChange={e=>setAck(e.target.checked)}/><span>{(data.status==="RESUME_PROPOSED"||data.allowedActions.includes("REQUEST_RESUME"))?"Tôi đồng ý tiếp tục thuê và ký theo hồ sơ hiện tại; không tự thay đổi điều khoản, chữ ký hoặc xác nhận tiền.":kind==="cancellation"?"Tôi đã đối chiếu đề nghị hoàn toàn bộ tiền; phòng chưa bàn giao hoặc đã được nhận lại đầy đủ, không còn người thuê/tài sản của khách trong phòng.":creating?"Tôi đã kiểm tra ngày kết thúc, cách bàn giao, tiền thuê kỳ cuối và khoản hoàn; đồng ý gửi đề nghị này cho bên còn lại.":selectedAction==="ACCEPT"?"Tôi đã đọc và đồng ý toàn bộ điều kiện của đúng phiên bản đề nghị này. Đồng ý chỉ chuyển sang lập phụ lục; hạn thuê cũ vẫn áp dụng cho đến khi đủ hai chữ ký số hợp lệ.":"Tôi xác nhận nhà, chìa khóa và tài sản đã được trả/nhận lại thực tế."} Việc này không thay bước xác nhận nhận tiền.</span></label>}
          {data.allowedActions.includes("FULL_REFUND_EXIT")&&!creating&&<label className="flex gap-2"><input type="checkbox" checked={contacted} disabled={busy} onChange={e=>setContacted(e.target.checked)}/><span>Tôi đã liên hệ người thuê về đề nghị này; phòng chưa bàn giao và tôi đồng ý hoàn toàn bộ khoản thực nhận.</span></label>}
          <div className="flex flex-wrap gap-2">{(creating?["PROPOSE"]:earlyExit&&selectedAction?[selectedAction]:data.allowedActions.filter(a=>a!=="PROPOSE")).map(action=><button key={action} type="button" className={button} disabled={busy||needsReview||!valid||(creating&&!proposalValid)||(["REQUEST_RESUME","RESUME","ACCEPT","CONFIRM_RETURN","FULL_REFUND_EXIT"].includes(action)||action==="PROPOSE"&&!earlyExit)&&!ack||action==="FULL_REFUND_EXIT"&&!contacted} onClick={()=>void perform(action)}>{creating?earlyExit?"Gửi đề nghị cho chủ nhà":"Gửi đề xuất để hai bên kiểm tra":earlyExit?"Xác nhận thao tác":workflowActions[action]??action}</button>)}</div>
          {earlyExit&&!creating&&<button type="button" className={button} disabled={busy} onClick={()=>{setSelectedAction(null);setAck(false);setReason("");}}>Hủy thao tác</button>}
        </div>}
        {earlyExit&&data.contractId&&["AGREED","RETURNED"].includes(data.status)&&<a href={invoiceDetailPath(data.contractId)} className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Mở hồ sơ thanh toán & quyết toán →</a>}
        {data.complaintId&&<p className="text-xs">Đã liên kết khiếu nại. Tiếp tục phản hồi và chuyển HomeSpace tại mục Khiếu nại & hỗ trợ.</p>}
        {kind!=="cancellation"&&data.revision>0&&!creating&&<WorkflowDocumentsPanel rentalRequestId={rentalRequestId} kind={kind} data={data} agreementId={agreementId} onUpdated={async()=>{await refresh();await onUpdated?.();}}/>}
        {!!data.refundPayments.length&&<div className="space-y-2">{data.refundPayments.map((p,i)=><div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2" key={p.id}><span>Khoản hoàn {i+1}: {money(p.totalAmount)} · {p.status==="CONFIRMED"?"Đã xác nhận thực nhận":"Chưa hoàn tất xác nhận"}</span><button className={button} type="button" onClick={()=>setPaymentId(p.id)}>Mở thanh toán / đối soát</button></div>)}</div>}
        {!!data.history.length&&<details><summary className="cursor-pointer text-xs font-semibold">Lịch sử và các bản đã đối chiếu ({data.history.length})</summary>{[...data.history].reverse().map(e=><article className="mt-3 space-y-2 border-t pt-3" key={e.revision}><p className="text-xs">{workflowActions[e.action]??e.action} · {e.role==="LANDLORD"?"Chủ nhà":"Người thuê"} · {date(e.at)}</p><p>{e.reason}</p><WorkflowSummary proposal={e.proposal}/><Evidence ids={e.evidenceIds}/></article>)}</details>}
      </>}
    </>;
  const paymentModal=paymentId&&<RentalPaymentModal request={{id:rentalRequestId}} paymentId={paymentId} isOpen onClose={()=>{setPaymentId(undefined);void refresh();}} onPaymentSuccess={()=>{setPaymentId(undefined);void refresh();}}/>;
  return <section id={`workflow-${kind}`} tabIndex={-1} className={`scroll-mt-24 space-y-3 rounded-xl border bg-card p-4 text-sm${focusRequest?" ring-2 ring-primary":""}`} aria-label={workflowTitles[kind]}>
    {earlyExit?<>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{workflowTitles[kind]}</h2><p className="mt-1 text-xs text-muted-foreground">{data?workflowStatuses[data.status]??data.status:error?"Chưa tải được hồ sơ":"Đang tải hồ sơ…"}</p></div><button type="button" className={button} onClick={()=>setExpanded(true)}>Xem / đề nghị chấm dứt sớm</button></div>
      <dialog ref={dialog} aria-labelledby={`workflow-title-${rentalRequestId}`} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border bg-card p-0 text-sm text-foreground shadow-2xl backdrop:bg-black/50" onCancel={event=>{event.preventDefault();if(paymentId)setPaymentId(undefined);else closeModal();}}>
        {expanded&&<><header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card p-4"><h2 id={`workflow-title-${rentalRequestId}`} className="font-semibold">{workflowTitles[kind]}</h2><button type="button" className={button} disabled={busy} aria-label="Đóng cửa sổ chấm dứt sớm" onClick={closeModal}>Đóng</button></header><div className="space-y-4 p-4 sm:p-5">{content}</div>{paymentModal}</>}
      </dialog>
    </>:<><button className="font-semibold" type="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{workflowTitles[kind]}</button>{expanded&&content}{paymentModal}</>}

  </section>;
}
function RentCalculation({value:q}:{value:FinalRentCalculation}){return <div className="rounded-lg border p-3 text-xs"><p>{q.usedDays}/{q.periodDays} ngày · Đơn giá tháng {money(q.monthlyRent)} · Tiền thuê kỳ cuối {money(q.agreedFinalRent)}</p><p>Khoản hoàn thuê tối thiểu từ nguồn trả trước: {money(q.requiredRefund)}</p><p>{q.explanation}</p></div>;}
