"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { depositAgreementService, type DepositAgreementView } from "@/services/deposit-agreement.service";
import { contractService } from "@/services/contract.service";
import type { ContractDocumentResponse, SignatureStateResponse } from "@/types/contract.type";
import ContractPdfViewerModal from "@/components/contract/detail/ContractPdfViewerModal";
import { primaryDocument } from "@/lib/contract-document-history";
import SmartCaSignaturePanel from "@/components/contract/detail/SmartCaSignaturePanel";
import { loadDepositAgreement } from "@/lib/deposit-agreement-loader";
import { getApiErrorMessage } from "@/utils/apiError";

const labels: Record<string, string> = {
  DRAFT: "Đã lập · Chờ chủ nhà ký", LANDLORD_SIGNATURE_PENDING: "Chủ nhà đang ký",
  TENANT_SIGNATURE_PENDING: "Chờ khách thuê ký", ACTIVE: "Đã ký đủ hai bên", CANCELLED: "Hồ sơ đã hủy",
};

export default function DepositAgreementPanel({ rentalRequestId, isLandlord, onUpdated }: {
  rentalRequestId: string; isLandlord: boolean; onUpdated?: () => void | Promise<void>;
}) {
  const [snapshot, setSnapshot] = useState<{ rentalId: string; data: DepositAgreementView } | null>(null);
  const [signature, setSignature] = useState<{ contractId: string; data: SignatureStateResponse } | null>(null);
  const [error, setError] = useState("");
  const [signatureError, setSignatureError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ rentalId: string; document: ContractDocumentResponse } | null>(null);
  const requestSequence = useRef({ value: 0 });
  const view = snapshot?.rentalId === rentalRequestId ? snapshot.data : null;

  const load = useCallback(async () => {
    const counter = requestSequence.current;
    const sequence = ++counter.value;
    const current = () => sequence === counter.value;
    let contractId: string | null = null;
    setLoading(true);
    try {
      await loadDepositAgreement(rentalRequestId, {
        getAgreement: depositAgreementService.get,
        getSignatureState: contractService.getSignatureState,
      }, {
        agreement: (data) => {
          contractId = data.agreement?.id ?? null;
          if (current()) {
            setSnapshot({ rentalId: rentalRequestId, data });
            setError("");
            setSignatureError("");
            setSignature(previous => previous?.contractId === contractId ? previous : null);
          }
        },
        signature: (data) => { if (current()) setSignature(data && contractId ? { contractId, data } : null); },
        signatureError: (failure) => {
          if (current()) setSignatureError(getApiErrorMessage(failure, "Chưa tải được trạng thái ký số."));
        },
      });
    } catch (failure) {
      if (current()) setError(getApiErrorMessage(failure, "Chưa tải được hồ sơ cọc."));
    } finally {
      if (current()) setLoading(false);
    }
  }, [rentalRequestId]);

  useEffect(() => {
    const counter = requestSequence.current;
    setError("");
    setSignatureError("");
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 15000);
    return () => { ++counter.value; clearInterval(timer); };
  }, [load]);

  async function prepare(reopen = false) {
    if (busy) return;
    setBusy(true);
    try {
      if (reopen) await depositAgreementService.reopen(rentalRequestId);
      else await depositAgreementService.prepare(rentalRequestId);
      await load();
      await onUpdated?.();
    } catch (failure) {
      setError(getApiErrorMessage(failure, "Chưa chuẩn bị được hợp đồng cọc."));
    } finally { setBusy(false); }
  }

  async function open(id: string) {
    const counter = requestSequence.current;
    const sequence = counter.value;
    try {
      const doc = await contractService.getDocument(id);
      if (!doc.viewUrl && !doc.downloadUrl) throw new Error("Chưa có đường dẫn tài liệu.");
      if (sequence === counter.value) setPreview({ rentalId: rentalRequestId, document: doc });
    } catch (failure) {
      if (sequence === counter.value) toast.error(getApiErrorMessage(failure, "Không mở được tài liệu cọc."));
    }
  }

  if (view && !view.required) return <p className="text-sm text-muted-foreground">Hồ sơ miễn cọc: không phát sinh hợp đồng nhận tiền cọc.</p>;
  const contract = view?.agreement;
  const pdf = primaryDocument(view?.documents ?? [], !!contract?.signedAt || contract?.status === "ACTIVE", contract?.currentRevisionId);
  const signatureState = signature?.contractId === contract?.id ? signature?.data : null;

  return <section className="space-y-3 rounded-xl border p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="font-semibold">Hợp đồng đặt cọc</h4>
      <button type="button" disabled={loading || busy} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50" onClick={() => void load()}>{loading ? "Đang tải…" : "Làm mới"}</button>
    </div>
    <p className="text-xs text-muted-foreground">Hợp đồng cọc được lập sau khi chủ nhà xác nhận nhận cọc, có thể xem và ký trước ngày vào ở. Hai bên ký cọc trước, ký hợp đồng thuê sau.</p>
    {error && <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
      <p>{error}</p>
      <p className="mt-1">{view ? "Dữ liệu đang hiển thị là lần tải gần nhất; trạng thái ký cần được kiểm tra lại." : "Chưa xác định được trạng thái tài liệu. Lỗi tải không có nghĩa hợp đồng chưa được tạo."} Không cần chuyển tiền lại.</p>
      <button type="button" disabled={loading || busy} className="mt-2 underline disabled:opacity-50" onClick={() => void load()}>Thử tải lại hồ sơ cọc</button>
    </div>}
    {!view && loading && !error && <p className="text-sm" role="status">Đang tải hợp đồng cọc và tài liệu…</p>}
    {contract && <p className="text-sm"><strong>{contract.contractNumber}</strong> · {labels[contract.status] || contract.status}</p>}
    {view && !contract && !error && <p className="text-sm">Chưa có hồ sơ hợp đồng cọc. Sau khi chủ nhà xác nhận nhận tiền, hệ thống sẽ tự chuẩn bị tài liệu; bạn có thể kiểm tra mẫu hoặc dữ liệu còn thiếu bên dưới.</p>}
    {pdf && <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => void open(pdf.id)}>{pdf.purpose === "SIGNED_FINAL" ? "Xem / tải hợp đồng cọc đã ký" : "Xem PDF hợp đồng cọc"}</button>}
    {contract && !pdf && !error && <p className="text-sm text-muted-foreground">Hồ sơ cọc đã được lập, nhưng PDF chưa sẵn sàng. Hệ thống có thể đang kết xuất hoặc cần thử lại; không thu cọc lần nữa.</p>}
    {view && !error && (!contract || contract.status === "DRAFT") && !pdf && <button type="button" disabled={busy || loading} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50" onClick={() => void prepare()}>{busy ? "Đang xử lý…" : "Kiểm tra / tạo lại tài liệu cọc"}</button>}
    {signatureError && <p role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{signatureError} Chưa kiểm tra được trạng thái ký; PDF đã có vẫn xem được. Bấm Làm mới để thử lại.</p>}
    {contract && signatureState && <SmartCaSignaturePanel key={contract.id} contract={contract} state={signatureState} isLandlord={isLandlord} isTenant={!isLandlord} hasReadyPdf={!!pdf} signingAllowed={!!view?.signingAllowed && !error && !signatureError} blockedReason={error || signatureError || view?.blockedReason || undefined} onUpdated={async () => { await load(); await onUpdated?.(); }}/>}
    {isLandlord && !error && view?.signingAllowed === false && contract?.status === "TENANT_SIGNATURE_PENDING" && view.blockedReason?.startsWith("Hết hạn") && <button type="button" disabled={busy || loading} className="rounded-lg border px-3 py-2 text-xs" onClick={() => void prepare(true)}>Mở lại hạn ký cọc cho khách</button>}
    <ContractPdfViewerModal isOpen={preview?.rentalId === rentalRequestId} document={preview?.rentalId === rentalRequestId ? preview.document : null} onClose={() => setPreview(null)}/>
  </section>;
}
