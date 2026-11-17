"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useAuth} from "@/features/auth/useAuth";
import {toast} from "sonner";
import {rentalWorkflowService as service} from "@/services/rental-workflow.service";
import storage from "@/services/storage.service";
import payments from "@/services/payment-request.service";
import {invoiceDetailPath} from "@/lib/contract-routes";
import {getApiErrorMessage} from "@/utils/apiError";
import notificationService from "@/services/notification.service";
import type {PaymentRequest} from "@/types/payment-request.type";
import {workflowTitles,workflowStatuses,workflowActions,workflowObligations,type RentalWorkflow,type WorkflowKind,type WorkflowProposal,type RentRefund} from "@/types/rental-workflow.type";
import RentalPaymentModal from "./RentalPaymentModal";
import WorkflowDocumentsPanel from "./WorkflowDocumentsPanel";
import type {FinalRentCalculation} from "@/types/rental-workflow.type";

const button="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";
const input="mt-1 block w-full rounded-lg border bg-background p-2 text-sm";
const date=(s?:string)=>s?new Date(s).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"}):"—";
const money=(n?:number|null)=>n==null?"Chưa ghi nhận":n.toLocaleString("vi-VN")+" đ";
// contractId (root lease) scopes notices to this panel; focusRequest opens, highlights and scrolls to it once.
type Props={rentalRequestId:string;kind:WorkflowKind;contractId?:string;focusRequest?:boolean;agreementId?:string;onUpdated?:()=>Promise<unknown>|void};
const keyOf=(w:RentalWorkflow)=>`${w.revision}:${w.status}`;
export default function RentalWorkflowPanel(props:Props){
  const {profile}=useAuth();
  if(!profile?.id||!props.rentalRequestId)return null;
  return <ScopedWorkflowPanel key={`${props.rentalRequestId}:${props.kind}:${profile.id}`} {...props}/>;
}
export function WorkflowSummary({proposal:p}:{proposal:WorkflowProposal}){
  return <div className="space-y-2 text-sm">
    {p.reason&&<p className="whitespace-pre-wrap">{p.reason}</p>}
    {p.endExclusive&&<><p>Ngày kết thúc (không tính ngày này): <strong>{p.endExclusive}</strong></p><p>Bàn giao: {p.handoverTerms}</p><p>{p.finalRentPolicy==="DAILY_PRORATED"?"Tiền thuê kỳ cuối tính theo ngày thực tế của kỳ; các phí khác theo HĐ/hóa đơn.":"Tiền thuê và phí cố định tính trọn kỳ đã bắt đầu."} Cọc quyết toán riêng sau hóa đơn cuối.</p>{p.rentRefunds?.length?<table className="w-full text-left text-xs"><thead><tr><th>Khoản hoàn đã thống nhất</th><th>Số tiền</th></tr></thead><tbody>{p.rentRefunds.map((r,i)=><tr key={r.paymentId}><td>Khoản {i+1}</td><td>{money(r.amount)}</td></tr>)}</tbody></table>:<p>Không có khoản hoàn tiền thuê bổ sung trong đề nghị này.</p>}</>}
  </div>;
}
function Evidence({ids}:{ids?:string[]}){
  return <div className="flex flex-wrap gap-3">{ids?.map((id,i)=><button className="text-xs text-primary underline" type="button" key={id} onClick={async()=>{const tab=window.open("about:blank","_blank");if(tab)tab.opener=null;try{const url=await storage.getViewUrl(id);if(tab)tab.location.href=url;}catch(e){tab?.close();toast.error(getApiErrorMessage(e,"Không mở được bằng chứng."));}}}>Xem bằng chứng {i+1} ↗</button>)}</div>;
}
function ScopedWorkflowPanel({rentalRequestId,kind,contractId,focusRequest,agreementId,onUpdated}:Props){
  const [expanded,setExpanded]=useState(kind==="early-exit"||!!focusRequest),[data,setData]=useState<RentalWorkflow|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [creating,setCreating]=useState(false),[reason,setReason]=useState(""),[ack,setAck]=useState(false),[contacted,setContacted]=useState(false),[files,setFiles]=useState<File[]>([]);
  const [end,setEnd]=useState(""),[terms,setTerms]=useState(""),[refunds,setRefunds]=useState<RentRefund[]>([]),[sources,setSources]=useState<PaymentRequest[]>([]),[paymentId,setPaymentId]=useState<string>();
  const [policy,setPolicy]=useState("FULL_STARTED_PERIOD"),[calculation,setCalculation]=useState<FinalRentCalculation|null>(null);
  const [reviewedKey,setReviewedKey]=useState<string|null>(null);
  const mounted=useRef(true),mutex=useRef(false),uploaded=useRef(new Map<File,string>()),quoteSequence=useRef(0);
  const inflight=useRef<Promise<void>|null>(null),dirty=useRef(false),hiddenDirty=useRef(false),keyRef=useRef<string|null>(null),focused=useRef(false);
  const needsReview=!busy&&!!data&&reviewedKey!==null&&reviewedKey!==keyOf(data);
  const [selectedAction,setSelectedAction]=useState<string|null>(null);
  const earlyExit=kind==="early-exit";
  const proposalValid=!earlyExit||Boolean(end&&terms.trim().length>=10&&terms.trim().length<=1000
    &&refunds.every(row=>row.paymentId&&Number.isFinite(row.amount)&&row.amount>0)
    &&new Set(refunds.map(row=>row.paymentId)).size===refunds.length);
  const step=!data||["EMPTY","REJECTED","WITHDRAWN"].includes(data.status)?0:data.status==="PROPOSED"?1:data.status==="AGREED"?2:3;
  const nextStep=!data?"Đang tải hồ sơ thỏa thuận…":data.status==="PROPOSED"
    ?data.allowedActions.includes("WITHDRAW")?"Bạn đã gửi đề nghị. Chờ bên còn lại phản hồi hoặc ký văn bản; bạn vẫn có thể rút hoặc gửi bản điều chỉnh.":"Đọc điều kiện và số tiền bên dưới, sau đó chọn cách phản hồi. Im lặng không được coi là đồng ý."
    :data.status==="AGREED"?"Hai bên đã thống nhất. Hoàn tất hóa đơn kỳ cuối và xác nhận bàn giao khi thực tế trả/nhận lại nhà."
    :data.status==="RETURNED"?"Hai bên đã xác nhận bàn giao. Tiếp tục quyết toán hóa đơn, công nợ và tiền cọc trong hồ sơ thanh toán."
    :"Lập đề nghị gồm ngày kết thúc, cách bàn giao và cách tính tiền thuê kỳ cuối. Hợp đồng vẫn tiếp tục cho đến khi đủ điều kiện kết thúc.";
  function chooseAction(action:string){
    setSelectedAction(action);setAck(false);setFiles([]);
    setReason(action==="ACCEPT"?"Tôi đồng ý toàn bộ điều kiện chấm dứt sớm đang xem":action==="CONFIRM_RETURN"?"Tôi xác nhận nhà, chìa khóa và tài sản đã được bàn giao thực tế":"");
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
  useEffect(()=>{if(expanded)void refresh();},[expanded,refresh]);
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
    focused.current=true;
    const target=document.getElementById(`workflow-${kind}`);
    target?.scrollIntoView({behavior:"smooth",block:"start"});target?.focus({preventScroll:true});
  },[focusRequest,kind]);
  useEffect(()=>{if(!creating||kind!=="early-exit"||!data?.contractId)return;let active=true;void payments.getContractPayments(data.contractId).then(list=>{if(active)setSources(list.filter(p=>p.status==="CONFIRMED"&&["INITIAL","MONTHLY_RENT"].includes(p.type)));}).catch(()=>{if(active)setSources([]);});return()=>{active=false;};},[creating,kind,data?.contractId]);
  const valid=reason.trim().length>=10&&reason.trim().length<=1000;
  function start(){if(!data)return;setSelectedAction(null);quoteSequence.current++;const p=data.proposal;setReason("");setAck(false);setContacted(false);setFiles([]);setEnd(p.endExclusive??"");setTerms(p.handoverTerms??"");setRefunds(p.rentRefunds??[]);setPolicy(p.finalRentPolicy??"FULL_STARTED_PERIOD");setCalculation(data.rentCalculation??null);setCreating(true);}
  async function perform(action:string){
    if(mutex.current||!data||!data.allowedActions.includes(action)||!valid||needsReview||(action==="PROPOSE"&&!proposalValid))return;
    if(["REQUEST_RESUME","RESUME","ACCEPT","CONFIRM_RETURN","FULL_REFUND_EXIT","PROPOSE"].includes(action)&&!ack)return;
    if(action==="FULL_REFUND_EXIT"&&!contacted)return;
    if(action!=="PROPOSE"&&files.length){toast.error("Bằng chứng cần được gắn vào đề xuất mới trước khi thao tác.");return;}
    const reviewed=data;let result:RentalWorkflow|undefined;let saved=false;mutex.current=true;setBusy(true);
    try{
      if(action==="PROPOSE"){
        const evidenceIds:string[]=[];
        for(const file of files){let id=uploaded.current.get(file);if(!id){id=await storage.uploadComplaintEvidence(file,rentalRequestId);uploaded.current.set(file,id);}if(!mounted.current)return;evidenceIds.push(id);}
        let payload:object={expectedRevision:reviewed.revision,reason:reason.trim(),evidenceIds};
        if(kind==="early-exit")payload={...payload,endExclusive:end,handoverTerms:terms.trim(),finalRentPolicy:policy,rentRefunds:refunds};
        result=await service.propose(rentalRequestId,kind,payload);
      }else result=await service.act(rentalRequestId,kind,action,{expectedRevision:reviewed.revision,reason:reason.trim(),acknowledged:ack,tenantContacted:contacted});
      saved=true;if(!mounted.current)return;setReason("");setFiles([]);setCreating(false);setSelectedAction(null);setAck(false);await refresh();acceptResult(result);toast.success("Đã ghi nhận thao tác và lịch sử.");if(mounted.current)await onUpdated?.();
    }catch(e){if(mounted.current){toast.error(saved?"Thao tác đã được ghi nhận, nhưng chưa làm mới được toàn bộ hồ sơ. Vui lòng tải lại; không cần gửi lại thao tác.":getApiErrorMessage(e,"Chưa thể thực hiện. Kiểm tra dữ liệu mới trước khi gửi lại."));if(!saved)await refresh();}}
    finally{mutex.current=false;if(mounted.current)setBusy(false);}
  }
  return <section id={`workflow-${kind}`} tabIndex={-1} className={`scroll-mt-24 space-y-3 rounded-xl border bg-card p-4 text-sm${focusRequest?" ring-2 ring-primary":""}`} aria-label={workflowTitles[kind]}>
    {earlyExit?<header className="space-y-2"><h2 className="text-base font-semibold">{workflowTitles[kind]}</h2><p className="text-sm text-muted-foreground">Thống nhất điều kiện trước, bàn giao sau, rồi quyết toán tiền. Tiền thuê và cọc được xử lý riêng.</p><ol aria-label="Tiến trình chấm dứt sớm" className="grid grid-cols-2 gap-2 pt-2 sm:grid-cols-4">{["Đề nghị","Thống nhất","Bàn giao","Quyết toán"].map((label,index)=><li key={label} aria-current={index===step?"step":undefined} className={`rounded-lg border px-3 py-2 text-xs font-medium ${index===step?"border-primary bg-primary/5 text-primary":"text-muted-foreground"}`}>{index+1}. {label}</li>)}</ol><p className="rounded-lg bg-muted/40 p-3 text-sm">{nextStep}</p></header>:<button className="font-semibold" type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{workflowTitles[kind]}</button>}
    {(earlyExit||expanded)&&<>
      {kind==="cancellation"&&<p className="text-xs text-muted-foreground">Dùng khi đã nhận tiền nhưng chưa hoàn tất HĐ thuê. Đề nghị này hoàn toàn bộ khoản thực nhận; không tự mất cọc. Nếu không phản hồi, chủ nhà chỉ kết thúc sau hạn, đã liên hệ khách và phòng chưa bàn giao. Chữ ký/chứng từ chưa rõ phải đối soát trước.</p>}
      {error&&<p role="alert" className="text-rose-700">{error}</p>}
      {!data&&!error&&<p>Đang tải…</p>}
      {data&&<>
        {needsReview&&<div role="status" className="space-y-2 rounded-lg border border-sky-300 bg-sky-50 p-3 text-xs text-sky-950"><p>Nội dung hồ sơ đã được cập nhật. Phần bạn đang nhập vẫn được giữ lại; hãy đọc nội dung mới và xác nhận đã xem trước khi thao tác.</p><button type="button" className={button} onClick={()=>setReviewedKey(keyOf(data))}>Tôi đã xem nội dung mới</button></div>}
        <p className="font-medium">{workflowStatuses[data.status]??data.status}</p><p className="text-xs">{workflowObligations[data.depositObligation]??"Nghĩa vụ đang được theo dõi"}</p>
        {data.blockedReason&&<p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{data.blockedReason}</p>}
        {data.respondBy&&<p>Hạn phản hồi: {date(data.respondBy)}. Quá hạn không tự xác nhận đồng ý hoặc nhận tiền.</p>}
        {/* While composing, the newest persisted record is shown read-only only when it changed and needs review; the draft below stays separate. */}
        {(!creating||needsReview)&&(!earlyExit||data.revision>0)&&<div className={creating?"space-y-2 rounded-lg border border-dashed p-3":"space-y-3"} aria-label={creating?"Nội dung mới nhất đã lưu (chỉ đọc)":undefined}>
          {creating&&<p className="text-xs font-semibold">Nội dung mới nhất đã lưu (chỉ đọc) — bản nháp bạn đang nhập nằm riêng bên dưới.</p>}
          <WorkflowSummary proposal={data.proposal}/><Evidence ids={data.proposal.evidenceIds}/><p className="text-xs">Chủ nhà xác nhận: {date(data.ownerConfirmedAt)} · Người thuê xác nhận: {date(data.tenantConfirmedAt)}</p>
          {data.rentCalculation&&<RentCalculation value={data.rentCalculation}/>}
        </div>}
        <div className="flex flex-wrap gap-2">{data.allowedActions.includes("PROPOSE")&&!creating&&<button className={button} type="button" disabled={busy} onClick={start}>{earlyExit?(data.revision>0?"Soạn đề nghị điều chỉnh":"Lập đề nghị chấm dứt sớm"):workflowActions.PROPOSE}</button>}<button className={button} disabled={busy} type="button" onClick={()=>void refresh()}>Tải lại nội dung</button>{creating&&<button className={button} disabled={busy} type="button" onClick={()=>{setCreating(false);setFiles([]);setAck(false);}}>Quay lại hồ sơ</button>}</div>
        {creating&&<div className="space-y-3 rounded-lg border p-3">
          {earlyExit&&<h3 className="font-semibold">Bước 1 · Điều kiện đề nghị</h3>}
          {kind==="early-exit"&&<>
            <label className="block">Ngày kết thúc nghĩa vụ thuê<input type="date" className={input} disabled={busy} value={end} onChange={e=>{quoteSequence.current++;setEnd(e.target.value);setCalculation(null);setAck(false);}}/></label><p className="text-xs text-muted-foreground">Ngày đã chọn bắt đầu từ 00:00 và không tính tiền thuê ngày đó. Hai bên cần chốt thời điểm bàn giao trước mốc này.</p>
            <label className="block">Cách trả nhà, chìa khóa và tài sản<textarea minLength={10} maxLength={1000} className={input} disabled={busy} value={terms} onChange={e=>{setTerms(e.target.value);setAck(false);}}/></label>
            <fieldset className="space-y-2"><legend className="font-medium">Cách tính tiền thuê kỳ cuối</legend><div className="grid gap-2 sm:grid-cols-2">{[{value:"FULL_STARTED_PERIOD",label:"Trọn kỳ đã bắt đầu",description:"Giữ tiền thuê trọn kỳ theo điều kiện đã chốt."},{value:"DAILY_PRORATED",label:"Theo số ngày thực tế",description:"Hệ thống đối chiếu khoản tiền thuê cần hoàn từ tiền đã nhận."}].map(option=><label key={option.value} className={`flex cursor-pointer gap-2 rounded-lg border p-3 ${policy===option.value?"border-primary bg-primary/5":""}`}><input type="radio" name={`final-rent-${rentalRequestId}`} value={option.value} checked={policy===option.value} disabled={busy} onChange={()=>{quoteSequence.current++;setPolicy(option.value);setCalculation(null);setAck(false);}}/><span><strong className="block text-sm">{option.label}</strong><span className="text-xs text-muted-foreground">{option.description}</span></span></label>)}</div></fieldset>
            <p className="text-xs">Cách tính theo ngày chỉ hoàn từ tiền thuê thực nhận; cần đối soát hóa đơn gốc trước nếu chưa nhận tiền. Phí khác theo HĐ/hóa đơn. Cọc quyết toán riêng.</p>
            <button type="button" className={button} disabled={busy||!end} onClick={async()=>{const request=++quoteSequence.current;try{const quote=await service.calculate(rentalRequestId,end,policy);if(mounted.current&&request===quoteSequence.current)setCalculation(quote);}catch(e){toast.error(getApiErrorMessage(e,"Chưa tính được kỳ cuối."));}}}>Đối chiếu phép tính kỳ cuối</button>
            {calculation&&<><RentCalculation value={calculation}/>{calculation.requiredRefund>0&&calculation.sourcePaymentId&&<button type="button" className={button} disabled={busy} onClick={()=>{setRefunds(list=>[...list.filter(r=>r.paymentId!==calculation.sourcePaymentId),{paymentId:calculation.sourcePaymentId!,amount:calculation.requiredRefund}]);setAck(false);}}>Ghi khoản hoàn đề xuất vào thỏa thuận</button>}</>}
            {refunds.map((r,i)=><div className="flex flex-wrap gap-2" key={i}><select aria-label={`Nguồn tiền thuê hoàn ${i+1}`} className={input} disabled={busy} value={r.paymentId} onChange={e=>{setRefunds(list=>list.map((v,n)=>n===i?{...v,paymentId:e.target.value}:v));setAck(false);}}><option value="">Chọn khoản tiền thuê thực nhận</option>{sources.map((p,n)=><option key={p.id} value={p.id}>{p.type==="INITIAL"?"Khoản ban đầu":"Hóa đơn thuê"} {n+1} · {money(p.totalAmount)}</option>)}</select><input aria-label={`Số tiền hoàn ${i+1}`} type="number" min="0.01" step="0.01" className={input} disabled={busy} value={r.amount} onChange={e=>{setRefunds(list=>list.map((v,n)=>n===i?{...v,amount:Number(e.target.value)}:v));setAck(false);}}/><button className={button} type="button" disabled={busy} onClick={()=>{setRefunds(list=>list.filter((_,n)=>n!==i));setAck(false);}}>Bỏ khoản hoàn</button></div>)}
            <button className={button} type="button" disabled={busy||refunds.length>=50} onClick={()=>{setRefunds(list=>[...list,{paymentId:"",amount:0}]);setAck(false);}}>Thêm khoản hoàn tiền thuê</button>
          </>}
          <label className="block">Ảnh / PDF bằng chứng (tối đa 5, 15 MB/tệp)<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy} className={input} onChange={e=>{const list=Array.from(e.target.files??[]);if(list.length>5||list.some(f=>f.size<=0||f.size>15*1024*1024||!/[.](jpe?g|png|webp|pdf)$/i.test(f.name))){toast.error("Tối đa 5 ảnh/PDF, 15 MB/tệp.");setFiles([]);e.target.value="";}else setFiles(list);setAck(false);}}/></label>
        </div>}
        {earlyExit&&!creating&&<div className="flex flex-wrap gap-2" aria-label="Chọn phản hồi đề nghị">{data.allowedActions.filter(action=>action!=="PROPOSE").map(action=><button key={action} type="button" aria-pressed={selectedAction===action} disabled={busy||needsReview} className={`${button} ${selectedAction===action?"border-primary bg-primary/5 text-primary":""}`} onClick={()=>chooseAction(action)}>{workflowActions[action]??action}</button>)}</div>}
        {(creating||(earlyExit?selectedAction&&data.allowedActions.includes(selectedAction):data.allowedActions.some(a=>a!=="PROPOSE")))&&<div className="space-y-3 rounded-lg border p-3" aria-label="Xác nhận thao tác thỏa thuận">
          {earlyExit&&<><h3 className="font-semibold">{creating?"Bước 2 · Kiểm tra và gửi đề nghị":workflowActions[selectedAction!]}</h3>{selectedAction==="ACCEPT"&&!creating&&<p className="text-xs text-muted-foreground">Đồng ý sẽ ghi nhận thỏa thuận hai bên. Đây chưa phải chữ ký số SmartCA và chưa xác nhận bàn giao hay nhận tiền.</p>}</>}
          <label className="block">{creating?"Lý do lập / chỉnh đề xuất":"Nội dung phản hồi"}<textarea aria-label="Nội dung thao tác" minLength={10} maxLength={1000} disabled={busy} className={input} value={reason} onChange={e=>{setReason(e.target.value);setAck(false);}}/></label>
          {(!earlyExit||creating||["ACCEPT","CONFIRM_RETURN"].includes(selectedAction??""))&&<label className="flex gap-2"><input type="checkbox" checked={ack} disabled={busy||needsReview} onChange={e=>setAck(e.target.checked)}/><span>{(data.status==="RESUME_PROPOSED"||data.allowedActions.includes("REQUEST_RESUME"))?"Tôi đồng ý tiếp tục thuê và ký theo hồ sơ hiện tại; không tự thay đổi điều khoản, chữ ký hoặc xác nhận tiền.":kind==="cancellation"?"Tôi đã đối chiếu đề nghị hoàn toàn bộ tiền; phòng chưa bàn giao hoặc đã được nhận lại đầy đủ, không còn người thuê/tài sản của khách trong phòng.":creating?"Tôi đã kiểm tra ngày kết thúc, cách bàn giao, tiền thuê kỳ cuối và khoản hoàn; đồng ý gửi đề nghị này cho bên còn lại.":selectedAction==="ACCEPT"?"Tôi đã đọc và đồng ý toàn bộ điều kiện của đúng phiên bản đề nghị này. Đồng ý chưa phải xác nhận bàn giao nhà hoặc ký số SmartCA.":"Tôi xác nhận nhà, chìa khóa và tài sản đã được trả/nhận lại thực tế."} Việc này không thay bước xác nhận nhận tiền.</span></label>}
          {data.allowedActions.includes("FULL_REFUND_EXIT")&&!creating&&<label className="flex gap-2"><input type="checkbox" checked={contacted} disabled={busy} onChange={e=>setContacted(e.target.checked)}/><span>Tôi đã liên hệ người thuê về đề nghị này; phòng chưa bàn giao và tôi đồng ý hoàn toàn bộ khoản thực nhận.</span></label>}
          <div className="flex flex-wrap gap-2">{(creating?["PROPOSE"]:earlyExit&&selectedAction?[selectedAction]:data.allowedActions.filter(a=>a!=="PROPOSE")).map(action=><button key={action} type="button" className={button} disabled={busy||needsReview||!valid||(creating&&!proposalValid)||["REQUEST_RESUME","RESUME","PROPOSE","ACCEPT","CONFIRM_RETURN","FULL_REFUND_EXIT"].includes(action)&&!ack||action==="FULL_REFUND_EXIT"&&!contacted} onClick={()=>void perform(action)}>{creating?"Gửi đề xuất để hai bên kiểm tra":earlyExit?"Xác nhận thao tác":workflowActions[action]??action}</button>)}</div>
          {earlyExit&&!creating&&<button type="button" className={button} disabled={busy} onClick={()=>{setSelectedAction(null);setAck(false);setReason("");}}>Hủy thao tác</button>}
        </div>}
        {earlyExit&&data.contractId&&["AGREED","RETURNED"].includes(data.status)&&<a href={invoiceDetailPath(data.contractId)} className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Mở hồ sơ thanh toán & quyết toán →</a>}
        {data.complaintId&&<p className="text-xs">Đã liên kết khiếu nại. Tiếp tục phản hồi và chuyển HomeSpace tại mục Khiếu nại & hỗ trợ.</p>}
        {kind!=="cancellation"&&data.revision>0&&!creating&&<WorkflowDocumentsPanel rentalRequestId={rentalRequestId} kind={kind} data={data} agreementId={agreementId} onUpdated={async()=>{await refresh();await onUpdated?.();}}/>}
        {!!data.refundPayments.length&&<div className="space-y-2">{data.refundPayments.map((p,i)=><div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2" key={p.id}><span>Khoản hoàn {i+1}: {money(p.totalAmount)} · {p.status==="CONFIRMED"?"Đã xác nhận thực nhận":"Chưa hoàn tất xác nhận"}</span><button className={button} type="button" onClick={()=>setPaymentId(p.id)}>Mở thanh toán / đối soát</button></div>)}</div>}
        {!!data.history.length&&<details><summary className="cursor-pointer text-xs font-semibold">Lịch sử và các bản đã đối chiếu ({data.history.length})</summary>{[...data.history].reverse().map(e=><article className="mt-3 space-y-2 border-t pt-3" key={e.revision}><p className="text-xs">{workflowActions[e.action]??e.action} · {e.role==="LANDLORD"?"Chủ nhà":"Người thuê"} · {date(e.at)}</p><p>{e.reason}</p><WorkflowSummary proposal={e.proposal}/><Evidence ids={e.evidenceIds}/></article>)}</details>}
      </>}
    </>}
    {paymentId&&<RentalPaymentModal request={{id:rentalRequestId}} paymentId={paymentId} isOpen onClose={()=>{setPaymentId(undefined);void refresh();}} onPaymentSuccess={()=>{setPaymentId(undefined);void refresh();}}/>}
  </section>;
}
function RentCalculation({value:q}:{value:FinalRentCalculation}){return <div className="rounded-lg border p-3 text-xs"><p>{q.usedDays}/{q.periodDays} ngày · Đơn giá tháng {money(q.monthlyRent)} · Tiền thuê kỳ cuối {money(q.agreedFinalRent)}</p><p>Khoản hoàn thuê tối thiểu từ nguồn trả trước: {money(q.requiredRefund)}</p><p>{q.explanation}</p></div>;}
