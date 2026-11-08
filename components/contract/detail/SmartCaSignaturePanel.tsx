"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  signingAllowed?: boolean;
  blockedReason?: string;
  onUpdated: () => Promise<void>;
}

const inProgress = new Set(["CREATED", "PENDING_USER_CONFIRMATION", "PROVIDER_SIGNED", "EMBEDDING"]);

export default function SmartCaSignaturePanel({ contract, state, isLandlord, isTenant, hasReadyPdf, onUpdated, signingAllowed = true, blockedReason }: Props) {
  const [localCurrent, setCurrent] = useState<{
    contractId: string; source: SignatureStateResponse["activeRequest"]; request: SignatureRequestResponse;
  } | null>(null);
  const [certificates, setCertificates] = useState<CertificateOptionResponse[]>([]);
  const [serial, setSerial] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const refreshing = useRef(false);

  // Dữ liệu server mới phải thay được bản PENDING cũ đang giữ trong component.
  const current = localCurrent?.contractId === contract.id && localCurrent.source === state.activeRequest
    ? localCurrent.request : state.activeRequest ?? null;

  const myTurn = (isLandlord && contract.status === "DRAFT")
    || (isTenant && contract.status === "TENANT_SIGNATURE_PENDING");
  const pending = current && inProgress.has(current.status);

  const refresh = useCallback(async (showError = false) => {
    if (!current || !inProgress.has(current.status) || refreshing.current) return;
    refreshing.current = true;
    try {
      const next = await contractService.refreshSmartCaSignature(contract.id, current.id);
      setCurrent({ contractId: contract.id, source: state.activeRequest, request: next });
      setRefreshError("");
      if (next.status === "SIGNED") {
        toast.success("Chữ ký số đã được xác minh và lưu vào PDF hợp đồng.");
      }
      if (!inProgress.has(next.status)) {
        await onUpdated();
      }
    } catch (error) {
      setRefreshError("Chưa đồng bộ được trạng thái ký số. Hãy kiểm tra lại; lỗi kết nối không có nghĩa yêu cầu đã bị từ chối.");
      if (showError) toast.error(getApiErrorMessage(error, "Không thể kiểm tra trạng thái ký số."));
    } finally { refreshing.current = false; }
  }, [contract.id, current, state.activeRequest, onUpdated]);

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
      setCurrent({ contractId: contract.id, source: state.activeRequest, request: next });
      setRefreshError("");
      toast.info("Đã gửi yêu cầu. Mở ứng dụng VNPT SmartCA trên điện thoại để xác nhận.");
      await onUpdated();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể gửi yêu cầu ký số."));
      try { await onUpdated(); } catch { /* Show original VNPT error first. */ }
    } finally { setBusy(false); }
  }

  if (["EXPIRED", "CLOSED", "TERMINATED", "CANCELLED"].includes(contract.status)) {
    return <section className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
      {contract.status === "EXPIRED" ? "Hợp đồng đã hết thời hạn thuê. Tiếp tục hoàn tất hóa đơn, bàn giao và hoàn cọc bên dưới; không cần ký lại hợp đồng gốc."
        : contract.status === "CLOSED" ? "Hợp đồng đã hoàn tất quyết toán. PDF đã ký được giữ nguyên để tra cứu."
        : contract.status === "TERMINATED" ? "Hợp đồng đã chấm dứt. Không còn bước chờ ký số." : "Hợp đồng đã hủy. Không còn bước chờ ký số."}
    </section>;
  }
  if (!state.smartCaEnabled) {
    return <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Chế độ SmartCA đã được chọn nhưng kết nối VNPT chưa bật trên máy chủ. Vui lòng liên hệ quản trị viên.
    </section>;
  }

  if (contract.status === "ACTIVE") {
    return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 flex items-center gap-3">
      <CheckCircle2 className="h-5 w-5" /> {contract.agreementKind === "AMENDMENT" ? "Hai bên đã ký đủ phụ lục. Xem trạng thái và ngày áp dụng ở bảng điều chỉnh phía trên." : "Hai bên đã ký số. Hãy tải PDF hoàn chỉnh để kiểm tra chữ ký."}
    </section>;
  }

  if (current?.status === "FAILED" && (!myTurn || current.failureCode === "PROVIDER_STATE_UNKNOWN")) {
    return <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      {current.failureReason || "Xử lý chữ ký số thất bại."} Không gửi yêu cầu ký mới cho tới khi giao dịch cũ được đối soát.
    </section>;
  }
  if (current && ["REJECTED", "EXPIRED", "CANCELLED"].includes(current.status) && !myTurn) {
    return <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p>{current.failureReason || "Yêu cầu ký đã kết thúc mà chưa có chữ ký. Hãy tải lại trạng thái hợp đồng để tiếp tục."}</p>
      <button type="button" onClick={() => void onUpdated().catch(() => toast.error("Chưa tải lại được hợp đồng."))} className="mt-2 text-xs font-semibold underline">Tải lại trạng thái hợp đồng</button>
    </section>;
  }
  if (!signingAllowed && !pending) {
    return <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">{blockedReason || "Chưa đủ điều kiện ký. Xem tiến trình nhận nhà phía trên."}</section>;
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
        <h3 className="font-bold text-sm">Ký số {contract.agreementKind === "DEPOSIT" ? "hợp đồng cọc" : contract.agreementKind === "AMENDMENT" ? "phụ lục" : "hợp đồng"} bằng VNPT SmartCA</h3>
        <p className="text-xs text-muted-foreground mt-1">Rà soát PDF trước khi gửi yêu cầu. Ứng dụng SmartCA xác nhận giao dịch; HomeSpace sẽ đóng gói và kiểm tra chữ ký trên PDF.</p>
      </div>
    </div>
    {pending ? <div className="rounded-xl border border-sky-200 bg-white p-4 space-y-2 text-sm">
      <p className="font-semibold">{current?.status === "PENDING_USER_CONFIRMATION" || current?.status === "CREATED"
        ? "Đang chờ bạn xác nhận trên ứng dụng VNPT SmartCA"
        : "Đã nhận kết quả ký; đang xác minh và lưu PDF"}</p>
      {current?.docId && <p className="text-xs">Mã tài liệu để đối chiếu trên app: <strong>{current.docId}</strong></p>}
      <p className="text-xs text-muted-foreground">Trạng thái được đồng bộ bởi máy chủ ngay cả khi bạn đóng trang này.</p>
      {refreshError && <p role="alert" className="text-xs text-amber-800">{refreshError}</p>}
      <button type="button" onClick={() => void refresh(true)} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><RefreshCw className="h-4 w-4" /> Kiểm tra ngay</button>
    </div> : <>
      {current && ["REJECTED", "EXPIRED", "FAILED", "CANCELLED"].includes(current.status) &&
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
