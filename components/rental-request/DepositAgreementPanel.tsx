"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { depositAgreementService, type DepositAgreementView } from "@/services/deposit-agreement.service";
import { contractService } from "@/services/contract.service";
import type { SignatureStateResponse } from "@/types/contract.type";
import SmartCaSignaturePanel from "@/components/contract/detail/SmartCaSignaturePanel";
import { getApiErrorMessage } from "@/utils/apiError";

const labels:Record<string,string>={DRAFT:"Chờ chủ nhà ký",LANDLORD_SIGNATURE_PENDING:"Chủ nhà đang ký",TENANT_SIGNATURE_PENDING:"Chờ khách thuê ký",ACTIVE:"Đã ký đủ hai bên",CANCELLED:"Hồ sơ đã hủy"};
export default function DepositAgreementPanel({rentalRequestId,isLandlord,onUpdated}:{rentalRequestId:string;isLandlord:boolean;onUpdated?:()=>void|Promise<void>}) {
  const [view,setView]=useState<DepositAgreementView|null>(null);
  const [signature,setSignature]=useState<SignatureStateResponse|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    const data=await depositAgreementService.get(rentalRequestId);
    const state=data.agreement?await contractService.getSignatureState(data.agreement.id):null;
    setView(data);setSignature(state);setError("");
  },[rentalRequestId]);
  useEffect(()=>{
    let alive=true;
    const refresh=()=>{if(alive)void load().catch(e=>{if(alive)setError(getApiErrorMessage(e,"Chưa tải được hồ sơ cọc."));});};
    refresh();const timer=setInterval(()=>{if(document.visibilityState==="visible")refresh();},15000);
    return()=>{alive=false;clearInterval(timer);};
  },[load]);
  async function prepare(reopen=false) {
    if(busy)return;setBusy(true);
    try{if(reopen)await depositAgreementService.reopen(rentalRequestId);else await depositAgreementService.prepare(rentalRequestId);await load();await onUpdated?.();}
    catch(e){setError(getApiErrorMessage(e,"Chưa chuẩn bị được hợp đồng cọc."));}
    finally{setBusy(false);}
  }
  async function open(id:string) {
    const tab=window.open("about:blank","_blank");if(tab)tab.opener=null;
    try{const doc=await contractService.getDocument(id);const url=doc.viewUrl||doc.downloadUrl;if(!url)throw new Error("Chưa có đường dẫn tài liệu.");if(tab)tab.location.href=url;}
    catch(e){tab?.close();toast.error(getApiErrorMessage(e,"Không mở được tài liệu cọc."));}
  }
  if(view && !view.required)return <p className="text-sm text-muted-foreground">Hồ sơ miễn cọc: không phát sinh hợp đồng nhận tiền cọc.</p>;
  const contract=view?.agreement;
  const pdfs=view?.documents.filter(d=>d.documentType==="PDF"&&d.status==="READY")||[];
  const pdf=pdfs.find(d=>d.purpose==="SIGNED_FINAL")||pdfs.find(d=>d.purpose==="SIGNED_LANDLORD")||pdfs[0];
  return <section className="space-y-3 rounded-xl border p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-semibold">Hợp đồng đặt cọc</h4><button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={()=>void load().catch(e=>setError(getApiErrorMessage(e,"Không tải được hồ sơ.")))}>Làm mới</button></div>
    <p className="text-xs text-muted-foreground">Ký hợp đồng cọc trước, ký hợp đồng thuê sau. Mỗi văn bản có hai chữ ký riêng; tiền đã xác nhận được giữ nguyên nếu có lỗi kết xuất hoặc ký.</p>
    {error&&<p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
    {contract?<p className="text-sm"><strong>{contract.contractNumber}</strong> · {labels[contract.status]||contract.status}</p>:<p className="text-sm">Sau khi chủ nhà xác nhận nhận cọc, hệ thống sẽ tự chuẩn bị tài liệu. Nếu chưa có, bấm kiểm tra để xem dữ liệu hoặc mẫu còn thiếu.</p>}
    {pdf&&<button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={()=>void open(pdf.id)}>{pdf.purpose==="SIGNED_FINAL"?"Xem / tải hợp đồng cọc đã ký":"Xem PDF hợp đồng cọc"}</button>}
    {(!contract||contract.status==="DRAFT")&&!pdf&&<button type="button" disabled={busy} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" onClick={()=>void prepare()}>{busy?"Đang xử lý…":"Kiểm tra / tạo lại tài liệu cọc"}</button>}
    {contract&&signature&&<SmartCaSignaturePanel key={contract.id} contract={contract} state={signature} isLandlord={isLandlord} isTenant={!isLandlord} hasReadyPdf={!!pdf} signingAllowed={view?.signingAllowed ?? false} blockedReason={view?.blockedReason ?? undefined} onUpdated={async()=>{await load();await onUpdated?.();}}/>}
    {isLandlord&&view?.signingAllowed===false&&contract?.status==="TENANT_SIGNATURE_PENDING"&&view.blockedReason?.startsWith("Hết hạn")&&<button type="button" disabled={busy} className="rounded-lg border px-3 py-2 text-xs" onClick={()=>void prepare(true)}>Mở lại hạn ký cọc cho khách</button>}
  </section>;
}
