"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Download, Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import { contractDetailPath } from "@/lib/contract-routes";
import { amendmentDocumentStatus, amendmentDocumentTitle, appliedAmendment, closedDocumentProposals, concreteProposals, documentDate, documentStage, documentTime, primaryDocument, signedAmendment, sortedDocuments, verifiedSignatureTimes } from "@/lib/contract-document-history";
import type { ContractDocumentResponse, ContractResponse, SignatureRequestResponse } from "@/types/contract.type";
import type { AmendmentProposal } from "@/types/contract-amendment.type";
import { useAmendmentWorkspace } from "./ContractAmendmentWorkspace";
import { AmendmentComparisonTable } from "./ContractAmendmentPanel";
import ContractPdfViewerModal from "./ContractPdfViewerModal";

const smallButton = "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50";
type Action = (doc: ContractDocumentResponse, download?: boolean) => Promise<void>;
function fileSize(bytes?: number | null) {
  return bytes == null ? "Chưa có dung lượng" : bytes < 1024 ? bytes+" B" : bytes < 1048576 ? (bytes/1024).toLocaleString("vi-VN",{maximumFractionDigits:1})+" KB" : (bytes/1048576).toLocaleString("vi-VN",{maximumFractionDigits:1})+" MB";
}
function FileActions({ doc, action, busy, main = false }: { doc: ContractDocumentResponse; action: Action; busy: boolean; main?: boolean }) {
  if (doc.status !== "READY" && doc.status !== "STALE") return <span className="text-xs text-muted-foreground">{doc.status === "FAILED" ? "Tạo tệp chưa thành công" : "Đang tạo tài liệu…"}</span>;
  if (!doc.storageObjectId && !doc.viewUrl && !doc.downloadUrl) return <span className="text-xs text-muted-foreground">Chưa có tệp để mở</span>;
  return <div className="flex shrink-0 flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void action(doc)} className={smallButton}><Eye className="h-3.5 w-3.5"/>{main ? doc.purpose==="SIGNED_FINAL" ? "Xem bản đã ký" : "Xem bản đang soạn / ký" : "Xem"}</button><button type="button" disabled={busy} onClick={() => void action(doc,true)} className={smallButton+(main ? " border-primary bg-primary text-primary-foreground" : "")}><Download className="h-3.5 w-3.5"/>{main && doc.purpose==="SIGNED_FINAL" ? "Tải PDF đã ký" : "Tải về"}</button></div>;
}
function DocumentFiles({ rows, signed, revisionId, busy, action, children }: { rows: ContractDocumentResponse[]; signed: boolean; revisionId?: string | null; busy: boolean; action: Action; children?:ReactNode }) {
  const primary=primaryDocument(rows,signed,revisionId);
  return <div className="space-y-3">
    {primary ? <FileActions doc={primary} action={action} busy={busy} main/> : <p className="text-xs text-muted-foreground">{signed ? "Chưa tải được bản PDF ký đủ hai bên. Các tệp còn lại không thay thế bản ký hoàn chỉnh." : "Chưa có bản PDF hiện tại. Các bản cũ được giữ trong lịch sử tệp."}</p>}
    <details className="rounded-xl border bg-muted/15"><summary className="cursor-pointer p-3 text-xs font-semibold">Lịch sử tệp ({rows.length})</summary><div className="divide-y border-t px-3">
      {sortedDocuments(rows).map(doc=><div key={doc.id} className="flex min-w-0 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 space-y-1"><p className="text-xs font-medium">{documentStage(doc)}{doc.id===primary?.id && <span className="ml-2 text-primary">· Bản hiển thị bên ngoài</span>}</p><p className="break-all text-xs text-muted-foreground">{doc.fileName || "Tài liệu "+doc.documentType}</p><p className="text-xs text-muted-foreground">{fileSize(doc.fileSize)} · Tạo lúc {documentTime(doc.generatedAt)}</p>{doc.status==="STALE"&&<p className="text-xs text-amber-700 dark:text-amber-300">Bản soạn thảo cũ · Không dùng để ký hiện tại</p>}</div><FileActions doc={doc} action={action} busy={busy}/></div>)}
      {!rows.length&&<p className="py-3 text-xs text-muted-foreground">Chưa có tệp được ghi nhận.</p>}
    </div>{children&&<div className="border-t p-3">{children}</div>}</details>
  </div>;
}
function SigningHistory({ contractId, revisionId, proposal, rootSignedAt }: { contractId: string; revisionId?: string; proposal?: AmendmentProposal; rootSignedAt?: string | null }) {
  const [open,setOpen]=useState(false),[retry,setRetry]=useState(0);
  const [state,setState]=useState<{rows:SignatureRequestResponse[];error?:string;loading:boolean}>({rows:[],loading:false});
  useEffect(()=>{
    if(!open)return;
    let cancelled=false;
    contractService.getSignatureState(contractId).then(result=>{if(!cancelled)setState({rows:result.allRequests??[],loading:false});})
      .catch(()=>{if(!cancelled)setState({rows:[],error:"Không tải được các mốc ký. Không suy đoán chữ ký từ tên tệp.",loading:false});});
    return ()=>{cancelled=true;};
  },[open,retry,contractId,revisionId]);
  const times=verifiedSignatureTimes(state.rows,revisionId);
  const event=(label:string,value?:string|null)=><li className="border-l-2 pl-3"><p className="font-medium">{label}</p><p className="text-muted-foreground">{documentTime(value)}</p></li>;
  return <details onToggle={e=>{const next=e.currentTarget.open;setOpen(next);if(next)setState(s=>({...s,loading:true}));}}><summary className="cursor-pointer text-xs font-semibold text-primary">Quá trình ghi nhận và ký</summary><div className="mt-3 space-y-3 text-xs">
    <ol className="space-y-3">
      {proposal&&event("Gửi đề xuất điều chỉnh",proposal.submittedAt)}
      {proposal?.decidedAt&&event(closedDocumentProposals.has(proposal.status)?amendmentDocumentStatus(proposal,proposal.decidedAt):"Hai bên thống nhất nội dung",proposal.decidedAt)}
      {times.landlord&&event("Chủ nhà đã ký số",times.landlord)}
      {times.tenant&&event("Người thuê đã ký số",times.tenant)}
      {(proposal?.signedAt||rootSignedAt)&&event("Hoàn tất ký đủ hai bên",proposal?.signedAt??rootSignedAt)}
      {proposal?.appliedAt&&event("Ghi nhận áp dụng điều chỉnh",proposal.appliedAt)}
    </ol>
    {state.loading&&<p>Đang tải mốc ký…</p>}
    {state.error&&<p role="alert">{state.error} <button type="button" onClick={()=>{setState(s=>({...s,loading:true}));setRetry(n=>n+1);}} className="underline">Thử lại mốc ký</button></p>}
    {!state.loading&&!state.error&&!times.landlord&&!times.tenant&&<p className="text-muted-foreground">Không có mốc chữ ký số đã xác minh cho phiên bản tài liệu này.</p>}
  </div></details>;
}
function DocumentCard({ title, status, children }: { title:string;status:string;children:ReactNode }) {
  return <article className="min-w-0 space-y-3 rounded-xl border bg-background p-4" aria-label={title}><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-semibold [overflow-wrap:anywhere]">{title}</h3><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{status}</span></div>{children}</article>;
}
function AmendmentDocumentCard({ proposal:p, number, serverNow, action, busy }: { proposal:AmendmentProposal;number?:number;serverNow:string;action:Action;busy:boolean }) {
  const w=useAmendmentWorkspace();
  const [files,setFiles]=useState<ContractDocumentResponse[]|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  const agreementId=p.agreementContractId;
  useEffect(()=>{
    if(!agreementId)return;
    let cancelled=false;
    contractService.getDocuments(agreementId).then(rows=>{if(!cancelled){setFiles(rows.filter(d=>d.contractId===agreementId));setError(false);}})
      .catch(()=>{if(!cancelled)setError(true);});
    return ()=>{cancelled=true;};
  },[agreementId,p.agreementStatus,p.signedAt,retry]);
  const signed=signedAmendment(p),applied=appliedAmendment(p,serverNow);
  const title=(number ? "Điều chỉnh lần "+number : "Đề xuất điều chỉnh")+" — "+amendmentDocumentTitle(p);
  const main=primaryDocument(files??[],signed);
  return <DocumentCard title={title} status={amendmentDocumentStatus(p,serverNow)}>
    <p className="text-xs text-muted-foreground">{signed ? "Ký đủ: "+documentTime(p.signedAt)+" · " : ""}{p.immediateEffect ? "Áp dụng sau khi ký đủ và được hệ thống ghi nhận" : (applied?"Áp dụng từ":"Dự kiến áp dụng")+": "+documentDate(p.effectiveOn)}</p>
    {!applied&&<p className="text-xs text-muted-foreground">{closedDocumentProposals.has(p.status)?"Đề xuất này không thay đổi điều khoản của hợp đồng.":"Điều khoản đang áp dụng chưa thay đổi bởi đề xuất này."}</p>}
    <details><summary className="cursor-pointer text-xs font-semibold text-primary">Xem thay đổi ({p.comparison.length} nội dung)</summary><div className="mt-3 space-y-3"><p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">Lý do: {p.reason}</p><AmendmentComparisonTable rows={p.comparison} beforeLabel="Trước điều chỉnh" afterLabel={signed?"Sau điều chỉnh":"Nội dung đề xuất"}/>{p.responseNote&&<p className="whitespace-pre-wrap break-words text-xs">Phản hồi: {p.responseNote}</p>}{agreementId&&<SigningHistory key={p.id+":"+p.agreementStatus+":"+(p.signedAt??"")} contractId={agreementId} revisionId={main?.revisionId} proposal={p}/>}</div></details>
    {agreementId&&<>
      {error?<p role="alert" className="text-xs">Không tải được lịch sử tệp phụ lục. <button type="button" onClick={()=>setRetry(n=>n+1)} className="text-primary underline">Tải lại tệp phụ lục</button></p>:files===null?<p className="flex items-center gap-2 text-xs"><Loader2 className="h-3.5 w-3.5 animate-spin"/>Đang tải tệp phụ lục…</p>:<DocumentFiles rows={files} signed={signed} busy={busy} action={action}/>}
      {w&&p.status==="APPROVED"&&<Link href={contractDetailPath(w.perspective,agreementId)} className="inline-block text-xs font-semibold text-primary underline">Mở phụ lục để xem và ký</Link>}
    </>}
    {!agreementId&&<p className="text-xs text-muted-foreground">Chưa tạo văn bản ký. Đề xuất và phản hồi được giữ trong lịch sử điều chỉnh.</p>}
    {w?.perspective==="landlord"&&p.canReplace&&!w.editing&&<button type="button" disabled={w.busy} onClick={()=>w.start(p,w.savedDraft?.previousProposalId===p.id?w.savedDraft:null)} className={smallButton}>Chỉnh lại phụ lục</button>}
  </DocumentCard>;
}
export default function ContractDocumentSection({documents,contract}:{documents:ContractDocumentResponse[];contract:ContractResponse}) {
  const w=useAmendmentWorkspace();
  const [previewDoc,setPreviewDoc]=useState<ContractDocumentResponse|null>(null),[busy,setBusy]=useState(false);
  const proposals=concreteProposals(w?.data?.proposals??[]);
  const serverNow=w?.data?.serverNow??contract.updatedAt;
  const signed=proposals.filter(signedAmendment);
  const applied=proposals.filter(p=>appliedAmendment(p,serverNow));
  const closed=proposals.filter(p=>closedDocumentProposals.has(p.status));
  const visible=proposals.filter(p=>!closedDocumentProposals.has(p.status));
  const rootRows=documents.filter(d=>d.contractId===contract.id);
  const rootSigned=Boolean(contract.signedAt);
  const action:Action=async(doc,download=false)=>{
    if(busy)return;
    const tab=download?window.open("about:blank","_blank"):null;
    if(download&&!tab){toast.error("Trình duyệt chặn cửa sổ tải về. Hãy cho phép mở cửa sổ rồi thử lại.");return;}
    if(tab)tab.opener=null;
    setBusy(true);
    try{
      // Refresh short-lived URLs through the authorized API, never reuse a stale signed URL.
      const fresh=await contractService.getDocument(doc.id);
      if(!fresh||fresh.id!==doc.id||fresh.contractId!==doc.contractId||!["READY","STALE"].includes(fresh.status)||!(download?fresh.downloadUrl:fresh.viewUrl||fresh.downloadUrl))throw new Error("Không mở được tệp. Vui lòng tải lại hồ sơ hoặc thử lại.");
      if(tab)tab.location.href=fresh.downloadUrl!;else setPreviewDoc(fresh);
    }catch(e){tab?.close();toast.error(e instanceof Error?e.message:"Không mở được tài liệu.");}finally{setBusy(false);}
  };
  const title=contract.agreementKind==="AMENDMENT"?"Phụ lục đang xem":contract.agreementKind==="RENEWAL"?"Văn bản gia hạn đang xem":"Hợp đồng gốc";
  return <><section id="contract-document-history" className="scroll-mt-24 min-w-0 space-y-4 rounded-2xl border bg-card p-4 sm:p-5" aria-label="Hợp đồng và các lần điều chỉnh">
    <h2 className="flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-primary"/>Hợp đồng &amp; các lần điều chỉnh</h2>
    {!contract.parentContractId&&w?.data&&<p className="rounded-xl bg-primary/5 p-3 text-xs text-muted-foreground">{contract.status==="ACTIVE"?applied.length?"Điều khoản hiện tại theo hợp đồng gốc và "+applied.length+" lần điều chỉnh đã áp dụng. Các mục không thay đổi vẫn theo văn bản trước đó.":"Chưa có phụ lục nào được áp dụng; điều khoản hiện tại theo hợp đồng gốc.":"Hồ sơ lưu trữ: các mốc dưới đây ghi lại những điều chỉnh đã được áp dụng, không có nghĩa hợp đồng vẫn đang có hiệu lực."}</p>}
    <DocumentCard title={title} status={rootSigned?"Đã ký đủ hai bên":"Chưa hoàn tất ký"}>
      <p className="text-xs text-muted-foreground">{rootSigned?"Hoàn tất ký: "+documentTime(contract.signedAt):"Bản soạn thảo / đang ký chưa phải bản ký hoàn chỉnh."}</p>
      {applied.length>0&&<p className="text-xs">Hợp đồng gốc được giữ nguyên; đọc cùng các điều chỉnh đã áp dụng bên dưới.</p>}
      <DocumentFiles rows={rootRows} signed={rootSigned} revisionId={contract.currentRevisionId} busy={busy} action={action}>
        <SigningHistory contractId={contract.id} revisionId={contract.currentRevisionId??undefined} rootSignedAt={contract.signedAt}/>
      </DocumentFiles>
    </DocumentCard>
    {w?.error&&<p role="alert" className="text-xs">Chưa tải được lịch sử điều chỉnh; không thể xác định đầy đủ các phụ lục. <button type="button" onClick={()=>void w.load()} className="text-primary underline">Tải lại lịch sử điều chỉnh</button></p>}
    {!contract.parentContractId&&["ACTIVE","EXPIRED","CLOSED","TERMINATED"].includes(contract.status)&&!w?.data&&!w?.error&&<p className="text-xs text-muted-foreground">Đang kiểm tra lịch sử điều chỉnh…</p>}
    {visible.map(p=><AmendmentDocumentCard key={p.id} proposal={p} number={signed.findIndex(s=>s.id===p.id)+1||undefined} serverNow={serverNow} action={action} busy={busy}/>)}
    {closed.length>0&&<details><summary className="cursor-pointer text-xs font-semibold">Đề xuất không được áp dụng ({closed.length})</summary><div className="mt-3 space-y-3">{closed.map(p=><AmendmentDocumentCard key={p.id} proposal={p} number={signed.findIndex(s=>s.id===p.id)+1||undefined} serverNow={serverNow} action={action} busy={busy}/>)}</div></details>}
    <p className="text-xs text-muted-foreground">Bản ký và các tệp cũ không bị ghi đè. Nội dung trên giao diện là bản tra cứu; không thay thế PDF đã ký của từng văn bản.</p>
  </section><ContractPdfViewerModal isOpen={Boolean(previewDoc)} document={previewDoc} onClose={()=>setPreviewDoc(null)}/></>;
}
