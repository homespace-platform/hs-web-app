"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import { complaintService as service } from "@/services/complaint.service";
import storageService from "@/services/storage.service";
import { getApiErrorMessage } from "@/utils/apiError";
import { complaintActions, complaintCategories, complaintStages, type ComplaintCase, type ComplaintCategory } from "@/types/complaint.type";
import ComplaintHistory from "./ComplaintHistory";

const button="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";
const date=(value?:string)=>value?new Date(value).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"}):"—";
const money=(value:number|null)=>value==null?"Chưa có dữ liệu":value.toLocaleString("vi-VN")+" đ";
export default function ComplaintPanel({rentalRequestId,attention=false,onUpdated}:{rentalRequestId:string;attention?:boolean;onUpdated?:()=>Promise<unknown>|void}){
  const {profile}=useAuth();
  const [expanded,setExpanded]=useState(attention),[rows,setRows]=useState<ComplaintCase[]>([]),[selected,setSelected]=useState("");
  const [reason,setReason]=useState(""),[category,setCategory]=useState<ComplaintCategory>("OTHER"),[urgent,setUrgent]=useState(false),[files,setFiles]=useState<File[]>([]);
  const [error,setError]=useState(""),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[creating,setCreating]=useState(false);
  const generation=useRef(0),identity=useRef(0),mutex=useRef(false),uploaded=useRef(new Map<File,string>()),editing=useRef(false);
  const scoped=rows.filter(c=>c.rentalRequestId===rentalRequestId&&[c.tenantId,c.landlordId].includes(profile?.id??""));
  const current=scoped.find(c=>c.id===selected)??scoped.find(c=>c.status!=="RESOLVED")??scoped[0];
  const valid=reason.trim().length>=10&&reason.trim().length<=500;
  const refresh=useCallback((automatic=false)=>{
    const token=++generation.current;
    return service.list(rentalRequestId).then(list=>{if(token===generation.current){if(!automatic||!editing.current)setRows(list);setError("");}})
      .catch(cause=>{if(token===generation.current)setError(getApiErrorMessage(cause,"Chưa tải được hồ sơ khiếu nại."));})
      .finally(()=>{if(token===generation.current)setLoading(false);});
  },[rentalRequestId]);
  useEffect(()=>{
    const scope=identity,requests=generation,cache=uploaded,draft=editing;draft.current=false;
    setRows([]);setSelected("");setReason("");setFiles([]);setBusy(false);setCreating(false);setExpanded(attention);
    return ()=>{scope.current++;requests.current++;cache.current.clear();};
    // Status attention changes must not discard a note being written.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[rentalRequestId,profile?.id]);
  useEffect(()=>{if(attention)setExpanded(true);},[attention]);
  useEffect(()=>{if(!expanded||!rentalRequestId||!profile?.id)return;const scope=generation;setLoading(true);void refresh();const timer=window.setInterval(()=>void refresh(true),20000);return()=>{scope.current++;window.clearInterval(timer);};},[expanded,refresh,rentalRequestId,profile?.id]);
  async function proofs(){if(files.length>5||files.some(f=>f.size<=0||f.size>15*1024*1024))throw new Error("Tối đa 5 chứng cứ, 15 MB/tệp.");const ids:string[]=[];for(const file of files){let id=uploaded.current.get(file);if(!id){id=await storageService.uploadComplaintEvidence(file,rentalRequestId);uploaded.current.set(file,id);}ids.push(id);}return ids;}
  async function perform(action:string){
    if(mutex.current||!valid||(!creating&&!current))return;
    if(!creating&&action!=="COMMENT"&&files.length){toast.error("Gửi chứng cứ qua phản hồi trước khi thực hiện thao tác khác.");return;}
    const scope=identity.current,reviewed=current,note=reason.trim();mutex.current=true;setBusy(true);
    try{
      const ids=creating||action==="COMMENT"?await proofs():undefined;
      if(scope!==identity.current)return;
      if(creating)await service.open(rentalRequestId,{category,reason:note,evidenceIds:ids??[],urgent:urgent&&["SAFETY","HANDOVER"].includes(category)});
      else await service.act(reviewed!.id,action,{expectedRevision:reviewed!.revision,reason:note,evidenceIds:ids});
      if(scope!==identity.current)return;
      editing.current=false;setReason("");setFiles([]);setCreating(false);await refresh();if(scope===identity.current)await onUpdated?.();toast.success("Đã cập nhật hồ sơ khiếu nại.");
    }catch(cause){if(scope===identity.current){toast.error(getApiErrorMessage(cause,"Chưa thể gửi thao tác. Tải lại hồ sơ và kiểm tra phiên bản."));await refresh();}}
    finally{mutex.current=false;if(scope===identity.current)setBusy(false);}
  }
  async function proof(id:string){const tab=window.open("","_blank");try{const url=await storageService.getViewUrl(id);if(tab){tab.opener=null;tab.location.href=url;}}catch(cause){tab?.close();toast.error(getApiErrorMessage(cause,"Không mở được chứng cứ."));}}
  function pick(list:FileList|null){const values=Array.from(list??[]);if(values.length>5||values.some(f=>f.size<=0||f.size>15*1024*1024||!/[.](jpe?g|png|webp|pdf)$/i.test(f.name))){toast.error("Tối đa 5 ảnh JPG/PNG/WebP hoặc PDF, 15 MB/tệp.");setFiles([]);return false;}setFiles(values);return true;}
  if(!profile?.id||!rentalRequestId)return null;
  return <section aria-label="Khiếu nại hồ sơ thuê" className="space-y-3 rounded-xl border border-primary/20 bg-card p-4 text-sm">
    <button type="button" aria-expanded={expanded} className="font-semibold" onClick={()=>setExpanded(v=>!v)}>Khiếu nại & hỗ trợ từ HomeSpace</button>
    {expanded&&<>
      <p className="text-xs text-muted-foreground">Phản hồi với bên còn lại, theo dõi chứng cứ và chuyển HomeSpace khi chưa thống nhất hoặc quá hạn. Tranh chấp khoản chuyển tiền được xử lý tại phần thanh toán.</p>
      {loading&&<p>Đang tải hồ sơ…</p>}{error&&<p role="alert" className="text-rose-700">{error}</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={()=>{editing.current=false;setCreating(v=>!v);setReason("");setFiles([]);}}>{creating?"Quay lại hồ sơ":"Mở khiếu nại mới"}</button><button type="button" className={button} onClick={()=>void refresh()}>Tải lại</button></div>
      {!creating&&scoped.length>1&&<label className="block">Chọn hồ sơ <select aria-label="Chọn hồ sơ khiếu nại" disabled={busy} value={current?.id??""} className="max-w-full rounded border p-2" onChange={e=>{editing.current=false;setSelected(e.target.value);setReason("");setFiles([]);}}>{scoped.map(c=><option key={c.id} value={c.id}>{complaintCategories[c.category]} · {complaintStages[c.stage]??c.stage} · {date(c.openedAt)}</option>)}</select></label>}
      {!creating&&current&&<>
        <p className="font-semibold">{complaintCategories[current.category]} · {complaintStages[current.stage]??current.stage}</p><p className="whitespace-pre-wrap">{current.reason}</p>
        {current.respondBy&&<p className={current.overdue?"text-amber-800":"text-xs text-muted-foreground"}>{current.responseDueFor===profile.id?"Bạn":current.responseDueFor==="ADMIN"?"HomeSpace":current.responseDueFor===current.landlordId?"Chủ nhà":current.responseDueFor===current.tenantId?"Người thuê":"Các bên"} cần phản hồi / thực hiện trước {date(current.respondBy)}{current.overdue?" · Đã quá hạn":""}. Quá hạn không tự đồng ý hay xử lý tiền.</p>}
        {current.proposalReason&&<div className="rounded-lg border p-3"><p className="font-semibold">Đề xuất của {current.proposedBy===profile.id?"bạn":"bên còn lại"}</p><p>{current.proposalReason}</p></div>}
        {current.decision&&<div className="space-y-1 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-950"><p className="font-semibold">Kết luận HomeSpace</p><p>{current.decision}</p><p className="text-xs">{current.outcome==="REVISE_SETTLEMENT"?"Đề xuất quyết toán mới cần chủ nhà đồng ý, sau đó người thuê xác nhận bàn giao/quyết toán ở phần tiền cọc. Tiền hoàn vẫn phải xác nhận thực nhận.":"Theo dõi việc thực hiện; xác nhận hoàn tất tại đây không phải chứng từ nhận tiền."}</p></div>}
        {current.settlement&&<p className="text-xs">Quyết toán phiên bản {current.settlement.version} · Khấu trừ {money(current.settlement.deduction)} · Hoàn {money(current.settlement.refund)} · Trả thêm {money(current.settlement.balance)} · {current.settlement.ownerApproved?"Chủ nhà đã đồng ý đề xuất admin":"Chưa có xác nhận của chủ nhà cho đề xuất admin"}.</p>}
        {!!current.evidenceIds.length&&<div className="flex flex-wrap gap-2">{current.evidenceIds.map((id,i)=><button type="button" className={button} key={id} onClick={()=>void proof(id)}>Xem chứng cứ {i+1}</button>)}</div>}
        {current.status==="RESOLVED"&&current.closingReason&&<p className="rounded-lg border p-3">Lý do đóng / thống nhất: {current.closingReason}</p>}
        <ComplaintHistory complaint={current} onProof={id=>void proof(id)}/>
      </>}
      {creating&&<div className="space-y-2"><label>Nhóm vấn đề <select aria-label="Nhóm khiếu nại" disabled={busy} value={category} className="max-w-full rounded border p-2" onChange={e=>{setCategory(e.target.value as ComplaintCategory);setUrgent(false);}}>{Object.entries(complaintCategories).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
        {category==="DEPOSIT_SETTLEMENT"&&<p className="text-xs text-amber-800">Phản đối đúng phiên bản đề xuất tại phần quyết toán cọc sẽ tự mở hồ sơ. Chỉ dùng nút này để tiếp nhận phản đối cũ chưa có hồ sơ.</p>}
        {["SAFETY","HANDOVER"].includes(category)&&<label className="flex gap-2"><input type="checkbox" checked={urgent} onChange={e=>setUrgent(e.target.checked)}/>Sự cố an toàn / bàn giao cần chuyển HomeSpace ngay (nêu rõ căn cứ).</label>}
      </div>}
      {(creating||Boolean(current?.allowedActions.length))&&<div className="space-y-2">
        <textarea disabled={busy} aria-label="Nội dung khiếu nại" value={reason} maxLength={500} onChange={e=>{editing.current=e.target.value.trim().length>0;setReason(e.target.value);}} placeholder="Lý do / phản hồi / căn cứ xử lý (10–500 ký tự)" className="min-h-24 w-full rounded-lg border p-3"/>
        {(creating||current?.allowedActions.includes("COMMENT"))&&<label className="block text-xs">Chứng cứ khi mở hoặc phản hồi (tối đa 5 tệp, 15 MB/tệp)<input aria-label="Chứng cứ khiếu nại" disabled={busy} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>{if(!pick(e.target.files))e.target.value="";}} className="mt-2 block w-full"/>{files.map(f=>f.name).join(", ")}</label>}
        <div className="flex flex-wrap gap-2">{creating?<button type="button" className={button} disabled={busy||!valid} onClick={()=>void perform("OPEN")}>Gửi khiếu nại</button>:current?.allowedActions.map(action=><button type="button" className={button} key={action} disabled={busy||!valid} onClick={()=>void perform(action)}>{complaintActions[action]??action}</button>)}</div>
        {current?.allowedActions.includes("APPROVE_SETTLEMENT")&&<p className="text-xs text-amber-800">Bấm đồng ý là chủ nhà chấp thuận phiên bản và các khoản quyết toán admin đề xuất ở trên; chưa xác nhận đã chuyển tiền.</p>}
      </div>}
      {!creating&&!current&&!loading&&!error&&<p className="text-xs text-muted-foreground">Chưa có hồ sơ khiếu nại.</p>}
    </>}
  </section>;
}
