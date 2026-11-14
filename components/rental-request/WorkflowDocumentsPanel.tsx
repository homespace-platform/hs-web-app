"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {toast} from "sonner";
import {rentalWorkflowService as service} from "@/services/rental-workflow.service";
import {contractService} from "@/services/contract.service";
import SmartCaSignaturePanel from "@/components/contract/detail/SmartCaSignaturePanel";
import ContractPdfViewerModal from "@/components/contract/detail/ContractPdfViewerModal";
import {useAgreementChangeSync} from "@/hooks/useAgreementChangeSync";
import {getApiErrorMessage} from "@/utils/apiError";
import type {ContractResponse,ContractDocumentResponse,SignatureStateResponse} from "@/types/contract.type";
import type {RentalWorkflow,WorkflowDocument,WorkflowKind} from "@/types/rental-workflow.type";
const button="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";
// agreementId (from a signing notice) selects that exact document, validated only against the viewer's own authorized list.
export default function WorkflowDocumentsPanel({rentalRequestId,kind,data,agreementId,onUpdated}:{rentalRequestId:string;kind:WorkflowKind;data:RentalWorkflow;agreementId?:string;onUpdated:()=>Promise<unknown>|void}){
  const [rows,setRows]=useState<WorkflowDocument[]>([]),[loaded,setLoaded]=useState(false),[selected,setSelected]=useState(agreementId??""),[open,setOpen]=useState(!!agreementId);
  const [detail,setDetail]=useState<{id:string;contract:ContractResponse;state:SignatureStateResponse;documents:ContractDocumentResponse[]}|null>(null);
  const [error,setError]=useState(""),[busy,setBusy]=useState(false),[preview,setPreview]=useState<ContractDocumentResponse|null>(null);
  const mounted=useRef(true),mutex=useRef(false),inflight=useRef<Promise<void>|null>(null),dirty=useRef(false),focusedFor=useRef<string|null>(null),box=useRef<HTMLDetailsElement>(null);
  // An unknown/stale requested document never silently becomes a different one: it stays neutral until the viewer picks one.
  const requestedMissing=!!agreementId&&selected===agreementId&&loaded&&!rows.some(r=>r.signingContractId===agreementId);
  const current=requestedMissing?undefined:rows.find(r=>r.signingContractId===selected)??rows.find(r=>r.current)??rows[0];
  const currentId=current?.signingContractId;
  // One list GET at a time; callers arriving meanwhile share it and get one fresh follow-up, even after a failed GET.
  const load=useCallback(():Promise<void>=>{
    if(!mounted.current)return Promise.resolve();
    if(inflight.current){dirty.current=true;return inflight.current;}
    let done=false;
    const run=(async()=>{try{for(;;){
      dirty.current=false;
      try{const list=await service.documents(rentalRequestId,kind);if(!mounted.current)return;setRows(list);setError("");if(!dirty.current)setLoaded(true);}
      catch(e){if(!mounted.current)return;setError(getApiErrorMessage(e,"Chưa tải được văn bản nguồn."));}
      if(!dirty.current)return;
    }}finally{done=true;inflight.current=null;}})();
    if(!done)inflight.current=run;
    return run;
  },[rentalRequestId,kind]);
  useEffect(()=>{const active=mounted;active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{void load();},[load,data.revision]);
  // A new notice for another document of the same page: reset to it and re-read the (authorized, per-request) list once.
  const seen=useRef(agreementId);
  useEffect(()=>{if(seen.current===agreementId)return;seen.current=agreementId;setSelected(agreementId??"");if(agreementId){setOpen(true);setLoaded(false);void load();}},[agreementId,load]);
  useAgreementChangeSync(id=>!id||id===agreementId||rows.some(r=>r.signingContractId===id),async()=>{await load();if(mounted.current)await onUpdated();});
  useEffect(()=>{if(!currentId)return;let active=true;const id=currentId;void Promise.all([contractService.getContract(id),contractService.getSignatureState(id),contractService.getDocuments(id)]).then(([contract,state,documents])=>{if(active)setDetail({id,contract,state,documents});}).catch(e=>{if(active)setError(getApiErrorMessage(e,"Chưa đọc được PDF/trạng thái ký."));});return()=>{active=false;};},[currentId,rows]);
  async function prepare(){if(mutex.current)return;mutex.current=true;setBusy(true);try{const doc=await service.prepareDocument(rentalRequestId,kind,data.revision);if(!mounted.current)return;setSelected(doc.signingContractId);await load();}catch(e){if(mounted.current){setError(getApiErrorMessage(e,"Chưa tạo được văn bản; hãy tải lại và đối chiếu phiên bản."));toast.error(getApiErrorMessage(e,"Chưa tạo được PDF."));}}finally{mutex.current=false;if(mounted.current)setBusy(false);}}
  const ready=detail?.id===current?.signingContractId?detail:null;
  // Landing focus: once per requested document, only after its details loaded, and never while the viewer is typing.
  useEffect(()=>{
    if(!agreementId||ready?.id!==agreementId||focusedFor.current===agreementId)return;
    focusedFor.current=agreementId;
    if(document.activeElement?.matches?.("input,textarea,select,[contenteditable='true']"))return;
    box.current?.scrollIntoView({behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});box.current?.focus({preventScroll:true});
  },[agreementId,ready?.id]);
  const pdf=ready?.documents.find(d=>d.status==="READY"&&d.purpose==="SIGNED_FINAL")??ready?.documents.find(d=>d.status==="READY"&&d.purpose==="SIGNED_LANDLORD")??ready?.documents.find(d=>d.status==="READY"&&d.documentType==="PDF");
  return <details ref={box} tabIndex={-1} open={open} onToggle={e=>setOpen(e.currentTarget.open)} className="space-y-3 rounded-lg border p-3 text-xs"><summary className="cursor-pointer font-semibold">PDF & chữ ký SmartCA riêng</summary>
    <p>Văn bản riêng gắn đúng bản biên bản/thỏa thuận. HĐ thuê/cọc gốc được giữ nguyên. Ký văn bản không xác nhận tiền đã chuyển/nhận.</p>
    {error&&<p role="alert" className="text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-2">{["PROPOSED","AGREED","RETURNED","COMPLETED"].includes(data.status)&&data.depositObligation!=="COMPLETED"&&<button type="button" disabled={busy} className={button} onClick={()=>void prepare()}>Tạo / mở PDF của bản đang xem</button>}<button type="button" className={button} disabled={busy} onClick={()=>void load()}>Tải lại văn bản</button></div>
    {requestedMissing&&<p role="status">Không tìm thấy văn bản được chọn hoặc bạn không có quyền xem. Chưa có văn bản nào được tự chọn thay thế.</p>}
    {(rows.length>1||requestedMissing&&rows.length>0)&&<label>Chọn bản văn bản<select className="ml-2 rounded border p-2" value={current?.signingContractId??""} onChange={e=>setSelected(e.target.value)}>{!current&&<option value="" disabled>Chọn văn bản</option>}{rows.map((r,i)=><option key={r.signingContractId} value={r.signingContractId}>Văn bản {rows.length-i} · {r.current?"khớp bản hiện tại":"bản cũ"} · {r.signedAt?"đã ký đủ":"chưa ký đủ"}</option>)}</select></label>}
    {current&&!current.current&&<p>Bản cũ chỉ để tra cứu; không ký hoặc áp dụng thay cho nội dung mới.</p>}
    {pdf&&<button type="button" className={button} onClick={()=>setPreview(pdf)}>Xem / tải PDF {pdf.purpose==="SIGNED_FINAL"?"đã ký đủ":"nguồn"}</button>}
    {ready&&<SmartCaSignaturePanel contract={ready.contract} state={ready.state} isLandlord={data.role==="LANDLORD"} isTenant={data.role==="TENANT"} hasReadyPdf={!!pdf} signingAllowed={!!current?.current} blockedReason={current?.current?undefined:"Văn bản cũ không còn khớp nguồn."} onUpdated={async()=>{await load();await onUpdated();}}/>}
    <ContractPdfViewerModal isOpen={!!preview} document={preview} onClose={()=>setPreview(null)}/>
  </details>;
}
