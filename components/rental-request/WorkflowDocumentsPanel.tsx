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
import { PolicyNotice } from "@/components/common/PolicyDialog";
const button="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";
// agreementId (from a signing notice) selects that exact document, validated only against the viewer's own authorized list.
export default function WorkflowDocumentsPanel({rentalRequestId,kind,data,agreementId,onUpdated}:{rentalRequestId:string;kind:WorkflowKind;data:RentalWorkflow;agreementId?:string;onUpdated:()=>Promise<unknown>|void}){
  const [rows,setRows]=useState<WorkflowDocument[]>([]),[loaded,setLoaded]=useState(false),[selected,setSelected]=useState(agreementId??"");
  const [detail,setDetail]=useState<{id:string;contract:ContractResponse;state:SignatureStateResponse;documents:ContractDocumentResponse[]}|null>(null);
  const [error,setError]=useState(""),[preview,setPreview]=useState<{document:ContractDocumentResponse;portalContainer:Element|null}|null>(null);
  const mounted=useRef(true),inflight=useRef<Promise<void>|null>(null),dirty=useRef(false),focusedFor=useRef<string|null>(null),box=useRef<HTMLElement>(null);
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
  useEffect(()=>{if(seen.current===agreementId)return;seen.current=agreementId;setSelected(agreementId??"");if(agreementId){setLoaded(false);void load();}},[agreementId,load]);
  useAgreementChangeSync(id=>!id||id===agreementId||rows.some(r=>r.signingContractId===id),async()=>{await load();if(mounted.current)await onUpdated();});
  useEffect(()=>{if(!currentId)return;let active=true;const id=currentId;void Promise.all([contractService.getContract(id),contractService.getSignatureState(id),contractService.getDocuments(id)]).then(([contract,state,documents])=>{if(active)setDetail({id,contract,state,documents});}).catch(e=>{if(active)setError(getApiErrorMessage(e,"Chưa đọc được PDF/trạng thái ký."));});return()=>{active=false;};},[currentId,rows]);
  const ready=detail?.id===current?.signingContractId?detail:null;
  // Landing focus: once per requested document, only after its details loaded, and never while the viewer is typing.
  useEffect(()=>{
    if(!agreementId||ready?.id!==agreementId||focusedFor.current===agreementId)return;
    focusedFor.current=agreementId;
    if(document.activeElement?.matches?.("input,textarea,select,[contenteditable='true']"))return;
    box.current?.scrollIntoView({behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});box.current?.focus({preventScroll:true});
  },[agreementId,ready?.id]);
  const pdf=ready?.documents.find(d=>d.status==="READY"&&d.purpose==="SIGNED_FINAL")??ready?.documents.find(d=>d.status==="READY"&&d.purpose==="SIGNED_LANDLORD")??ready?.documents.find(d=>d.status==="READY"&&d.documentType==="PDF");
  async function downloadWord(document:ContractDocumentResponse){
    const tab=window.open("about:blank","_blank");if(!tab){toast.error("Cho phép mở cửa sổ để tải Word phụ lục.");return;}tab.opener=null;
    try{const fresh=await contractService.getDocument(document.id);if(fresh.id!==document.id||fresh.contractId!==document.contractId||fresh.documentType!=="DOCX"||fresh.purpose!=="OFFICIAL"||fresh.status!=="READY"||!fresh.downloadUrl)throw new Error("Chưa tải được đúng Word phụ lục.");tab.location.href=fresh.downloadUrl;}
    catch(e){tab.close();toast.error(getApiErrorMessage(e,"Không tải được Word phụ lục."));}
  }
  const signingAllowed=data.status==="APPROVED"&&!!current?.current&&!current.signedAt;
  const word=ready?.documents.find(d=>d.status==="READY"&&d.purpose==="OFFICIAL"&&d.documentType==="DOCX");
  return <section ref={box} tabIndex={-1} aria-label="Văn bản thỏa thuận và chữ ký" className="space-y-3 rounded-lg border p-3 text-xs"><h3 className="font-semibold">Phụ lục điều chỉnh thời hạn & chữ ký SmartCA</h3>
    <PolicyNotice tone="neutral" title="Phụ lục điều chỉnh thời hạn" summary="Chỉ đủ hai chữ ký được kiểm chứng mới cập nhật hạn thuê.">
      <p>Phụ lục được điền từ mẫu Word và điều khoản hợp đồng đang áp dụng, ghi rõ thời hạn cũ và thời hạn mới. Chủ nhà ký trước, người thuê ký sau trên cùng PDF. Chỉ đủ hai chữ ký được kiểm chứng mới cập nhật hạn thuê; HĐ gốc giữ nguyên. Chữ ký không xác nhận đã bàn giao hoặc nhận tiền.</p>
    </PolicyNotice>
    {error&&<p role="alert" className="text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={()=>void load()}>Tải lại văn bản</button></div>
    {requestedMissing&&<p role="status">Không tìm thấy văn bản được chọn hoặc bạn không có quyền xem. Chưa có văn bản nào được tự chọn thay thế.</p>}
    {(rows.length>1||requestedMissing&&rows.length>0)&&<div className="flex flex-wrap gap-2" aria-label="Chọn phiên bản văn bản">{rows.map((row,index)=><button key={row.signingContractId} type="button" className={`${button} ${current?.signingContractId===row.signingContractId?"border-primary bg-primary/5 text-primary":""}`} aria-pressed={current?.signingContractId===row.signingContractId} onClick={()=>setSelected(row.signingContractId)}>Bản {rows.length-index} · {row.current?"hiện tại":"lưu trữ"} · {row.signedAt?"đã ký đủ":"chưa ký đủ"}</button>)}</div>}
    {current&&!current.current&&<p>Bản cũ chỉ để tra cứu; không ký hoặc áp dụng thay cho nội dung mới.</p>}
    {word&&<button type="button" className={button} onClick={()=>void downloadWord(word)}>Tải Word phụ lục</button>}
    {pdf&&<button type="button" className={button} onClick={event=>setPreview({document:pdf,portalContainer:event.currentTarget.closest("dialog")})}>Xem / tải PDF {pdf.purpose==="SIGNED_FINAL"?"đã ký đủ":"nguồn"}</button>}
    {ready&&<SmartCaSignaturePanel contract={ready.contract} state={ready.state} isLandlord={data.role==="LANDLORD"} isTenant={data.role==="TENANT"} hasReadyPdf={!!pdf} signingAllowed={signingAllowed} blockedReason={!current?.current?"Văn bản cũ không còn khớp nguồn.":data.status!=="APPROVED"?"Phụ lục chỉ được ký khi chủ nhà đã đồng ý và hồ sơ đang chờ ký.":current.signedAt?"Phụ lục này đã ký đủ; chỉ để đối chiếu.":undefined} onUpdated={async()=>{await load();await onUpdated();}}/>}
    <ContractPdfViewerModal isOpen={!!preview} document={preview?.document??null} portalContainer={preview?.portalContainer} onClose={()=>setPreview(null)}/>
  </section>;
}
