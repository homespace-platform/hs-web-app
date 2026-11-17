"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import { complaintService as service } from "@/services/complaint.service";
import storageService from "@/services/storage.service";
import { getApiErrorMessage } from "@/utils/apiError";
import { complaintActions, complaintCategories, complaintStages, type ComplaintCase, type ComplaintCategory } from "@/types/complaint.type";
import ComplaintHistory from "./ComplaintHistory";

const button="rounded-xl border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";
const actionHints: Record<string,string> = {
  COMMENT:"Trao đổi với bên còn lại hoặc bổ sung chứng cứ cho hồ sơ này.",
  ESCALATE:"Chuyển hồ sơ và chứng cứ hiện có để HomeSpace hỗ trợ xem xét.",
  WITHDRAW:"Ghi lý do rút hồ sơ. Lịch sử trao đổi vẫn được giữ lại.",
  REOPEN:"Nêu thông tin mới hoặc lý do cần tiếp tục xử lý hồ sơ đã đóng.",
};
const date=(value?:string)=>value?new Date(value).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"}):"—";
export default function ComplaintPanel({rentalRequestId,attention=false,onUpdated}:{rentalRequestId:string;attention?:boolean;onUpdated?:()=>Promise<unknown>|void}){
  const {profile}=useAuth();
  const actionGroup=useId();
  const [rows,setRows]=useState<ComplaintCase[]>([]),[selected,setSelected]=useState("");
  const [reason,setReason]=useState(""),[category,setCategory]=useState<ComplaintCategory>("OTHER"),[urgent,setUrgent]=useState(false),[files,setFiles]=useState<File[]>([]);
  const [error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[creating,setCreating]=useState(false);
  const [chosenAction,setChosenAction]=useState("");
  const [modalOpen,setModalOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const generation=useRef(0),identity=useRef(0),mutex=useRef<number|null>(null),uploaded=useRef(new Map<File,string>()),editing=useRef(false);
  const scoped=rows.filter(c=>c.rentalRequestId===rentalRequestId&&[c.tenantId,c.landlordId].includes(profile?.id??""));
  const current=scoped.find(c=>c.id===selected)??scoped.find(c=>c.status!=="RESOLVED")??scoped[0];
  const valid=reason.trim().length>=10&&reason.trim().length<=500;
  const actions=current?.allowedActions.filter(a=>["COMMENT","ESCALATE","WITHDRAW","REOPEN"].includes(a))??[];
  const activeAction=actions.includes(chosenAction)?chosenAction:actions.includes("COMMENT")?"COMMENT":actions[0];
  const resetDraft=()=>{editing.current=false;setReason("");setFiles([]);setChosenAction("");};
  const refresh=useCallback((automatic=false)=>{
    const token=++generation.current;
    return service.list(rentalRequestId).then(list=>{if(token===generation.current){if(!automatic||!editing.current)setRows(list);setError("");}})
      .catch(cause=>{if(token===generation.current)setError(getApiErrorMessage(cause,"Chưa tải được hồ sơ khiếu nại."));})
      .finally(()=>{if(token===generation.current)setLoading(false);});
  },[rentalRequestId]);
  useEffect(()=>{
    const scope=identity,requests=generation,cache=uploaded,draft=editing;draft.current=false;
    setModalOpen(false);setRows([]);setSelected("");setReason("");setFiles([]);setBusy(false);setCreating(false);setChosenAction("");setCategory("OTHER");setUrgent(false);
    return ()=>{scope.current++;requests.current++;cache.current.clear();};
  },[rentalRequestId,profile?.id]);
  useEffect(()=>{if(!rentalRequestId||!profile?.id)return;const scope=generation;setLoading(true);void refresh();const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh(true);},20000);return()=>{scope.current++;window.clearInterval(timer);};},[refresh,rentalRequestId,profile?.id]);
  useEffect(()=>{
    const element=dialog.current;if(!modalOpen||!element)return;
    if(!element.open)element.showModal();
    const overflow=document.body.style.overflow;document.body.style.overflow="hidden";
    return()=>{element.close();document.body.style.overflow=overflow;};
  },[modalOpen]);
  function close(){if(mutex.current===identity.current)return;setModalOpen(false);setCreating(false);resetDraft();}
  async function proofs(){if(files.length>5||files.some(f=>f.size<=0||f.size>15*1024*1024))throw new Error("Tối đa 5 chứng cứ, 15 MB/tệp.");const ids:string[]=[];for(const file of files){let id=uploaded.current.get(file);if(!id){id=await storageService.uploadComplaintEvidence(file,rentalRequestId);uploaded.current.set(file,id);}ids.push(id);}return ids;}
  async function perform(action:string){
    if(mutex.current===identity.current||!valid||(!creating&&(!current||!actions.includes(action))))return;
    if(!creating&&action!=="COMMENT"&&files.length){toast.error("Gửi chứng cứ qua phản hồi trước khi thực hiện thao tác khác.");return;}
    const scope=identity.current,reviewed=current,note=reason.trim();mutex.current=scope;setBusy(true);
    try{
      const ids=creating||action==="COMMENT"?await proofs():undefined;
      if(scope!==identity.current)return;
      if(creating){const opened=await service.open(rentalRequestId,{category,reason:note,evidenceIds:ids??[],urgent:urgent&&["SAFETY","HANDOVER"].includes(category)});if(scope===identity.current)setSelected(opened.id);}
      else await service.act(reviewed!.id,action,{expectedRevision:reviewed!.revision,reason:note,evidenceIds:ids});
      if(scope!==identity.current)return;
      editing.current=false;setReason("");setFiles([]);setCreating(false);setChosenAction("");await refresh();
      if(scope!==identity.current)return;
      toast.success("Đã cập nhật hồ sơ khiếu nại.");
      try{await onUpdated?.();}catch{if(scope===identity.current)toast.error("Hồ sơ đã được lưu. Chưa làm mới được thông tin hợp đồng; vui lòng tải lại.");}
    }catch(cause){if(scope===identity.current){toast.error(getApiErrorMessage(cause,"Chưa thể gửi thao tác. Tải lại hồ sơ và kiểm tra phiên bản."));await refresh();}}
    finally{if(mutex.current===scope)mutex.current=null;if(scope===identity.current)setBusy(false);}
  }
  async function proof(id:string,source?:NonNullable<NonNullable<ComplaintCase["sources"]>[number]["documents"]>[number]){
    const tab=window.open("","_blank");if(!tab){toast.error("Vui lòng cho phép mở cửa sổ để xem chứng cứ.");return;}tab.opener=null;
    try{
      if(source?.purpose==="SIGNED_FINAL"){
        const blob=await service.sourcePdf(source);if(tab.closed)return;
        const url=URL.createObjectURL(blob);tab.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),60000);
      }else{const url=await storageService.getViewUrl(id);if(!tab.closed)tab.location.href=url;}
    }catch(cause){tab.close();toast.error(getApiErrorMessage(cause,"Không mở được chứng cứ."));}
  }
  function pick(list:FileList|null){const values=Array.from(list??[]);if(values.length>5||values.some(f=>f.size<=0||f.size>15*1024*1024||!/[.](jpe?g|png|webp|pdf)$/i.test(f.name))){toast.error("Tối đa 5 ảnh JPG/PNG/WebP hoặc PDF, 15 MB/tệp.");setFiles([]);editing.current=reason.trim().length>0;return false;}setFiles(values);editing.current=reason.trim().length>0||values.length>0;return true;}
  if(!profile?.id||!rentalRequestId)return null;
  function openNew(){resetDraft();setCategory("OTHER");setUrgent(false);setCreating(true);setModalOpen(true);}
  return <section aria-label="Khiếu nại hồ sơ thuê" className="rounded-2xl border border-primary/20 bg-card p-4 text-sm sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="font-bold">Khiếu nại & hỗ trợ từ HomeSpace</h2><p className="mt-1 text-xs text-muted-foreground">Trao đổi với bên còn lại hoặc nhờ HomeSpace hỗ trợ.</p>
        {attention&&<p className="mt-1 text-xs text-amber-800">Có vấn đề quyết toán cần trao đổi.</p>}
        {!loading&&<p className="mt-1 text-xs text-muted-foreground">{scoped.length?`${scoped.filter(c=>c.status!=="RESOLVED").length} đang mở · ${scoped.length} hồ sơ`:"Chưa có khiếu nại."}</p>}
      </div>
      <div className="flex gap-2"><button type="button" className={button} disabled={busy} onClick={()=>{resetDraft();setCreating(false);setModalOpen(true);}}>Xem trao đổi{scoped.length?` (${scoped.length})`:""}</button><button type="button" className={button+" border-primary/30 text-primary"} disabled={busy||loading} onClick={openNew}>Mở khiếu nại mới</button></div>
    </div>
    {error&&!modalOpen&&<p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
    <dialog ref={dialog} aria-labelledby={actionGroup} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl border bg-card p-0 text-sm text-foreground shadow-2xl backdrop:bg-black/50" onCancel={e=>{e.preventDefault();close();}}>
      {modalOpen&&<>
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card p-4"><h2 id={actionGroup} className="font-bold">{creating?"Mở khiếu nại mới":"Khiếu nại & hỗ trợ"}</h2><button type="button" className={button} disabled={busy} onClick={close} aria-label="Đóng cửa sổ khiếu nại">Đóng</button></header>
        <div className="space-y-4 p-4 sm:p-5">
          <p className="text-xs text-muted-foreground">Gửi thông tin, đính kèm chứng cứ và chuyển HomeSpace khi cần. Thay đổi hợp đồng hoặc xử lý tiền thực hiện ở chức năng tương ứng.</p>
          {error&&<p role="alert" className="rounded-lg border border-rose-200 p-3 text-rose-700">{error}</p>}
          <div className="flex flex-wrap justify-between gap-2"><button type="button" className={button} disabled={busy||loading} onClick={()=>{setLoading(true);void refresh();}}>Tải lại</button>{creating?<button type="button" className={button} disabled={busy} onClick={()=>{resetDraft();setCreating(false);}}>Xem hồ sơ đã có</button>:<button type="button" className={button} disabled={busy||loading} onClick={openNew}>Mở khiếu nại mới</button>}</div>
          {loading&&!scoped.length&&!creating&&<p role="status">Đang tải hồ sơ…</p>}
          {!creating&&scoped.length>1&&<div aria-label="Chọn hồ sơ khiếu nại" className="flex flex-wrap gap-2">{scoped.map(c=><button type="button" key={c.id} disabled={busy} aria-pressed={current?.id===c.id} className={button+(current?.id===c.id?" border-primary text-primary":"")} onClick={()=>{resetDraft();setSelected(c.id);}}>{complaintCategories[c.category]} · {date(c.openedAt)}</button>)}</div>}
          {!creating&&current&&<>
            <article className="space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{complaintCategories[current.category]}</h3><span className="text-xs text-primary">{complaintStages[current.stage]??current.stage}</span></div>
              <p className="whitespace-pre-wrap break-words">{current.reason}</p>
              {current.respondBy&&<p className="text-xs text-muted-foreground">{current.responseDueFor===profile.id?"Bạn":current.responseDueFor==="ADMIN"?"HomeSpace":"Bên còn lại"} cần phản hồi trước {date(current.respondBy)}{current.overdue?" · Đã quá hạn":""}. Quá hạn không tự đồng ý hay xử lý tiền.</p>}
              {!!current.evidenceIds.length&&<div className="flex flex-wrap gap-2">{current.evidenceIds.map((id,i)=><button type="button" className={button} key={id} onClick={()=>void proof(id)}>Xem chứng cứ {i+1}</button>)}</div>}
              {current.decision&&<div className="rounded-lg bg-primary/5 p-3"><p className="font-semibold">Kết luận HomeSpace</p><p className="whitespace-pre-wrap break-words">{current.decision}</p></div>}
              {current.status==="RESOLVED"&&current.closingReason&&current.closingReason!==current.decision&&<p className="whitespace-pre-wrap break-words">Lý do đóng: {current.closingReason}</p>}
            </article>
            <ComplaintHistory complaint={current} expanded onProof={(id,document)=>void proof(id,document)}/>
          </>}
          {creating&&<label className="block space-y-2 text-xs"><span className="font-medium">Vấn đề cần hỗ trợ</span><select aria-label="Nhóm khiếu nại" disabled={busy} value={category} onChange={e=>{setCategory(e.target.value as ComplaintCategory);setUrgent(false);}} className="w-full rounded-lg border bg-background p-2">{Object.entries(complaintCategories).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
          {creating&&category==="DEPOSIT_SETTLEMENT"&&<p className="text-xs text-muted-foreground">Hãy phản đối phiên bản tại mục quyết toán cọc trước. Hồ sơ khiếu nại chỉ dùng để trao đổi.</p>}
          {creating&&["SAFETY","HANDOVER"].includes(category)&&<label className="flex gap-2 text-xs"><input type="checkbox" disabled={busy} checked={urgent} onChange={e=>setUrgent(e.target.checked)}/>Chuyển HomeSpace ngay do sự cố an toàn / bàn giao.</label>}
          {(creating||actions.length>0)&&<div className="space-y-3 border-t pt-4">
            <label className="block space-y-2"><span className="font-semibold">{creating?"Mô tả vấn đề":activeAction==="COMMENT"?"Gửi trao đổi":complaintActions[activeAction!]}</span><textarea disabled={busy} aria-label="Nội dung khiếu nại" value={reason} maxLength={500} onChange={e=>{editing.current=e.target.value.trim().length>0||files.length>0;setReason(e.target.value);}} placeholder="Nhập nội dung từ 10 đến 500 ký tự" className="min-h-24 w-full rounded-xl border bg-background p-3"/></label>
            {!creating&&activeAction!=="COMMENT"&&<p className="text-xs text-muted-foreground">{actionHints[activeAction!]}</p>}
            <p className="text-xs text-muted-foreground">{reason.trim().length}/500 ký tự</p>
            {(creating||activeAction==="COMMENT")&&<label className="block space-y-2 text-xs"><span>Đính kèm chứng cứ · Tối đa 5 ảnh/PDF, 15 MB/tệp</span><input aria-label="Chứng cứ khiếu nại" disabled={busy} type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e=>{if(!pick(e.target.files))e.target.value="";}} className="block w-full rounded-lg border p-2"/></label>}
            <div className="flex flex-wrap gap-2"><button type="button" className={button+" border-primary bg-primary text-primary-foreground hover:bg-primary/90"} disabled={busy||!valid||(!creating&&(!activeAction||(activeAction!=="COMMENT"&&files.length>0)))} onClick={()=>void perform(creating?"OPEN":activeAction!)}>{busy?"Đang gửi…":creating?"Gửi khiếu nại":activeAction==="COMMENT"?"Gửi trao đổi":complaintActions[activeAction!]}</button>
              {!creating&&activeAction!=="COMMENT"&&actions.includes("COMMENT")&&<button type="button" className={button} disabled={busy} onClick={()=>setChosenAction("COMMENT")}>Quay lại trao đổi</button>}
            </div>
            {!creating&&activeAction==="COMMENT"&&<div className="flex flex-wrap gap-3 text-xs">{actions.filter(a=>a!=="COMMENT").map(a=><button key={a} type="button" disabled={busy||files.length>0} className="text-primary underline disabled:opacity-50" onClick={()=>setChosenAction(a)}>{complaintActions[a]}</button>)}</div>}
          </div>}
          {!creating&&!current&&!loading&&!error&&<p className="py-5 text-center text-muted-foreground">Chưa có hồ sơ khiếu nại. Chọn “Mở khiếu nại mới” để gửi thông tin.</p>}
        </div>
      </>}
    </dialog>
  </section>;
}
