"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {toast} from "sonner";
import {rentalWorkflowService as service} from "@/services/rental-workflow.service";
import {contractService} from "@/services/contract.service";
import SmartCaSignaturePanel from "@/components/contract/detail/SmartCaSignaturePanel";
import ContractPdfViewerModal from "@/components/contract/detail/ContractPdfViewerModal";
import {getApiErrorMessage} from "@/utils/apiError";
import type {ContractResponse,ContractDocumentResponse,SignatureStateResponse} from "@/types/contract.type";
import type {RentalWorkflow,WorkflowDocument,WorkflowKind} from "@/types/rental-workflow.type";
const button="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";
export default function WorkflowDocumentsPanel({rentalRequestId,kind,data,onUpdated}:{rentalRequestId:string;kind:WorkflowKind;data:RentalWorkflow;onUpdated:()=>Promise<unknown>|void}){
  const [rows,setRows]=useState<WorkflowDocument[]>([]),[selected,setSelected]=useState("");
  const [detail,setDetail]=useState<{id:string;contract:ContractResponse;state:SignatureStateResponse;documents:ContractDocumentResponse[]}|null>(null);
  const [error,setError]=useState(""),[busy,setBusy]=useState(false),[preview,setPreview]=useState<ContractDocumentResponse|null>(null);
  const mounted=useRef(true),sequence=useRef(0),mutex=useRef(false);
  const current=rows.find(r=>r.signingContractId===selected)??rows.find(r=>r.current)??rows[0];
  const currentId=current?.signingContractId;
  const load=useCallback(async()=>{const n=++sequence.current;try{const list=await service.documents(rentalRequestId,kind);if(mounted.current&&n===sequence.current){setRows(list);setError("");}}catch(e){if(mounted.current&&n===sequence.current)setError(getApiErrorMessage(e,"Chưa tải được văn bản nguồn."));}},[rentalRequestId,kind]);
  useEffect(()=>{const active=mounted,requests=sequence;active.current=true;void load();return()=>{active.current=false;requests.current++;};},[load,data.revision]);
  useEffect(()=>{if(!currentId)return;let active=true;const id=currentId;setDetail(null);void Promise.all([contractService.getContract(id),contractService.getSignatureState(id),contractService.getDocuments(id)]).then(([contract,state,documents])=>{if(active)setDetail({id,contract,state,documents});}).catch(e=>{if(active)setError(getApiErrorMessage(e,"Chưa đọc được PDF/trạng thái ký."));});return()=>{active=false;};},[currentId,rows]);
  async function prepare(){if(mutex.current)return;mutex.current=true;setBusy(true);try{const doc=await service.prepareDocument(rentalRequestId,kind,data.revision);if(!mounted.current)return;setSelected(doc.signingContractId);await load();}catch(e){if(mounted.current){setError(getApiErrorMessage(e,"Chưa tạo được văn bản; hãy tải lại và đối chiếu phiên bản."));toast.error(getApiErrorMessage(e,"Chưa tạo được PDF."));}}finally{mutex.current=false;if(mounted.current)setBusy(false);}}
  const ready=detail?.id===current?.signingContractId?detail:null;
  const pdf=ready?.documents.find(d=>d.status==="READY"&&d.purpose==="SIGNED_FINAL")??ready?.documents.find(d=>d.status==="READY"&&d.purpose==="SIGNED_LANDLORD")??ready?.documents.find(d=>d.status==="READY"&&d.documentType==="PDF");
  return <details className="space-y-3 rounded-lg border p-3 text-xs"><summary className="cursor-pointer font-semibold">PDF & chữ ký SmartCA riêng</summary>
    <p>Văn bản riêng gắn đúng bản biên bản/thỏa thuận. HĐ thuê/cọc gốc được giữ nguyên. Ký văn bản không xác nhận tiền đã chuyển/nhận.</p>
    {error&&<p role="alert" className="text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-2">{["PROPOSED","AGREED","RETURNED","COMPLETED"].includes(data.status)&&data.depositObligation!=="COMPLETED"&&<button type="button" disabled={busy} className={button} onClick={()=>void prepare()}>Tạo / mở PDF của bản đang xem</button>}<button type="button" className={button} disabled={busy} onClick={()=>void load()}>Tải lại văn bản</button></div>
    {rows.length>1&&<label>Chọn bản văn bản<select className="ml-2 rounded border p-2" value={current?.signingContractId??""} onChange={e=>setSelected(e.target.value)}>{rows.map((r,i)=><option key={r.signingContractId} value={r.signingContractId}>Văn bản {rows.length-i} · {r.current?"khớp bản hiện tại":"bản cũ"} · {r.signedAt?"đã ký đủ":"chưa ký đủ"}</option>)}</select></label>}
    {current&&!current.current&&<p>Bản cũ chỉ để tra cứu; không ký hoặc áp dụng thay cho nội dung mới.</p>}
    {pdf&&<button type="button" className={button} onClick={()=>setPreview(pdf)}>Xem / tải PDF {pdf.purpose==="SIGNED_FINAL"?"đã ký đủ":"nguồn"}</button>}
    {ready&&<SmartCaSignaturePanel contract={ready.contract} state={ready.state} isLandlord={data.role==="LANDLORD"} isTenant={data.role==="TENANT"} hasReadyPdf={!!pdf} signingAllowed={!!current?.current} blockedReason={current?.current?undefined:"Văn bản cũ không còn khớp nguồn."} onUpdated={async()=>{await load();await onUpdated();}}/>}
    <ContractPdfViewerModal isOpen={!!preview} document={preview} onClose={()=>setPreview(null)}/>
  </details>;
}
