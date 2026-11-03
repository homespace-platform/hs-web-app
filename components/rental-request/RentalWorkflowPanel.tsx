"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {useAuth} from "@/features/auth/useAuth";
import {toast} from "sonner";
import {rentalWorkflowService as service} from "@/services/rental-workflow.service";
import storage from "@/services/storage.service";
import payments from "@/services/payment-request.service";
import {getApiErrorMessage} from "@/utils/apiError";
import type {PaymentRequest} from "@/types/payment-request.type";
import {workflowTitles,workflowStatuses,workflowActions,workflowObligations,type RentalWorkflow,type WorkflowKind,type WorkflowProposal,type HandoverItem,type RentRefund} from "@/types/rental-workflow.type";
import RentalPaymentModal from "./RentalPaymentModal";
import WorkflowDocumentsPanel from "./WorkflowDocumentsPanel";
import type {FinalRentCalculation} from "@/types/rental-workflow.type";

const button="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";
const input="mt-1 block w-full rounded-lg border bg-background p-2 text-sm";
const date=(s?:string)=>s?new Date(s).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"}):"—";
const money=(n?:number|null)=>n==null?"Chưa ghi nhận":n.toLocaleString("vi-VN")+" đ";
type Props={rentalRequestId:string;kind:WorkflowKind;onUpdated?:()=>Promise<unknown>|void};
export default function RentalWorkflowPanel(props:Props){
  const {profile}=useAuth();
  if(!profile?.id||!props.rentalRequestId)return null;
  return <ScopedWorkflowPanel key={`${props.rentalRequestId}:${props.kind}:${profile.id}`} {...props}/>;
}
export function WorkflowSummary({proposal:p}:{proposal:WorkflowProposal}){
  return <div className="space-y-2 text-sm">
    {p.reason&&<p className="whitespace-pre-wrap">{p.reason}</p>}
    {p.handedOverAt&&<><p>Ngày thực tế: {date(p.handedOverAt)} · Chìa khóa: {p.keys}</p><p className="whitespace-pre-wrap">Hiện trạng: {p.condition}</p><p>Công tơ thực tế: điện {p.electricity??"chưa ghi nhận"} kWh · nước {p.water??"chưa ghi nhận"} m³</p><p className="text-xs text-muted-foreground">Chỉ số này là bằng chứng thực tế; không ghi đè chỉ số trong HĐ đã ký hoặc hóa đơn.</p></>}
    {!!p.inventory?.length&&<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th>Tài sản</th><th>Số lượng</th><th>Hiện trạng</th></tr></thead><tbody>{p.inventory.map((row,i)=><tr key={i}><td className="border-t py-2">{row.name}</td><td className="border-t">{row.quantity}</td><td className="border-t">{row.condition}</td></tr>)}</tbody></table></div>}
    {p.endExclusive&&<><p>Ngày kết thúc (không tính ngày này): <strong>{p.endExclusive}</strong></p><p>Bàn giao: {p.handoverTerms}</p><p>{p.finalRentPolicy==="DAILY_PRORATED"?"Tiền thuê kỳ cuối tính theo ngày thực tế của kỳ; các phí khác theo HĐ/hóa đơn.":"Tiền thuê và phí cố định tính trọn kỳ đã bắt đầu."} Cọc quyết toán riêng sau hóa đơn cuối.</p>{p.rentRefunds?.length?<table className="w-full text-left text-xs"><thead><tr><th>Khoản hoàn đã thống nhất</th><th>Số tiền</th></tr></thead><tbody>{p.rentRefunds.map((r,i)=><tr key={r.paymentId}><td>Khoản {i+1}</td><td>{money(r.amount)}</td></tr>)}</tbody></table>:<p>Không có khoản hoàn tiền thuê bổ sung trong đề nghị này.</p>}</>}
  </div>;
}
function Evidence({ids}:{ids?:string[]}){
  return <div className="flex flex-wrap gap-3">{ids?.map((id,i)=><button className="text-xs text-primary underline" type="button" key={id} onClick={async()=>{const tab=window.open("about:blank","_blank");if(tab)tab.opener=null;try{const url=await storage.getViewUrl(id);if(tab)tab.location.href=url;}catch(e){tab?.close();toast.error(getApiErrorMessage(e,"Không mở được bằng chứng."));}}}>Xem bằng chứng {i+1} ↗</button>)}</div>;
}
function ScopedWorkflowPanel({rentalRequestId,kind,onUpdated}:Props){
  const [expanded,setExpanded]=useState(false),[data,setData]=useState<RentalWorkflow|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const [creating,setCreating]=useState(false),[reason,setReason]=useState(""),[ack,setAck]=useState(false),[contacted,setContacted]=useState(false),[files,setFiles]=useState<File[]>([]);
  const [actual,setActual]=useState(""),[keys,setKeys]=useState("0"),[condition,setCondition]=useState(""),[electricity,setElectricity]=useState(""),[water,setWater]=useState("");
  const [inventory,setInventory]=useState<HandoverItem[]>([]),[end,setEnd]=useState(""),[terms,setTerms]=useState(""),[refunds,setRefunds]=useState<RentRefund[]>([]),[sources,setSources]=useState<PaymentRequest[]>([]),[paymentId,setPaymentId]=useState<string>();
  const [policy,setPolicy]=useState("FULL_STARTED_PERIOD"),[calculation,setCalculation]=useState<FinalRentCalculation|null>(null);
  const mounted=useRef(true),generation=useRef(0),mutex=useRef(false),uploaded=useRef(new Map<File,string>()),quoteSequence=useRef(0);
  const refresh=useCallback(async()=>{const current=++generation.current;try{const next=await service.get(rentalRequestId,kind);if(mounted.current&&current===generation.current){setData(next);setError("");setAck(false);setContacted(false);}}catch(e){if(mounted.current&&current===generation.current)setError(getApiErrorMessage(e,"Chưa tải được hồ sơ."));}},[rentalRequestId,kind]);
  useEffect(()=>{const active=mounted,requests=generation;active.current=true;return()=>{active.current=false;requests.current++;};},[]);
  useEffect(()=>{if(expanded)void refresh();},[expanded,refresh]);
  useEffect(()=>{if(!creating||kind!=="early-exit"||!data?.contractId)return;let active=true;void payments.getContractPayments(data.contractId).then(list=>{if(active)setSources(list.filter(p=>p.status==="CONFIRMED"&&["INITIAL","MONTHLY_RENT"].includes(p.type)));}).catch(()=>{if(active)setSources([]);});return()=>{active=false;};},[creating,kind,data?.contractId]);
  const valid=reason.trim().length>=10&&reason.trim().length<=1000;
  function start(){if(!data)return;quoteSequence.current++;const p=data.proposal;setReason("");setAck(false);setContacted(false);setFiles([]);setInventory(p.inventory??[]);setCondition(p.condition??"");setKeys(String(p.keys??0));setEnd(p.endExclusive??"");setTerms(p.handoverTerms??"");setRefunds(p.rentRefunds??[]);setPolicy(p.finalRentPolicy??"FULL_STARTED_PERIOD");setCalculation(data.rentCalculation??null);setElectricity(p.electricity==null?"":String(p.electricity));setWater(p.water==null?"":String(p.water));setCreating(true);}
  async function perform(action:string){
    if(mutex.current||!data||!valid)return;
    if(["REQUEST_RESUME","RESUME","ACCEPT","CONFIRM","CONFIRM_RETURN","FULL_REFUND_EXIT","PROPOSE"].includes(action)&&!ack)return;
    if(action==="FULL_REFUND_EXIT"&&!contacted)return;
    if(action!=="PROPOSE"&&files.length){toast.error("Bằng chứng cần được gắn vào đề xuất mới trước khi thao tác.");return;}
    const reviewed=data;mutex.current=true;setBusy(true);
    try{
      if(action==="PROPOSE"){
        const evidenceIds:string[]=[];
        for(const file of files){let id=uploaded.current.get(file);if(!id){id=await storage.uploadComplaintEvidence(file,rentalRequestId);uploaded.current.set(file,id);}if(!mounted.current)return;evidenceIds.push(id);}
        let payload:object={expectedRevision:reviewed.revision,reason:reason.trim(),evidenceIds};
        if(kind==="move-in"){
          const handedOverAt=new Date(actual);if(!Number.isFinite(handedOverAt.getTime())||!condition.trim())throw new Error("Cần ngày nhận nhà thực tế và hiện trạng.");
          payload={...payload,handedOverAt:handedOverAt.toISOString(),keys:Number(keys),condition:condition.trim(),electricity:electricity===""?null:Number(electricity),water:water===""?null:Number(water),inventory};
        }else if(kind==="early-exit")payload={...payload,endExclusive:end,handoverTerms:terms.trim(),finalRentPolicy:policy,rentRefunds:refunds};
        await service.propose(rentalRequestId,kind,payload);
      }else await service.act(rentalRequestId,kind,action,{expectedRevision:reviewed.revision,reason:reason.trim(),acknowledged:ack,tenantContacted:contacted});
      if(!mounted.current)return;setReason("");setFiles([]);setCreating(false);setAck(false);await refresh();if(mounted.current)await onUpdated?.();toast.success("Đã ghi nhận thao tác và lịch sử.");
    }catch(e){if(mounted.current){toast.error(getApiErrorMessage(e,"Chưa thể thực hiện. Kiểm tra dữ liệu mới trước khi gửi lại."));await refresh();}}
    finally{mutex.current=false;if(mounted.current)setBusy(false);}
  }
  return <section className="space-y-3 rounded-xl border bg-card p-4 text-sm" aria-label={workflowTitles[kind]}>
    <button className="font-semibold" type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{workflowTitles[kind]}</button>
    {expanded&&<>
      {kind==="cancellation"&&<p className="text-xs text-muted-foreground">Dùng khi đã nhận tiền nhưng chưa hoàn tất HĐ thuê. Đề nghị này hoàn toàn bộ khoản thực nhận; không tự mất cọc. Nếu không phản hồi, chủ nhà chỉ kết thúc sau hạn, đã liên hệ khách và phòng chưa bàn giao. Chữ ký/chứng từ chưa rõ phải đối soát trước.</p>}
      {error&&<p role="alert" className="text-rose-700">{error}</p>}
      {!data&&!error&&<p>Đang tải…</p>}
      {data&&<>
        <p className="font-medium">{workflowStatuses[data.status]??data.status}</p><p className="text-xs">{workflowObligations[data.depositObligation]??"Nghĩa vụ đang được theo dõi"}</p>
        {data.blockedReason&&<p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{data.blockedReason}</p>}
        {data.respondBy&&<p>Hạn phản hồi: {date(data.respondBy)}. Quá hạn không tự xác nhận đồng ý hoặc nhận tiền.</p>}
        {!creating&&<><WorkflowSummary proposal={data.proposal}/><Evidence ids={data.proposal.evidenceIds}/><p className="text-xs">Chủ nhà xác nhận: {date(data.ownerConfirmedAt)} · Người thuê xác nhận: {date(data.tenantConfirmedAt)}</p></>}
        {!creating&&data.rentCalculation&&<RentCalculation value={data.rentCalculation}/>}
        <div className="flex flex-wrap gap-2">{data.allowedActions.includes("PROPOSE")&&<button className={button} type="button" disabled={busy} onClick={start}>{workflowActions.PROPOSE}</button>}<button className={button} disabled={busy} type="button" onClick={()=>void refresh()}>Tải lại nội dung</button>{creating&&<button className={button} disabled={busy} type="button" onClick={()=>{setCreating(false);setFiles([]);setAck(false);}}>Quay lại hồ sơ</button>}</div>
        {creating&&<div className="space-y-3 rounded-lg border p-3">
          {kind==="move-in"&&<>
            <label className="block">Ngày giờ nhận nhà thực tế<input aria-label="Ngày giờ nhận nhà thực tế" required type="datetime-local" className={input} disabled={busy} value={actual} onChange={e=>setActual(e.target.value)}/></label>
            <label className="block">Số chìa khóa<input type="number" min={0} max={1000} className={input} disabled={busy} value={keys} onChange={e=>setKeys(e.target.value)}/></label>
            <label className="block">Hiện trạng phòng<textarea minLength={10} maxLength={1000} className={input} disabled={busy} value={condition} onChange={e=>setCondition(e.target.value)}/></label>
            <div className="grid gap-3 sm:grid-cols-2"><label>Điện thực tế (kWh)<input type="number" min={0} step="0.001" className={input} disabled={busy} value={electricity} onChange={e=>setElectricity(e.target.value)}/></label><label>Nước thực tế (m³)<input type="number" min={0} step="0.001" className={input} disabled={busy} value={water} onChange={e=>setWater(e.target.value)}/></label></div>
            {inventory.map((item,i)=><div key={i} className="grid gap-2 sm:grid-cols-4"><input aria-label={`Tên tài sản ${i+1}`} placeholder="Tên tài sản" maxLength={150} className={input} disabled={busy} value={item.name} onChange={e=>setInventory(list=>list.map((r,n)=>n===i?{...r,name:e.target.value}:r))}/><input aria-label={`Số lượng ${i+1}`} type="number" min={0} max={10000} className={input} disabled={busy} value={item.quantity} onChange={e=>setInventory(list=>list.map((r,n)=>n===i?{...r,quantity:Number(e.target.value)}:r))}/><input aria-label={`Hiện trạng tài sản ${i+1}`} placeholder="Hiện trạng" maxLength={500} className={input} disabled={busy} value={item.condition} onChange={e=>setInventory(list=>list.map((r,n)=>n===i?{...r,condition:e.target.value}:r))}/><button type="button" className={button} disabled={busy} onClick={()=>setInventory(list=>list.filter((_,n)=>n!==i))}>Bỏ tài sản</button></div>)}
            <button className={button} type="button" disabled={busy||inventory.length>=100} onClick={()=>setInventory(list=>[...list,{name:"",quantity:1,condition:""}])}>Thêm tài sản bàn giao</button>
          </>}
          {kind==="early-exit"&&<>
            <label className="block">Ngày kết thúc (không tính ngày này)<input type="date" className={input} disabled={busy} value={end} onChange={e=>{quoteSequence.current++;setEnd(e.target.value);setCalculation(null);setAck(false);}}/></label>
            <label className="block">Cách trả nhà, chìa khóa và tài sản<textarea minLength={10} maxLength={1000} className={input} disabled={busy} value={terms} onChange={e=>setTerms(e.target.value)}/></label>
            <label className="block">Cách tính tiền thuê kỳ cuối<select className={input} disabled={busy} value={policy} onChange={e=>{quoteSequence.current++;setPolicy(e.target.value);setCalculation(null);setAck(false);}}><option value="FULL_STARTED_PERIOD">Trọn kỳ đã bắt đầu</option><option value="DAILY_PRORATED">Theo số ngày thực tế trong kỳ</option></select></label>
            <p className="text-xs">Cách tính theo ngày chỉ hoàn từ tiền thuê thực nhận; cần đối soát hóa đơn gốc trước nếu chưa nhận tiền. Phí khác theo HĐ/hóa đơn. Cọc quyết toán riêng.</p>
            <button type="button" className={button} disabled={busy||!end} onClick={async()=>{const request=++quoteSequence.current;try{const quote=await service.calculate(rentalRequestId,end,policy);if(mounted.current&&request===quoteSequence.current)setCalculation(quote);}catch(e){toast.error(getApiErrorMessage(e,"Chưa tính được kỳ cuối."));}}}>Đối chiếu phép tính kỳ cuối</button>
            {calculation&&<><RentCalculation value={calculation}/>{calculation.requiredRefund>0&&calculation.sourcePaymentId&&<button type="button" className={button} disabled={busy} onClick={()=>{setRefunds(list=>[...list.filter(r=>r.paymentId!==calculation.sourcePaymentId),{paymentId:calculation.sourcePaymentId!,amount:calculation.requiredRefund}]);setAck(false);}}>Ghi khoản hoàn đề xuất vào thỏa thuận</button>}</>}
            {refunds.map((r,i)=><div className="flex flex-wrap gap-2" key={i}><select aria-label={`Nguồn tiền thuê hoàn ${i+1}`} className={input} disabled={busy} value={r.paymentId} onChange={e=>setRefunds(list=>list.map((v,n)=>n===i?{...v,paymentId:e.target.value}:v))}><option value="">Chọn khoản tiền thuê thực nhận</option>{sources.map((p,n)=><option key={p.id} value={p.id}>{p.type==="INITIAL"?"Khoản ban đầu":"Hóa đơn thuê"} {n+1} · {money(p.totalAmount)}</option>)}</select><input aria-label={`Số tiền hoàn ${i+1}`} type="number" min="0.01" step="0.01" className={input} disabled={busy} value={r.amount} onChange={e=>setRefunds(list=>list.map((v,n)=>n===i?{...v,amount:Number(e.target.value)}:v))}/><button className={button} type="button" disabled={busy} onClick={()=>setRefunds(list=>list.filter((_,n)=>n!==i))}>Bỏ khoản hoàn</button></div>)}
            <button className={button} type="button" disabled={busy||refunds.length>=50} onClick={()=>setRefunds(list=>[...list,{paymentId:"",amount:0}])}>Thêm khoản hoàn tiền thuê</button>
          </>}
          <label className="block">Ảnh / PDF bằng chứng (tối đa 5, 15 MB/tệp)<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" disabled={busy} className={input} onChange={e=>{const list=Array.from(e.target.files??[]);if(list.length>5||list.some(f=>f.size<=0||f.size>15*1024*1024||!/[.](jpe?g|png|webp|pdf)$/i.test(f.name))){toast.error("Tối đa 5 ảnh/PDF, 15 MB/tệp.");setFiles([]);e.target.value="";}else setFiles(list);}}/></label>
        </div>}
        {(creating||data.allowedActions.some(a=>a!=="PROPOSE"))&&<>
          <label className="block">{creating?"Lý do lập / chỉnh đề xuất":"Nội dung phản hồi"}<textarea aria-label="Nội dung thao tác" minLength={10} maxLength={1000} disabled={busy} className={input} value={reason} onChange={e=>setReason(e.target.value)}/></label>
          <label className="flex gap-2"><input type="checkbox" checked={ack} disabled={busy} onChange={e=>setAck(e.target.checked)}/><span>{(data.status==="RESUME_PROPOSED"||data.allowedActions.includes("REQUEST_RESUME"))?"Tôi đồng ý tiếp tục thuê và ký theo hồ sơ hiện tại; không tự thay đổi điều khoản, chữ ký hoặc xác nhận tiền.":kind==="cancellation"?"Tôi đã đối chiếu đề nghị hoàn toàn bộ tiền; phòng chưa bàn giao hoặc đã được nhận lại đầy đủ, không còn người thuê/tài sản của khách trong phòng.":"Tôi đã đối chiếu nội dung đang xem. Khi xác nhận bàn giao, tôi xác nhận nhà, chìa khóa và tài sản đã được giao/nhận thực tế."} Việc này không thay bước xác nhận nhận tiền.</span></label>
          {data.allowedActions.includes("FULL_REFUND_EXIT")&&!creating&&<label className="flex gap-2"><input type="checkbox" checked={contacted} disabled={busy} onChange={e=>setContacted(e.target.checked)}/><span>Tôi đã liên hệ người thuê về đề nghị này; phòng chưa bàn giao và tôi đồng ý hoàn toàn bộ khoản thực nhận.</span></label>}
          <div className="flex flex-wrap gap-2">{(creating?["PROPOSE"]:data.allowedActions.filter(a=>a!=="PROPOSE")).map(action=><button key={action} type="button" className={button} disabled={busy||!valid||["REQUEST_RESUME","RESUME","PROPOSE","ACCEPT","CONFIRM","CONFIRM_RETURN","FULL_REFUND_EXIT"].includes(action)&&!ack||action==="FULL_REFUND_EXIT"&&!contacted} onClick={()=>void perform(action)}>{creating?"Gửi đề xuất để hai bên kiểm tra":workflowActions[action]??action}</button>)}</div>
        </>}
        {data.complaintId&&<p className="text-xs">Đã liên kết khiếu nại. Tiếp tục phản hồi và chuyển HomeSpace tại mục Khiếu nại & hỗ trợ.</p>}
        {kind!=="cancellation"&&data.revision>0&&!creating&&<WorkflowDocumentsPanel rentalRequestId={rentalRequestId} kind={kind} data={data} onUpdated={async()=>{await refresh();await onUpdated?.();}}/>}
        {!!data.refundPayments.length&&<div className="space-y-2">{data.refundPayments.map((p,i)=><div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2" key={p.id}><span>Khoản hoàn {i+1}: {money(p.totalAmount)} · {p.status==="CONFIRMED"?"Đã xác nhận thực nhận":"Chưa hoàn tất xác nhận"}</span><button className={button} type="button" onClick={()=>setPaymentId(p.id)}>Mở thanh toán / đối soát</button></div>)}</div>}
        {!!data.history.length&&<details><summary className="cursor-pointer text-xs font-semibold">Lịch sử và các bản đã đối chiếu ({data.history.length})</summary>{[...data.history].reverse().map(e=><article className="mt-3 space-y-2 border-t pt-3" key={e.revision}><p className="text-xs">{workflowActions[e.action]??e.action} · {e.role==="LANDLORD"?"Chủ nhà":"Người thuê"} · {date(e.at)}</p><p>{e.reason}</p><WorkflowSummary proposal={e.proposal}/><Evidence ids={e.evidenceIds}/></article>)}</details>}
      </>}
    </>}
    {paymentId&&<RentalPaymentModal request={{id:rentalRequestId}} paymentId={paymentId} isOpen onClose={()=>{setPaymentId(undefined);void refresh();}} onPaymentSuccess={()=>{setPaymentId(undefined);void refresh();}}/>}
  </section>;
}
function RentCalculation({value:q}:{value:FinalRentCalculation}){return <div className="rounded-lg border p-3 text-xs"><p>{q.usedDays}/{q.periodDays} ngày · Đơn giá tháng {money(q.monthlyRent)} · Tiền thuê kỳ cuối {money(q.agreedFinalRent)}</p><p>Khoản hoàn thuê tối thiểu từ nguồn trả trước: {money(q.requiredRefund)}</p><p>{q.explanation}</p></div>;}
