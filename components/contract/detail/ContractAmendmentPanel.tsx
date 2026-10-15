"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { FilePenLine, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { contractAmendmentService as api } from "@/services/contract-amendment.service";
import storageService from "@/services/storage.service";
import AmendmentEffectiveDatePicker from "./AmendmentEffectiveDatePicker";
import { contractDetailPath } from "@/lib/contract-routes";
import { getApiErrorMessage } from "@/utils/apiError";
import Workspace, { useAmendmentWorkspace, activeAmendment, amendmentInput as input, amendmentButton as button, amendmentMoney as money, amendmentDate as date, amendmentTime as time } from "./ContractAmendmentWorkspace";
import type { AmendmentComparison, AmendmentPayload, AmendmentProposal, AmendmentStatus } from "@/types/contract-amendment.type";

const labels: Record<AmendmentStatus,string> = {
  REQUESTED:"Chờ người thuê duyệt nội dung", CHANGES_REQUESTED:"Người thuê yêu cầu chỉnh lại", APPROVED:"Đã thống nhất · Chờ ký số", SCHEDULED:"Đã ký đủ · Chờ ngày áp dụng", APPLIED:"Đã áp dụng",
  REJECTED:"Đã từ chối", WITHDRAWN:"Đã rút đề xuất", EXPIRED:"Đã đóng vì hết hạn", SUPERSEDED:"Đã có phiên bản mới",
  TENANT_REQUESTED:"Người thuê đề nghị trao đổi", TENANT_ACCEPTED:"Chủ nhà đang soạn phụ lục", TENANT_REJECTED:"Chủ nhà đã từ chối yêu cầu", TENANT_EXPIRED:"Đã đóng · Không xử lý trong thời hạn", TENANT_FULFILLED:"Đã chuyển thành đề xuất phụ lục",
};
export function AmendmentComparisonTable({ rows, beforeLabel = "Đang áp dụng", afterLabel = "Đề xuất mới" }: { rows: AmendmentComparison[]; beforeLabel?: string; afterLabel?: string }) {
  const value = (r: AmendmentComparison, v: string) => {
    if (["rentAmount","financial.depositAmountValue","policies.latePaymentFeeAmount","policies.latePaymentFeeCap"].includes(r.field)&&/^\d+(\.\d+)?$/.test(v))return money(v);
    if(r.field==="policies.latePaymentFeeMode")return ({NONE:"Không phạt",FIXED_ONCE:"Phạt một lần",FIXED_PER_DAY:"Phạt theo ngày"} as Record<string,string>)[v]??v;
    if(r.field==="policies.latePaymentFeeGraceDays"&&v==="0")return "Không thêm ngày ân hạn sau deadline (quy tắc hệ thống)";
    return v;
  };
  return <><div className="space-y-3 sm:hidden">{rows.map(r => <article key={r.field} className="overflow-hidden rounded-xl border text-sm [overflow-wrap:anywhere]"><h4 className="bg-muted/30 px-3 py-2 font-semibold">{r.label}</h4><div className="p-3"><p className="mb-1 text-xs text-muted-foreground">{beforeLabel}</p><p className="whitespace-pre-wrap text-muted-foreground">{value(r,r.before)}</p></div><div className="border-t bg-primary/5 p-3"><p className="mb-1 text-xs font-medium text-primary">{afterLabel}</p><p className="whitespace-pre-wrap">{value(r,r.after)}</p></div></article>)}</div>
    <div className="hidden overflow-x-auto rounded-xl border sm:block"><table className="w-full table-fixed text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="w-1/5 p-3">Nội dung</th><th className="p-3">{beforeLabel}</th><th className="p-3">{afterLabel}</th></tr></thead><tbody>{rows.map(r => <tr key={r.field} className="border-t align-top"><th className="break-words p-3 font-medium">{r.label}</th><td className="whitespace-pre-wrap break-words p-3 text-muted-foreground">{value(r,r.before)}</td><td className="whitespace-pre-wrap break-words bg-primary/5 p-3">{value(r,r.after)}</td></tr>)}</tbody></table></div></>;
}
function Evidence({ ids }: { ids: string[] }) {
  return <div className="flex flex-wrap gap-3">{ids.map((id,i) => <button key={id} type="button" className="text-xs text-primary underline" onClick={async () => {
    const tab = window.open("about:blank","_blank"); if (tab) tab.opener = null;
    try { const url = await storageService.getViewUrl(id); if (tab) tab.location.href = url; }
    catch (e) { tab?.close(); toast.error(getApiErrorMessage(e,"Không mở được minh chứng.")); }
  }}>Minh chứng {i + 1} ↗</button>)}</div>;
}
type Props = { contractId: string; actorId: string; perspective: "landlord" | "tenant"; agreementId?: string };
function Modal({ title, description, children, footer, busy }: { title: string; description: string; children: ReactNode; footer: ReactNode; busy: boolean }) {
  return <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" /><Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl"><div className="flex items-start justify-between gap-3 border-b p-4 sm:p-5"><div><Dialog.Title className="text-lg font-bold">{title}</Dialog.Title><Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description></div><Dialog.Close disabled={busy} aria-label="Đóng cửa sổ" className="rounded-lg p-2"><X className="h-5 w-5" /></Dialog.Close></div><div className="space-y-4 overflow-y-auto p-4 sm:p-5">{children}</div><div className="flex flex-wrap justify-end gap-2 border-t p-4">{footer}</div></Dialog.Content></Dialog.Portal>;
}
export default function ContractAmendmentPanel(props: Props) {
  const workspace = useAmendmentWorkspace();
  return workspace?.contractId === props.contractId ? <Panel {...props} /> : <Workspace {...props}><Panel {...props} /></Workspace>;
}
function Panel({ agreementId }: Props) {
  const w = useAmendmentWorkspace()!;
  const [requestOpen,setRequestOpen] = useState(false), [message,setMessage] = useState("");
  const [requestFiles,setRequestFiles] = useState<File[]>([]), [requestToken,setRequestToken] = useState("");
  const [review,setReview] = useState<{ payload: AmendmentPayload; comparison: AmendmentComparison[] } | null>(null);
  const [view,setView] = useState<AmendmentProposal | null>(null), [consent,setConsent] = useState(false), [note,setNote] = useState("");
  const uploaded = useRef(new Map<File,string>());
  const { data, contractId, actorId, perspective } = w;
  const isOwner = perspective === "landlord";
  if (w.error) return <section className="rounded-xl border p-4 text-sm"><p role="alert">{w.error}</p><button type="button" onClick={() => void w.load()} className="mt-2 text-primary underline">Tải lại phụ lục</button></section>;
  if (!data) return <section className="flex gap-2 rounded-xl border p-4 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Đang tải phụ lục…</section>;
  const current = data.proposals.find(p => activeAmendment.has(p.status));
  const proposals = agreementId ? data.proposals.filter(p => p.agreementContractId === agreementId) : data.proposals.filter(p => activeAmendment.has(p.status));
  const replacesSigned = (id?:string) => {
    const seen=new Set<string>();
    while(id&&!seen.has(id)){seen.add(id);const p=data.proposals.find(p=>p.id===id);if(!p)return false;if(p.signedAt)return true;id=p.previousProposalId;}
    return false;
  };
  const replacementView=Boolean(w.replacement||replacesSigned(view?.previousProposalId));
  const history = data.proposals.filter(p => !activeAmendment.has(p.status));
  const preview = () => w.run(async () => { const payload = w.payload(); const result = await api.preview(contractId,payload); setReview({payload,comparison:result.comparison}); setConsent(false); });
  const evidence = async (files: File[], old: string[] = []) => {
    const ids = [...old]; if (old.length + files.length > 5) throw new Error("Tối đa 5 minh chứng.");
    for (const file of files) { let id = uploaded.current.get(file); if (!id) { id = await storageService.uploadAmendmentEvidence(file,contractId); uploaded.current.set(file,id); } ids.push(id); } return ids;
  };
  const submit = () => w.run(async () => {
    if (!review || !consent) return;
    w.setData(await api.propose(contractId,{...review.payload,evidenceIds:await evidence(w.files,w.evidenceIds)}));
    w.stop(); w.setSavedDraft(null); setReview(null); toast.success("Đã gửi đề xuất cho người thuê. Điều khoản hiện tại chưa thay đổi.");
  });
  const save = () => w.run(async () => {
    const ids = await evidence(w.files,w.evidenceIds), payload = {...w.payload(false),evidenceIds:ids};
    w.setSavedDraft(await api.saveDraft(contractId,payload)); w.setEvidenceIds(ids); w.setFiles([]); toast.success("Đã lưu bản nháp riêng. Chưa gửi cho người thuê.");
  });
  const decide = (p: AmendmentProposal, action: "APPROVE" | "REJECT" | "REQUEST_CHANGES" | "WITHDRAW") => w.run(async () => {
    if (["REJECT","REQUEST_CHANGES"].includes(action) && note.trim().length < 10) throw new Error("Ghi rõ lý do hoặc nội dung cần sửa (ít nhất 10 ký tự).");
    w.setData(await api.decide(contractId,p.id,action,note)); setView(null); setNote(""); setConsent(false);
    toast.success(action === "APPROVE" ? "Đã đồng ý nội dung. Chủ nhà ký trước, sau đó người thuê ký." : "Đã lưu phản hồi.");
  });
  const negotiation = (p: AmendmentProposal, action: "ACCEPT" | "REJECT") => w.run(async () => {
    if (action === "REJECT" && note.trim().length < 10) throw new Error("Ghi rõ lý do từ chối (ít nhất 10 ký tự).");
    w.setData(await api.decideNegotiation(contractId,p.id,action,note)); setNote("");
    if (action === "ACCEPT") { w.start(undefined,null,{...p,status:"TENANT_ACCEPTED"}); toast.success("Đã chấp thuận trao đổi. Hãy soạn nội dung trên hợp đồng bên dưới."); }
    else toast.success("Đã từ chối yêu cầu. Điều khoản giữ nguyên.");
  });
  const sendRequest = () => w.run(async () => {
    if (message.trim().length < 10) throw new Error("Nội dung yêu cầu cần ít nhất 10 ký tự.");
    w.setData(await api.requestNegotiation(contractId,{requestId:requestToken,message:message.trim(),evidenceIds:await evidence(requestFiles)}));
    setRequestOpen(false); setMessage(""); setRequestFiles([]); toast.success("Đã gửi mong muốn cho chủ nhà. Chưa thay đổi điều khoản hợp đồng.");
  });
  const openView = (p: AmendmentProposal) => { setView(p); setConsent(false); setNote(""); };
  const card = (p: AmendmentProposal) => {
    const request = p.status.startsWith("TENANT_");
    return <article key={p.id} className="space-y-3 rounded-xl border bg-background p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{labels[p.status]}</p><p className="mt-1 text-xs text-muted-foreground">{request ? "Yêu cầu bằng chữ của người thuê" : `${p.comparison.length} nội dung thay đổi`} · {time(p.submittedAt)}</p></div>{!request && <span className="self-start rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{p.immediateEffect ? "Áp dụng sau khi ký đủ" : `Từ ${date(p.effectiveOn)}`}</span>}</div>
      <p className="whitespace-pre-wrap break-words text-sm">{p.reason}</p>{p.responseNote && <p className="rounded-lg bg-muted p-3 text-sm">Phản hồi: {p.responseNote}</p>}<Evidence ids={p.evidenceIds} />
      {request ? <>
        {["TENANT_REQUESTED","TENANT_ACCEPTED"].includes(p.status) && <p className="text-xs text-muted-foreground">{p.status === "TENANT_REQUESTED" ? "Hạn chủ nhà phản hồi" : "Hạn soạn và gửi đề xuất"}: {time(p.respondBy)}. Không xử lý thì đóng yêu cầu; không tự chấp thuận.</p>}
        {isOwner && p.status === "TENANT_REQUESTED" && <div className="space-y-3"><button type="button" disabled={w.busy || w.editing} onClick={() => void negotiation(p,"ACCEPT")} className={button}>Chấp thuận trao đổi · Soạn phụ lục</button><label className="block text-xs">Lý do từ chối yêu cầu<textarea maxLength={2000} value={note} onChange={e => setNote(e.target.value)} className={input} /></label><button type="button" disabled={w.busy || note.trim().length < 10} onClick={() => void negotiation(p,"REJECT")} className="text-sm text-rose-700 disabled:opacity-50">Từ chối yêu cầu</button></div>}
        {isOwner && p.status === "TENANT_ACCEPTED" && !w.editing && <button type="button" onClick={() => w.start(undefined,w.savedDraft?.tenantRequestId === p.id ? w.savedDraft : null,p)} className={button}>Soạn phụ lục trên hợp đồng</button>}
        {!isOwner && p.status === "TENANT_ACCEPTED" && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Chủ nhà đã chấp thuận trao đổi, chưa chấp thuận điều khoản cụ thể. Bạn sẽ nhận bản đối chiếu để duyệt trước khi ký.</p>}
      </> : <div className="space-y-3"><button type="button" onClick={() => openView(p)} className="text-sm font-semibold text-primary">Xem nội dung đề xuất →</button>
        {p.status === "REQUESTED" && <p className="text-xs text-muted-foreground">{p.recipientId === actorId ? "Bạn cần phản hồi" : "Chờ người thuê phản hồi"} trước {time(p.respondBy)}.</p>}
        {p.status === "CHANGES_REQUESTED" && isOwner && p.proposerId === actorId && !w.editing && <button type="button" onClick={() => w.start(p)} className={button}>Chỉnh lại trên hợp đồng</button>}
        {p.status === "APPROVED" && p.agreementContractId && <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900"><p>{p.agreementStatus === "TENANT_SIGNATURE_PENDING" ? isOwner ? "Bạn đã ký. Chờ người thuê ký để hoàn tất." : "Chủ nhà đã ký. Đến lượt bạn xem PDF và ký." : isOwner ? "Người thuê đã đồng ý. Đến lượt bạn ký phụ lục." : "Bạn đã đồng ý nội dung. Chờ chủ nhà ký trước."}</p><p className="mt-1 text-xs">Hạn ký: {time(p.signBy)}. Chưa ký đủ thì điều khoản cũ vẫn áp dụng.</p><Link href={contractDetailPath(perspective,p.agreementContractId)} className="mt-2 inline-block font-semibold underline">{isOwner || p.agreementStatus === "TENANT_SIGNATURE_PENDING" ? "Mở phụ lục để xem và ký số" : "Xem hồ sơ phụ lục"} →</Link></div>}
        {p.status === "SCHEDULED" && <div className="space-y-2"><p className="text-sm text-emerald-700">Đã đủ chữ ký. Điều khoản mới áp dụng từ {date(p.effectiveOn)}.</p>{isOwner && p.canReplace && !w.editing && <button type="button" disabled={w.busy} onClick={()=>w.start(p,w.savedDraft?.previousProposalId===p.id?w.savedDraft:null)} className={button}>Chỉnh lại phụ lục</button>}{isOwner && !p.canReplace && p.replacementBlockedReason && <p className="text-xs text-muted-foreground">{p.replacementBlockedReason}</p>}</div>}
        {p.proposerId === actorId && ["REQUESTED","CHANGES_REQUESTED","APPROVED"].includes(p.status) && <button type="button" disabled={w.busy} onClick={() => { if (window.confirm("Rút đề xuất này? Điều khoản hiện tại sẽ được giữ nguyên.")) void decide(p,"WITHDRAW"); }} className="text-xs text-rose-700">Rút đề xuất</button>}
      </div>}
    </article>;
  };
  return <section id="contract-amendment-actions" className="scroll-mt-24 space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3"><div><h2 className="flex items-center gap-2 font-bold"><FilePenLine className="h-5 w-5 text-primary" />Phụ lục & điều chỉnh</h2><p className="mt-1 text-sm text-muted-foreground">{isOwner ? "Chỉnh tại từng mục hợp đồng, đối chiếu rồi gửi người thuê duyệt." : "Gửi mong muốn hoặc xem và phản hồi đề xuất của chủ nhà."}</p></div><button aria-label="Làm mới phụ lục" type="button" disabled={w.busy || w.editing} onClick={() => void w.load()} className="rounded-lg border p-2"><RefreshCw className="h-4 w-4" /></button></div>
    {!agreementId && !w.editing && <div className="flex flex-wrap justify-end gap-2"><div className="flex flex-wrap gap-2">{isOwner && w.savedDraft && (!current || current.status === "TENANT_ACCEPTED" || current.status === "CHANGES_REQUESTED" || current.status === "SCHEDULED" && w.savedDraft.previousProposalId === current.id) && <button type="button" onClick={() => w.start(undefined,w.savedDraft)} className="rounded-lg border px-4 py-2 text-sm">Tiếp tục bản nháp</button>}{isOwner && w.savedDraft && <button type="button" disabled={w.busy} onClick={() => { if (window.confirm("Xóa bản nháp riêng? Nội dung hợp đồng không thay đổi.")) void w.run(async () => { await api.discardDraft(contractId); w.setSavedDraft(null); }); }} className="rounded-lg border px-3 py-2 text-xs text-muted-foreground">Xóa bản nháp</button>}<button type="button" disabled={!data.canPropose || w.busy} onClick={() => isOwner ? w.start() : (setRequestOpen(true),setRequestToken(crypto.randomUUID()))} className={button}>{isOwner ? "Điều chỉnh hợp đồng" : "Đề nghị điều chỉnh"}</button></div></div>}
    {!agreementId && !data.canPropose && !w.editing && <p className="text-xs text-muted-foreground">{data.blockedReason}</p>}
    {w.editing && <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-4"><p className="text-sm font-semibold">Đang soạn phụ lục · Nội dung chưa có hiệu lực</p><p className="text-sm">Nhập trực tiếp điều khoản và thông tin trên văn bản; không cần chọn từ Listing. Tiện ích, nội thất và khoản phí có thể thêm/xóa hàng; đặc điểm tài sản chỉ sửa giá trị. Hồ sơ tài khoản, chữ ký và giao dịch cũ không bị ghi đè.</p><nav aria-label="Đi tới mục điều chỉnh" className="flex flex-wrap gap-2 text-xs">{[["residents","Thông tin các bên"],["property","Tài sản thuê"],["lease","Bàn giao"],["rent","Giá thuê"],["amenities","Tiện ích"],["charges","Phí dịch vụ"],["equipments","Nội thất"],["rules","Nội quy"]].map(([key,label]) => <a key={key} href={`#amendment-${key}`} className="rounded-full border bg-background px-3 py-1.5 text-primary">{label}</a>)}</nav><div className="grid gap-3 sm:grid-cols-2"><AmendmentEffectiveDatePicker availableDates={w.replacement ? [w.replacement.effectiveOn] : data.availableDates} value={w.effectiveOn} onChange={w.setEffectiveOn} disabled={w.busy} /><p className="self-end text-xs text-muted-foreground">{w.financial ? "Giá/phí mới dùng từ đầu kỳ tương lai. Chi phí kỳ trước theo đơn giá cũ; không sửa hóa đơn đã phát hành." : "Nội dung không ảnh hưởng tiền cũng áp dụng từ đầu kỳ thuê tương lai, không áp dụng ngay."}</p></div><label className="block text-xs font-medium">Lý do và mô tả thay đổi<textarea rows={2} value={w.reason} maxLength={2000} onChange={e => w.setReason(e.target.value)} className={input} /></label><label className="block text-xs">Minh chứng bổ sung (tối đa 5 tệp)<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => w.setFiles(Array.from(e.target.files ?? []))} className="mt-2 block max-w-full text-xs" /></label><Evidence ids={w.evidenceIds} /></div>}
    {w.editing && w.replacement && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Đang chỉnh lại phụ lục chưa áp dụng, giữ ngày hiệu lực {date(w.replacement.effectiveOn)}. Bản ký cũ vẫn giữ nguyên lịch áp dụng cho đến khi người thuê duyệt và hai bên ký đủ bản thay thế. Hủy thao tác hoặc bản mới không hoàn tất không làm mất bản cũ.</p>}
    {proposals.map(card)}{history.length > 0 && !agreementId && <details className="rounded-xl border p-3"><summary className="cursor-pointer text-sm font-medium">Lịch sử yêu cầu và phụ lục ({history.length})</summary><div className="mt-3 space-y-3">{history.map(card)}</div></details>}
{w.editing && <div role="region" aria-label="Thao tác lưu phụ lục" className="fixed left-4 right-24 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40 m-0! rounded-xl border bg-background/95 px-4 py-3 shadow-lg backdrop-blur sm:left-auto sm:right-28 sm:max-w-[calc(100vw-8rem)]"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium">{w.changedGroupCount} nhóm nội dung đã chỉnh</span><div className="flex flex-wrap gap-2"><button type="button" disabled={w.busy} onClick={() => { if (window.confirm("Đóng chỉnh sửa? Thay đổi chưa lưu sẽ bị bỏ; bản nháp đã lưu vẫn giữ lại.")) w.stop(); }} className="rounded-lg border px-3 py-2 text-sm">Hủy</button><button type="button" disabled={w.busy} onClick={() => void save()} className="rounded-lg border px-3 py-2 text-sm">Lưu nháp</button><button type="button" disabled={w.busy || !w.hasChanges} onClick={() => void preview()} className={button}>{w.busy ? "Đang xử lý…" : "Xem lại thay đổi"}</button></div></div></div>}
    <Dialog.Root open={!!review || !!view} onOpenChange={open => { if (!open && !w.busy) { setReview(null); setView(null); } }}><Modal busy={w.busy} title={review ? "Kiểm tra thay đổi trước khi gửi" : "Đề xuất điều chỉnh hợp đồng"} description="Chỉ hiển thị nội dung thay đổi. Đồng ý nội dung chưa thay thế việc ký số." footer={review ? <><Dialog.Close disabled={w.busy} className="rounded-lg border px-4 py-2 text-sm">Quay lại chỉnh sửa</Dialog.Close><button type="button" disabled={w.busy || !consent} onClick={() => void submit()} className={button}>Gửi đề xuất cho người thuê</button></> : view && ["REQUESTED","APPROVED"].includes(view.status) && view.recipientId === actorId ? <><button disabled={w.busy || note.trim().length < 10} type="button" onClick={() => void decide(view,"REJECT")} className="rounded-lg border px-3 py-2 text-sm text-rose-700 disabled:opacity-50">Từ chối</button><button disabled={w.busy || note.trim().length < 10} type="button" onClick={() => void decide(view,"REQUEST_CHANGES")} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Yêu cầu chỉnh lại</button>{view.status === "REQUESTED" && <button type="button" disabled={w.busy || !consent} onClick={() => void decide(view,"APPROVE")} className={button}>Đồng ý nội dung</button>}</> : <Dialog.Close className="rounded-lg border px-4 py-2 text-sm">Đóng</Dialog.Close>}>
      <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{review ? `Dự kiến áp dụng ${date(review.payload.effectiveOn ?? "")}` : view?.immediateEffect ? "Áp dụng sau khi hai bên ký đủ" : `Dự kiến áp dụng ${date(view?.effectiveOn ?? "")}`}. Giữ nguyên hóa đơn đã phát hành và giao dịch ban đầu. Cọc tăng/giảm tạo khoản chênh lệch riêng sau ngày hiệu lực; cần bên nhận xác nhận nhận tiền.</p><AmendmentComparisonTable rows={review?.comparison ?? view?.comparison ?? []} beforeLabel={replacementView?"Phụ lục đã ký trước đó":"Đang áp dụng"} afterLabel={replacementView?"Nội dung bản thay thế":"Đề xuất mới"}/><p className="whitespace-pre-wrap text-sm">Lý do: {review?.payload.reason ?? view?.reason}</p>{view && <Evidence ids={view.evidenceIds} />}
      {(review || view?.status === "REQUESTED" && view.recipientId === actorId) && <label className="flex items-start gap-2 rounded-xl border p-3 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={e => setConsent(e.target.checked)} />{review ? "Tôi đã kiểm tra đúng nội dung và ngày áp dụng trước khi gửi cho người thuê." : "Tôi đã đọc và đồng ý với đúng nội dung đề xuất này. Phụ lục chỉ áp dụng sau khi ký đủ và đến ngày hiệu lực."}</label>}
      {view && ["REQUESTED","APPROVED"].includes(view.status) && view.recipientId === actorId && <label className="block text-xs">Nội dung cần chỉnh lại hoặc lý do từ chối<textarea value={note} rows={2} maxLength={2000} onChange={e => setNote(e.target.value)} className={input} /></label>}
    </Modal></Dialog.Root>
    <Dialog.Root open={requestOpen} onOpenChange={open => { if (!w.busy) setRequestOpen(open); }}><Modal busy={w.busy} title="Bạn muốn điều chỉnh điều gì?" description="Nêu mong muốn để chủ nhà xem xét và soạn đề xuất cụ thể. Bạn được duyệt lại trước khi ký; không phản hồi đúng hạn thì yêu cầu đóng lại." footer={<><Dialog.Close disabled={w.busy} className="rounded-lg border px-4 py-2 text-sm">Hủy</Dialog.Close><button type="button" disabled={w.busy || message.trim().length < 10} onClick={() => void sendRequest()} className={button}>Gửi yêu cầu cho chủ nhà</button></>}><label className="block text-xs font-medium">Nội dung đề nghị<textarea rows={5} maxLength={2000} value={message} onChange={e => setMessage(e.target.value)} placeholder="Ví dụ: Tôi mong giảm tiền thuê từ 2 triệu xuống 1 triệu/tháng, từ kỳ tháng sau…" className={input} /></label><label className="block text-xs">Minh chứng (không bắt buộc)<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={e => setRequestFiles(Array.from(e.target.files ?? []))} className="mt-2 block max-w-full" /></label></Modal></Dialog.Root>
  </section>;
}
