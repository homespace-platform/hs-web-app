import { complaintActions, complaintEventContext, type ComplaintCase } from "@/types/complaint.type";
export default function ComplaintHistory({ complaint,onProof }: { complaint: ComplaintCase;onProof?:(id:string)=>void }) {
  return <div className="space-y-3"><ComplaintSources complaint={complaint} onProof={onProof}/><details className="rounded-lg border p-3 text-xs"><summary className="cursor-pointer font-semibold">Lịch sử khiếu nại ({complaint.events.length})</summary>
    <ol className="mt-3 max-h-80 space-y-2 overflow-y-auto">{complaint.events.map(e=>{const context=complaintEventContext(e.metadataJson);return <li key={e.revision} className="rounded-lg border p-2">
      <p className="font-semibold">{complaintActions[e.action] ?? e.action} · {e.actorRole === "ADMIN" ? "HomeSpace" : e.actorRole === "SYSTEM" ? "Hệ thống" : e.actorRole === "TENANT" ? "Người thuê" : "Chủ nhà"}</p>
      <p className="text-muted-foreground">{new Date(e.occurredAt).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}</p><p className="whitespace-pre-wrap">{e.reason}</p>
      {context.agreement&&<p>Thỏa thuận được phản hồi: {context.agreement}</p>}
      {context.deduction!=null&&<p>Đề xuất khấu trừ: {context.deduction.toLocaleString("vi-VN")} đ · Phiên bản {context.version??"—"}</p>}
      {context.evidenceIds.map((id,i)=><button type="button" key={id} disabled={!onProof} onClick={()=>onProof?.(id)} className="mr-3 text-primary underline">Chứng cứ của phản hồi này {i+1}</button>)}
    </li>;})}</ol>
  </details></div>;
}

function ComplaintSources({complaint,onProof}:{complaint:ComplaintCase;onProof?:(id:string)=>void}){
  return <>{complaint.sources?.map((source,index)=>{const p=source.proposal;const title=({MOVE_IN:"Biên bản nhận nhà",CANCELLATION:"Đề nghị xử lý trước thuê",EARLY_EXIT:"Thỏa thuận chấm dứt sớm"} as Record<string,string>)[source.kind]??"Hồ sơ nguồn";return <details key={`${source.workflowId}:${source.revision}:${index}`} className="space-y-2 rounded-lg border p-3 text-xs" open>
    <summary className="font-semibold">Căn cứ: {title} · Bản {source.revision}</summary>
    <p>Chụp lúc {new Date(source.capturedAt).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})}. Nội dung này giữ nguyên khi hồ sơ nguồn được chỉnh sau đó.</p>
    <p className="whitespace-pre-wrap">{typeof p.reason==="string"?p.reason:""}</p>
    {typeof p.handedOverAt==="string"&&<p>Nhận nhà thực tế: {new Date(p.handedOverAt).toLocaleString("vi-VN",{timeZone:"Asia/Ho_Chi_Minh"})} · Chìa khóa: {String(p.keys??"chưa ghi nhận")}</p>}
    {typeof p.condition==="string"&&<p>Hiện trạng: {p.condition}</p>}
    {typeof p.electricity==="number"&&<p>Điện thực tế: {p.electricity} kWh</p>}{typeof p.water==="number"&&<p>Nước thực tế: {p.water} m³</p>}
    {Array.isArray(p.inventory)&&p.inventory.length>0&&<table className="w-full text-left"><thead><tr><th>Tài sản</th><th>Số lượng</th><th>Hiện trạng</th></tr></thead><tbody>{p.inventory.map((raw,i)=>{const row=raw as Record<string,unknown>;return <tr key={i}><td>{String(row.name??"")}</td><td>{String(row.quantity??"")}</td><td>{String(row.condition??"")}</td></tr>;})}</tbody></table>}
    {typeof p.endExclusive==="string"&&<p>Ngày kết thúc (không tính ngày này): {p.endExclusive}</p>}{typeof p.handoverTerms==="string"&&<p>Bàn giao: {p.handoverTerms}</p>}
    {source.rentCalculation&&typeof source.rentCalculation.agreedFinalRent==="number"&&typeof source.rentCalculation.requiredRefund==="number"&&<p>Cách tính tiền thuê: {source.rentCalculation.policy==="DAILY_PRORATED"?"Theo ngày":"Trọn kỳ"} · {source.rentCalculation.usedDays}/{source.rentCalculation.periodDays} ngày · Tiền thuê kỳ cuối {source.rentCalculation.agreedFinalRent.toLocaleString("vi-VN")} đ · Khoản hoàn tối thiểu {source.rentCalculation.requiredRefund.toLocaleString("vi-VN")} đ</p>}
    {source.documents?.map((doc,i)=><p key={doc.storageObjectId}><button type="button" disabled={!onProof} className="text-primary underline" onClick={()=>onProof?.(doc.storageObjectId)}>PDF căn cứ {i+1} · {doc.purpose==="SIGNED_FINAL"?"đã ký đủ":doc.purpose==="SIGNED_LANDLORD"?"chủ nhà đã ký":"bản nguồn"} · Bản {doc.sourceRevision}</button></p>)}
    <p>Chủ nhà xác nhận: {source.ownerConfirmedAt?new Date(source.ownerConfirmedAt).toLocaleString("vi-VN"):"chưa xác nhận"} · Người thuê: {source.tenantConfirmedAt?new Date(source.tenantConfirmedAt).toLocaleString("vi-VN"):"chưa xác nhận"}</p>
    <div className="flex flex-wrap gap-3">{source.evidenceIds.map((id,i)=><button key={id} type="button" disabled={!onProof} className="text-primary underline" onClick={()=>onProof?.(id)}>Bằng chứng nguồn {i+1}</button>)}</div>
    <details><summary>Lịch sử nguồn ({source.history.length})</summary>{source.history.map(e=><p key={e.revision}>{new Date(e.at).toLocaleString("vi-VN")} · {e.role==="LANDLORD"?"Chủ nhà":"Người thuê"}: {e.reason}</p>)}</details>
  </details>;})}</>;
}
