"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, PenLine, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { contractService } from "@/services/contract.service";
import type {
  CertificateOptionResponse,
  ContractResponse,
  SignatureRequestResponse,
  SignatureStateResponse,
} from "@/types/contract.type";
import { getApiErrorMessage } from "@/utils/apiError";

interface Props {
  contract: ContractResponse;
  state: SignatureStateResponse;
  isLandlord: boolean;
  isTenant: boolean;
  hasReadyPdf: boolean;
  onUpdated: () => Promise<void>;
}

const inProgress = new Set(["CREATED", "PENDING_USER_CONFIRMATION", "PROVIDER_SIGNED", "EMBEDDING"]);

export default function SmartCaSignaturePanel({ contract, state, isLandlord, isTenant, hasReadyPdf, onUpdated }: Props) {
  const [localCurrent, setCurrent] = useState<SignatureRequestResponse | null>(null);
  const [certificates, setCertificates] = useState<CertificateOptionResponse[]>([]);
  const [serial, setSerial] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const current = localCurrent ?? state.activeRequest ?? null;

  const myTurn = (isLandlord && contract.status === "DRAFT")
    || (isTenant && contract.status === "TENANT_SIGNATURE_PENDING");
  const pending = current && inProgress.has(current.status);

  const refresh = useCallback(async (showError = false) => {
    if (!current || !inProgress.has(current.status)) return;
    try {
      const next = await contractService.refreshSmartCaSignature(contract.id, current.id);
      setCurrent(next);
      if (next.status === "SIGNED") {
        toast.success("Chữ ký số đã được xác minh và lưu vào PDF hợp đồng.");
        await onUpdated();
      }
    } catch (error) {
      if (showError) toast.error(getApiErrorMessage(error, "Không thể kiểm tra trạng thái ký số."));
    }
  }, [contract.id, current, onUpdated]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh(false);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [pending, refresh]);

  async function loadCertificates() {
    setBusy(true);
    try {
      const options = await contractService.getSigningCertificates(contract.id);
      setCertificates(options);
      if (options.length === 1) setSerial(options[0].serialNumber);
      if (options.length === 0) toast.warning("Không tìm thấy chứng thư SmartCA hợp lệ cho CCCD của bạn.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tải chứng thư SmartCA."));
    } finally { setBusy(false); }
  }

  async function start() {
    if (!consent || !serial) return;
    setBusy(true);
    try {
      const next = await contractService.initiateSmartCaSignature(contract.id, serial);
      setCurrent(next);
      toast.info("Đã gửi yêu cầu. Mở ứng dụng VNPT SmartCA trên điện thoại để xác nhận.");
      await onUpdated();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể gửi yêu cầu ký số."));
      try { await onUpdated(); } catch { /* Show original VNPT error first. */ }
    } finally { setBusy(false); }
  }

  if (!state.smartCaEnabled) {
    return <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Chế độ SmartCA đã được chọn nhưng kết nối VNPT chưa bật trên máy chủ. Vui lòng liên hệ quản trị viên.
    </section>;
  }

  if (contract.status === "ACTIVE") {
    return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 flex items-center gap-3">
      <CheckCircle2 className="h-5 w-5" /> Hai bên đã ký số. Hãy tải PDF hoàn chỉnh để kiểm tra chữ ký.
    </section>;
  }

  if (current?.status === "FAILED" && !myTurn) {
    return <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      {current.failureReason || "Xử lý chữ ký số thất bại."} Không gửi yêu cầu ký mới cho tới khi giao dịch cũ được đối soát.
    </section>;
  }

  if (!myTurn && !pending) {
    return <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-900">
      {isLandlord && contract.status === "TENANT_SIGNATURE_PENDING"
        ? "Chủ nhà đã ký số. Đang chờ người thuê ký cùng bản PDF."
        : "Hợp đồng đang chờ bên còn lại hoàn tất bước ký số."}
    </section>;
  }

  return <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 space-y-4">
    <div className="flex items-start gap-3">
      <ShieldCheck className="h-6 w-6 text-sky-700 shrink-0" />
      <div>
        <h3 className="font-bold text-sm">Ký số hợp đồng bằng VNPT SmartCA</h3>
        <p className="text-xs text-muted-foreground mt-1">Rà soát PDF trước khi gửi yêu cầu. Ứng dụng SmartCA xác nhận giao dịch; HomeSpace sẽ đóng gói và kiểm tra chữ ký trên PDF.</p>
      </div>
    </div>
    {pending ? <div className="rounded-xl border border-sky-200 bg-white p-4 space-y-2 text-sm">
      <p className="font-semibold">{current?.status === "PENDING_USER_CONFIRMATION"
        ? "Đang chờ bạn xác nhận trên ứng dụng VNPT SmartCA"
        : "Đã nhận kết quả ký; đang xác minh và lưu PDF"}</p>
      {current?.docId && <p className="text-xs">Mã tài liệu để đối chiếu trên app: <strong>{current.docId}</strong></p>}
      <p className="text-xs text-muted-foreground">Trạng thái được đồng bộ bởi máy chủ ngay cả khi bạn đóng trang này.</p>
      <button type="button" onClick={() => void refresh(true)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><RefreshCw className="h-4 w-4" /> Kiểm tra ngay</button>
    </div> : <>
      {current && ["REJECTED", "EXPIRED", "FAILED"].includes(current.status) &&
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{current.failureReason || "Yêu cầu ký chưa hoàn tất. Vui lòng kiểm tra trước khi thử lại."}</p>}
      {!hasReadyPdf && <p className="text-xs text-amber-700">Cần kết xuất PDF của bản sửa đổi hiện tại trước khi ký.</p>}
      <button type="button" disabled={busy || !hasReadyPdf} onClick={() => void loadCertificates()} className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50">{busy ? "Đang tải..." : "Chọn chứng thư SmartCA"}</button>
      {certificates.length > 0 && <select value={serial} onChange={e => setSerial(e.target.value)} className="block w-full rounded-lg border p-2 text-sm" aria-label="Chọn chứng thư số">
        <option value="">Chọn chứng thư</option>
        {certificates.map(c => <option key={c.serialNumber} value={c.serialNumber}>{c.subject} — {c.serialNumber}</option>)}
      </select>}
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Tôi đã đọc bản PDF và đồng ý ký số hợp đồng này.</label>
      <button type="button" disabled={busy || !hasReadyPdf || !serial || !consent} onClick={() => void start()} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />} Gửi yêu cầu ký tới SmartCA
      </button>
    </>}
  </section>;
}
