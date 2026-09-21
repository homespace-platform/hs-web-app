"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  CreditCard,
  Loader2,
  X,
  ShieldCheck,
  CheckCircle2,
  Copy,
  UploadCloud,
  Clock,
  Ban,
  Download,
  AlertTriangle,
  FileCheck,
  Building2,
  Receipt,
  FileText,
  Camera,
  Paperclip,
  Trash2,
  RefreshCw,
  Smartphone,
  QrCode,
} from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import paymentRequestService from "@/services/payment-request.service";
import storageService from "@/services/storage.service";
import type {
  PaymentRequest,
  ReportTransferPayload,
  ProofUploadSessionEvidence,
} from "@/types/payment-request.type";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import { getApiErrorMessage } from "@/utils/apiError";

interface RentalPaymentModalProps {
  request: RentalRequestResponse;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (payment: PaymentRequest) => void;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function RentalPaymentModal({
  request,
  isOpen,
  onClose,
  onPaymentSuccess,
}: RentalPaymentModalProps) {
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  // File input refs
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Proof source mode: LOCAL (tệp trên máy này) | MOBILE_QR (tải từ điện thoại)
  const [proofSource, setProofSource] = useState<"LOCAL" | "MOBILE_QR">("LOCAL");

  // Local device file upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"IDLE" | "UPLOADING" | "SUCCESS" | "ERROR">("IDLE");
  const [uploadedStorageId, setUploadedStorageId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Mobile QR handoff upload session state
  const [mobileSessionId, setMobileSessionId] = useState<string | null>(null);
  const [mobileQrDataUrl, setMobileQrDataUrl] = useState<string | null>(null);
  const [mobileUploadPageUrl, setMobileUploadPageUrl] = useState<string | null>(null);
  const [mobileSessionExpiresAt, setMobileSessionExpiresAt] = useState<string | null>(null);
  const [mobileCountdown, setMobileCountdown] = useState<number | null>(null);
  const [mobileStatus, setMobileStatus] = useState<"IDLE" | "CREATING" | "AWAITING_UPLOAD" | "UPLOADED" | "EXPIRED" | "ERROR">("IDLE");
  const [mobileEvidence, setMobileEvidence] = useState<ProofUploadSessionEvidence | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setQrLoading(true);
    setQrError(false);
    setShowReportForm(false);
    setProofSource("LOCAL");
    setSelectedFile(null);
    setProofPreviewUrl(null);
    setUploadedStorageId(null);
    setUploadStatus("IDLE");
    setUploadError(null);
    setMobileSessionId(null);
    setMobileQrDataUrl(null);
    setMobileUploadPageUrl(null);
    setMobileSessionExpiresAt(null);
    setMobileCountdown(null);
    setMobileStatus("IDLE");
    setMobileEvidence(null);
    setMobileError(null);

    async function loadPayment() {
      try {
        const res = await paymentRequestService.getInitialPaymentByRentalRequestId(request.id);
        if (isMounted) {
          setPayment(res);
        }
      } catch (err) {
        if (isMounted) {
          toast.error(getApiErrorMessage(err, "Không thể tải thông tin yêu cầu chuyển khoản."));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadPayment();
    return () => {
      isMounted = false;
    };
  }, [isOpen, request.id]);

  // Countdown timer for mobile QR session
  useEffect(() => {
    if (!isOpen || !mobileSessionExpiresAt || mobileStatus !== "AWAITING_UPLOAD") return;

    const timer = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(mobileSessionExpiresAt).getTime() - Date.now()) / 1000)
      );
      setMobileCountdown(remaining);
      if (remaining <= 0) {
        setMobileStatus("EXPIRED");
        toast.error("Phiên tải chứng từ đã hết hạn. Vui lòng tạo mã mới.");
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, mobileSessionExpiresAt, mobileStatus]);

  // Polling for mobile proof upload completion
  useEffect(() => {
    if (
      !isOpen ||
      !showReportForm ||
      proofSource !== "MOBILE_QR" ||
      mobileStatus !== "AWAITING_UPLOAD" ||
      !mobileSessionId ||
      !payment
    ) {
      return;
    }

    let isPolling = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await paymentRequestService.getProofUploadSessionStatus(
          payment.id,
          mobileSessionId
        );
        if (!isPolling) return;

        if (res.status === "CONSUMED") {
          // Mobile đã upload và gửi trực tiếp cho chủ nhà!
          const updated = await paymentRequestService.getInitialPaymentByRentalRequestId(request.id);
          if (!isPolling) return;
          setPayment(updated);
          setShowReportForm(false);
          setMobileStatus("IDLE");
          setMobileSessionId(null);
          setMobileQrDataUrl(null);
          setMobileUploadPageUrl(null);
          setMobileEvidence(null);
          toast.success("Chứng từ đã được gửi cho chủ nhà xác nhận từ điện thoại.");
          onPaymentSuccess?.(updated);
          return;
        } else if (res.status === "UPLOADED") {
          setMobileStatus("UPLOADED");
          setMobileEvidence(res.evidence || null);
          toast.success("Đã nhận chứng từ từ điện thoại.");
        } else if (res.status === "EXPIRED") {
          setMobileStatus("EXPIRED");
          toast.error("Phiên tải chứng từ đã hết hạn. Vui lòng tạo mã mới.");
        } else if (res.status === "CANCELLED") {
          setMobileStatus("ERROR");
          setMobileError("Phiên tải chứng từ đã bị hủy.");
        }
      } catch {
        // Background polling error is suppressed
      }
    }, 2500);

    return () => {
      isPolling = false;
      clearInterval(pollInterval);
    };
  }, [isOpen, showReportForm, proofSource, mobileStatus, mobileSessionId, payment, request.id, onPaymentSuccess]);

  if (!isOpen) return null;

  const totalAmount = payment?.totalAmount ?? request.estimatedInitialTotal ?? 0;
  const payee = payment?.payeeBankAccountSnapshot || payment?.payeeAccount;
  const isConfirmed = payment?.status === "CONFIRMED";
  const isReported = payment?.status === "TRANSFER_REPORTED";
  const isRejected = payment?.status === "REJECTED";

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  }

  function handleCopyAll() {
    if (!payee || !payment) return;
    const allInfo = [
      `THÔNG TIN CHUYỂN KHOẢN TRỰC TIẾP HOMESPACE`,
      `Ngân hàng: ${payee.bankName} (${payee.bankCode})`,
      `Số tài khoản: ${payee.accountNumber}`,
      `Chủ tài khoản: ${payee.accountHolderName}`,
      `Số tiền: ${totalAmount.toLocaleString("vi-VN")} VND`,
      `Nội dung chuyển khoản: ${payment.transferReference}`,
    ].join("\n");

    navigator.clipboard.writeText(allInfo);
    toast.success("Đã sao chép toàn bộ thông tin chuyển khoản!");
  }

  async function handleDownloadQr() {
    if (!payment?.qrImageUrl) return;
    try {
      const response = await fetch(payment.qrImageUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `VietQR_${payment.transferReference}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Đã tải mã VietQR về thiết bị.");
    } catch {
      window.open(payment.qrImageUrl, "_blank");
    }
  }

  function handleRemoveFile() {
    if (proofPreviewUrl) {
      URL.revokeObjectURL(proofPreviewUrl);
    }
    setSelectedFile(null);
    setProofPreviewUrl(null);
    setUploadedStorageId(null);
    setUploadStatus("IDLE");
    setUploadError(null);
    if (libraryInputRef.current) libraryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function handleFileSelected(file: File | undefined) {
    if (!file) return;

    if (proofPreviewUrl) {
      URL.revokeObjectURL(proofPreviewUrl);
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Chứng từ chưa được gửi vì tệp không hợp lệ.");
      setUploadError("Chỉ chấp nhận tệp định dạng ảnh (JPEG, PNG, WebP) hoặc PDF.");
      setSelectedFile(null);
      setProofPreviewUrl(null);
      setUploadedStorageId(null);
      setUploadStatus("ERROR");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("Chứng từ chưa được gửi vì tệp không hợp lệ.");
      setUploadError("Kích thước tệp chứng từ không được vượt quá 15MB.");
      setSelectedFile(null);
      setProofPreviewUrl(null);
      setUploadedStorageId(null);
      setUploadStatus("ERROR");
      return;
    }

    setSelectedFile(file);
    setUploadError(null);
    if (file.type.startsWith("image/")) {
      setProofPreviewUrl(URL.createObjectURL(file));
    } else {
      setProofPreviewUrl(null);
    }

    // Auto-upload to storage service immediately
    if (payment) {
      setUploadStatus("UPLOADING");
      try {
        const storageId = await storageService.uploadPaymentProof(file, payment.id);
        setUploadedStorageId(storageId);
        setUploadStatus("SUCCESS");
      } catch (err) {
        setUploadStatus("ERROR");
        const msg = getApiErrorMessage(err, "Tải chứng từ thất bại. Vui lòng thử lại.");
        setUploadError(msg);
        toast.error("Tải chứng từ thất bại. Vui lòng thử lại.");
      }
    }
  }

  async function handleCreateMobileSession() {
    if (!payment) return;
    setMobileStatus("CREATING");
    setMobileError(null);
    setMobileEvidence(null);
    setMobileUploadPageUrl(null);
    try {
      const res = await paymentRequestService.createProofUploadSession(payment.id);
      const qrDataUrl = await QRCode.toDataURL(res.uploadPageUrl, {
        width: 240,
        margin: 2,
        color: { dark: "#0f172a", light: "#ffffff" },
      });
      setMobileSessionId(res.sessionId);
      setMobileQrDataUrl(qrDataUrl);
      setMobileUploadPageUrl(res.uploadPageUrl);
      setMobileSessionExpiresAt(res.expiresAt);
      const remainingSecs = Math.max(
        0,
        Math.floor((new Date(res.expiresAt).getTime() - Date.now()) / 1000)
      );
      setMobileCountdown(remainingSecs);
      setMobileStatus("AWAITING_UPLOAD");
    } catch (err: unknown) {
      setMobileStatus("ERROR");
      let msg = getApiErrorMessage(err, "Không thể tạo phiên tải chứng từ từ điện thoại.");
      const errorCode = (err as { response?: { data?: { code?: number } } })?.response?.data?.code;
      if (errorCode === 7021) {
        msg = "Chưa cấu hình địa chỉ tải chứng từ từ điện thoại.";
        toast.error("Chưa cấu hình URL công khai cho tải chứng từ. Vui lòng kiểm tra PAYMENT_PROOF_UPLOAD_PUBLIC_BASE_URL.");
      } else if (errorCode === 7022) {
        msg = "PAYMENT_PROOF_UPLOAD_PUBLIC_BASE_URL không hợp lệ.";
        toast.error("PAYMENT_PROOF_UPLOAD_PUBLIC_BASE_URL không hợp lệ.");
      } else {
        toast.error(msg);
      }
      setMobileError(msg);
    }
  }

  async function handleReportTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!payment) return;

    if (proofSource === "LOCAL") {
      if (uploadStatus === "UPLOADING") {
        toast.error("Tệp chứng từ đang được tải lên. Vui lòng chờ trong giây lát.");
        return;
      }

      let finalStorageId = uploadedStorageId;

      if (!finalStorageId) {
        if (!selectedFile) {
          toast.error("Vui lòng đính kèm ảnh hoặc tệp chứng từ chuyển khoản.");
          return;
        }
        setSubmitting(true);
        try {
          finalStorageId = await storageService.uploadPaymentProof(selectedFile, payment.id);
          setUploadedStorageId(finalStorageId);
          setUploadStatus("SUCCESS");
        } catch {
          setSubmitting(false);
          setUploadStatus("ERROR");
          toast.error("Tải chứng từ thất bại. Vui lòng thử lại.");
          return;
        }
      }

      setSubmitting(true);
      try {
        const payload: ReportTransferPayload = {
          proofStorageId: finalStorageId,
        };

        const updated = await paymentRequestService.reportTransfer(payment.id, payload);
        setPayment(updated);
        setShowReportForm(false);
        handleRemoveFile();
        toast.success("Đã gửi chứng từ cho chủ nhà xác nhận.");
        onPaymentSuccess?.(updated);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Không thể gửi báo cáo chuyển khoản. Vui lòng thử lại."));
      } finally {
        setSubmitting(false);
      }
    } else {
      // MOBILE_QR
      if (mobileStatus !== "UPLOADED" || !mobileSessionId) {
        toast.error("Vui lòng đính kèm ảnh hoặc tệp chứng từ chuyển khoản.");
        return;
      }

      setSubmitting(true);
      try {
        const payload: ReportTransferPayload = {
          evidenceUploadSessionId: mobileSessionId,
        };

        const updated = await paymentRequestService.reportTransfer(payment.id, payload);
        setPayment(updated);
        setShowReportForm(false);
        setMobileStatus("IDLE");
        setMobileSessionId(null);
        setMobileUploadPageUrl(null);
        setMobileEvidence(null);
        toast.success("Đã gửi chứng từ cho chủ nhà xác nhận.");
        onPaymentSuccess?.(updated);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Không thể gửi báo cáo chuyển khoản. Vui lòng thử lại."));
      } finally {
        setSubmitting(false);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-background/80 backdrop-blur-sm animate-in fade-in-50 duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        {/* HEADER */}
        <div className="px-6 sm:px-8 py-4 sm:py-5 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="space-y-1 min-w-0">
            <h2
              id="payment-modal-title"
              className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2.5"
            >
              <CreditCard className="w-6 h-6 text-primary shrink-0" />
              <span>Phiếu hướng dẫn chuyển khoản trực tiếp</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Yêu cầu thuê #{request.id.slice(0, 8).toUpperCase()} {payment?.transferReference ? `• Ref: ${payment.transferReference}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs font-medium">Đang tải thông tin chuyển khoản...</span>
            </div>
          ) : !payment ? (
            <div className="py-12 text-center text-sm text-muted-foreground space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 opacity-80" />
              <p>Chưa có thông tin thanh toán cho yêu cầu thuê này.</p>
            </div>
          ) : (
            <>
              {/* 1. CẢNH BÁO VAI TRÒ HOMESPACE */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 sm:p-5 text-sm text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200">
                <div className="flex items-start gap-3.5">
                  <ShieldCheck className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-1 leading-relaxed">
                    <p className="font-bold text-sm sm:text-base text-blue-950 dark:text-blue-100">
                      Chuyển khoản trực tiếp đến tài khoản chủ nhà
                    </p>
                    <p className="text-xs sm:text-sm text-blue-800/90 dark:text-blue-300/90">
                      HomeSpace không nhận, giữ hoặc xử lý tiền. Bạn chuyển khoản trực tiếp đến tài khoản của chủ nhà. Vui lòng kiểm tra đúng tên chủ tài khoản trước khi chuyển.
                    </p>
                  </div>
                </div>
              </div>

              {/* TRẠNG THÁI HIỆN TẠI */}
              {isConfirmed && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-3.5">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-emerald-600" />
                  <div className="space-y-1 text-sm">
                    <p className="font-bold text-base">Chủ nhà đã xác nhận nhận đủ tiền</p>
                    <p className="text-xs sm:text-sm opacity-90">
                      Khoản thanh toán ban đầu đã được chủ nhà xác nhận. Quy trình tạo và ký hợp đồng thuê đã sẵn sàng.
                    </p>
                  </div>
                </div>
              )}

              {isReported && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-start gap-3.5">
                  <Clock className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" />
                  <div className="space-y-1 text-sm">
                    <p className="font-bold text-base">Đã gửi chứng từ — chờ chủ nhà xác nhận</p>
                    <p className="text-xs sm:text-sm opacity-90">
                      Bạn đã gửi chứng từ chuyển khoản. Chủ nhà đang kiểm tra tài khoản ngân hàng để xác nhận giao dịch.
                    </p>
                  </div>
                </div>
              )}

              {isRejected && (
                <div className="p-4 sm:p-5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-start gap-3.5">
                  <Ban className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
                  <div className="space-y-1 text-sm">
                    <p className="font-bold text-base">Chủ nhà chưa nhận được tiền hoặc từ chối chứng từ</p>
                    {payment.rejectedReason && (
                      <p className="text-xs sm:text-sm font-semibold italic">
                        Lý do từ chối: &quot;{payment.rejectedReason}&quot;
                      </p>
                    )}
                    <p className="text-xs sm:text-sm opacity-90">
                      Vui lòng kiểm tra lại biến động số dư tài khoản ngân hàng hoặc đính kèm lại chứng từ chính xác bên dưới.
                    </p>
                  </div>
                </div>
              )}

              {/* 2. CHI TIẾT KHOẢN THANH TOÁN */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3.5 shadow-xs">
                <div className="flex items-center justify-between text-sm font-bold text-foreground pb-2.5 border-b border-border/70">
                  <span className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-primary" />
                    <span>Chi tiết khoản thanh toán ban đầu</span>
                  </span>
                  <span>Số tiền</span>
                </div>

                <div className="space-y-2.5 text-sm">
                  {payment.lineItems && payment.lineItems.length > 0 ? (
                    payment.lineItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-muted-foreground">
                        <span className="font-medium text-foreground/90">{item.displayName}</span>
                        <span className="font-bold text-foreground">
                          {formatVND(item.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-medium text-foreground/90">Tiền thuê kỳ đầu</span>
                        <span className="font-bold text-foreground">
                          {formatVND(request.effectiveMonthlyRent || request.monthlyRentPrice || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-medium text-foreground/90">Tiền đặt cọc</span>
                        <span className="font-bold text-foreground">
                          {formatVND(request.depositAmount || 0)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <p className="text-xs text-muted-foreground italic pt-1.5 border-t border-border/40">
                  * Các chi phí biến đổi theo đồng hồ thực tế (điện, nước) sẽ tính theo chỉ số phát sinh thực tế trong quá trình thuê.
                </p>

                <div className="pt-3 border-t border-border/70 flex items-baseline justify-between">
                  <div>
                    <span className="text-sm sm:text-base font-bold text-foreground block">
                      Tổng tiền cần chuyển
                    </span>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      Chuyển 100% trực tiếp cho chủ nhà
                    </span>
                  </div>
                  <span className="text-xl sm:text-3xl font-black text-primary">
                    {formatVND(totalAmount)}
                  </span>
                </div>
              </div>

              {/* 3 & 4. THÔNG TIN NHẬN TIỀN & MÃ VIETQR */}
              {payee ? (
                <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-border/70">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span>Thông tin tài khoản nhận tiền</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleCopyAll}
                      className="px-3.5 py-1.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Sao chép toàn bộ thông tin chuyển khoản"
                    >
                      <Copy className="w-3.5 h-3.5 text-primary" />
                      <span>Sao chép toàn bộ</span>
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    {/* VietQR Box - Enlarge QR to 240px-260px */}
                    <div className="flex flex-col items-center shrink-0 w-full md:w-auto">
                      <div className="relative p-3.5 rounded-3xl bg-white border border-border/90 shadow-md flex items-center justify-center">
                        {payment.qrImageUrl && !qrError ? (
                          <>
                            {qrLoading && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-3xl z-10">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                              </div>
                            )}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={payment.qrImageUrl}
                              alt="VietQR Chuyển khoản trực tiếp"
                              className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                              onLoad={() => setQrLoading(false)}
                              onError={() => {
                                setQrLoading(false);
                                setQrError(true);
                              }}
                            />
                          </>
                        ) : (
                          <div className="w-56 h-56 sm:w-64 sm:h-64 flex flex-col items-center justify-center p-4 text-center bg-muted/30 rounded-2xl border border-dashed border-border text-muted-foreground">
                            <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                            <span className="text-xs font-medium leading-relaxed">
                              Không tải được mã QR. Vui lòng chuyển khoản thủ công theo thông tin bên cạnh.
                            </span>
                          </div>
                        )}
                      </div>

                      {payment.qrImageUrl && !qrError && (
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            type="button"
                            onClick={handleDownloadQr}
                            className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs sm:text-sm font-semibold text-foreground flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                          >
                            <Download className="w-4 h-4 text-primary" />
                            <span>Tải mã QR</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Manual Bank Information Grid - Enhanced Font Size & No Truncation */}
                    <div className="flex-1 min-w-0 w-full space-y-3.5 text-sm sm:text-base">
                      {/* Ngân hàng */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-border/60">
                        <span className="text-xs sm:text-sm text-muted-foreground font-medium shrink-0">Ngân hàng:</span>
                        <span className="font-bold text-foreground text-left sm:text-right leading-snug">
                          {payee.bankName} <span className="text-primary font-mono font-black">({payee.bankCode})</span>
                        </span>
                      </div>

                      {/* Số tài khoản */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                        <span className="text-xs sm:text-sm text-muted-foreground font-medium">Số tài khoản:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-xl font-mono font-black tracking-wider text-foreground">
                            {payee.accountNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payee.accountNumber, "số tài khoản")}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            title="Sao chép số tài khoản"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Chủ tài khoản */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                        <span className="text-xs sm:text-sm text-muted-foreground font-medium">Chủ tài khoản:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-bold uppercase text-foreground">
                            {payee.accountHolderName}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payee.accountHolderName, "tên chủ tài khoản")}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            title="Sao chép tên chủ tài khoản"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Số tiền */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                        <span className="text-xs sm:text-sm text-muted-foreground font-medium">Số tiền:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-2xl font-black text-primary">
                            {formatVND(totalAmount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(String(totalAmount), "số tiền")}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            title="Sao chép số tiền"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Nội dung chuyển khoản */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-1">
                        <span className="text-xs sm:text-sm font-bold text-foreground">Nội dung CK:</span>
                        <div className="flex items-center gap-2 self-start sm:self-auto font-mono font-black text-primary bg-primary/10 px-3.5 py-1.5 rounded-xl border border-primary/25 shadow-2xs">
                          <span className="text-sm sm:text-base tracking-wide">{payment.transferReference}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payment.transferReference, "nội dung chuyển khoản")}
                            className="p-1 rounded-md hover:bg-primary/20 text-primary cursor-pointer transition-colors"
                            title="Sao chép nội dung chuyển khoản"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 sm:p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      ⚠️ <strong>Lưu ý quan trọng:</strong> Vui lòng nhập đúng <strong>nội dung chuyển khoản ({payment.transferReference})</strong> để chủ nhà dễ dàng đối soát và xác nhận nhanh chóng.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 text-sm">
                  <p className="font-bold">Chủ nhà chưa thiết lập tài khoản nhận tiền mặc định.</p>
                  <p className="text-xs mt-1">Vui lòng liên hệ với chủ nhà để cập nhật thông tin tài khoản.</p>
                </div>
              )}

              {/* 5. FORM KHAI BÁO CHỨNG TỪ CHUYỂN KHOẢN */}
              {showReportForm && (
                <form onSubmit={handleReportTransfer} className="p-5 sm:p-6 rounded-2xl border-2 border-primary/40 bg-primary/5 space-y-4 animate-in fade-in-50 duration-200">
                  <div className="border-b border-primary/20 pb-2.5">
                    <h4 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-primary" />
                      <span>Khai báo chứng từ chuyển khoản</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      Chứng từ của bạn sẽ được gửi trực tiếp cho chủ nhà để đối soát với tài khoản ngân hàng.
                    </p>
                  </div>

                  {/* PHƯƠNG THỨC ĐÍNH KÈM CHỨNG TỪ (BẮT BUỘC) */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <label className="block text-xs sm:text-sm font-bold text-foreground">
                        Chứng từ chuyển khoản <span className="text-rose-500">* (Bắt buộc)</span>
                      </label>

                      {/* SELECTOR: THIẾT BỊ NÀY HOẶC ĐIỆN THOẠI */}
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border self-start sm:self-auto shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setProofSource("LOCAL")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            proofSource === "LOCAL"
                              ? "bg-card text-foreground shadow-xs border border-border"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Chọn tệp trên thiết bị này</span>
                        </button>
                        <span className="text-[11px] text-muted-foreground font-semibold px-1">Hoặc</span>
                        <button
                          type="button"
                          onClick={() => {
                            setProofSource("MOBILE_QR");
                            if (!mobileSessionId || mobileStatus === "EXPIRED" || mobileStatus === "ERROR" || mobileStatus === "IDLE") {
                              handleCreateMobileSession();
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            proofSource === "MOBILE_QR"
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>Tải chứng từ từ điện thoại</span>
                        </button>
                      </div>
                    </div>

                    {/* 5A. CHẾ ĐỘ 1: CHỌN TỆP TRÊN THIẾT BỊ NÀY */}
                    {proofSource === "LOCAL" && (
                      <div className="space-y-2">
                        {/* Hidden inputs for library and camera capture */}
                        <input
                          ref={libraryInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,application/pdf"
                          className="hidden"
                          onChange={(e) => handleFileSelected(e.target.files?.[0])}
                        />
                        <input
                          ref={cameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handleFileSelected(e.target.files?.[0])}
                        />

                        {!selectedFile ? (
                          <div className="p-4 rounded-2xl border border-dashed border-border bg-card/60 hover:bg-card transition-colors flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="space-y-0.5 text-center sm:text-left">
                              <p className="text-xs sm:text-sm font-semibold text-foreground">
                                Đính kèm ảnh biên lai hoặc tệp PDF từ thiết bị này
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Hỗ trợ JPG, PNG, WebP, PDF (tối đa 15MB).
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2.5">
                              <button
                                type="button"
                                onClick={() => libraryInputRef.current?.click()}
                                className="px-3.5 py-2 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Paperclip className="w-4 h-4" />
                                <span>Chọn từ thư viện</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => cameraInputRef.current?.click()}
                                className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Camera className="w-4 h-4 text-primary" />
                                <span>Chụp ảnh</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs space-y-3">
                            <div className="flex items-center gap-3.5">
                              {proofPreviewUrl ? (
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border shrink-0 shadow-xs">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={proofPreviewUrl} alt="Xem trước chứng từ" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0 text-primary">
                                  <FileText className="w-7 h-7" />
                                  <span className="text-[10px] font-bold uppercase mt-0.5">PDF</span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{selectedFile.name}</p>
                                <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                                {uploadStatus === "UPLOADING" && (
                                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Đang tải tệp lên storage...</span>
                                  </div>
                                )}
                                {uploadStatus === "SUCCESS" && (
                                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Tệp đã tải lên & sẵn sàng</span>
                                  </div>
                                )}
                                {uploadStatus === "ERROR" && (
                                  <div className="flex items-center gap-1.5 text-xs text-rose-500 font-semibold">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>{uploadError || "Tải lên thất bại"}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                              <button
                                type="button"
                                onClick={() => libraryInputRef.current?.click()}
                                className="px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Chọn tệp khác</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveFile}
                                className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-100 text-xs font-semibold text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5B. CHẾ ĐỘ 2: TẢI TỪ ĐIỆN THOẠI QUA MÃ QR */}
                    {proofSource === "MOBILE_QR" && (
                      <div className="p-4 sm:p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4">
                        {mobileStatus === "CREATING" && (
                          <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-xs sm:text-sm font-semibold text-foreground">Đang tạo phiên tải từ điện thoại...</p>
                            <p className="text-xs text-muted-foreground">Mã QR bảo mật dùng một lần sẽ sẵn sàng trong giây lát</p>
                          </div>
                        )}

                        {mobileStatus === "AWAITING_UPLOAD" && mobileQrDataUrl && (
                          <div className="flex flex-col md:flex-row items-center gap-5 sm:gap-7">
                            {/* QR Code container */}
                            <div className="p-3 bg-white rounded-2xl border-2 border-primary/20 shadow-md shrink-0 flex flex-col items-center justify-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={mobileQrDataUrl}
                                alt="Mã QR tải chứng từ từ điện thoại"
                                className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                              />
                              {mobileUploadPageUrl && (
                                <div className="max-w-[200px] sm:max-w-[220px] w-full flex flex-col items-center gap-1.5 pt-1.5 border-t border-slate-100">
                                  <span className="text-[11px] text-slate-500 truncate w-full text-center" title={mobileUploadPageUrl}>
                                    Trang tải chứng từ: {mobileUploadPageUrl}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(mobileUploadPageUrl, "liên kết tải chứng từ")}
                                    className="px-2.5 py-1 rounded-md border border-border bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Copy className="w-3 h-3" />
                                    <span>Sao chép liên kết</span>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Instructions & Status */}
                            <div className="space-y-3 flex-1 text-center md:text-left">
                              <div className="space-y-1">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Mã QR tải ảnh một lần</span>
                                </div>
                                <h5 className="font-bold text-base sm:text-lg text-foreground">
                                  Quét mã bằng điện thoại để tải chứng từ
                                </h5>
                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                  Mở camera trên điện thoại của bạn, quét mã QR này để tải trực tiếp ảnh chứng từ từ thư viện ảnh hoặc chụp biên lai.
                                </p>
                              </div>

                              {/* Status Indicator & Countdown */}
                              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 pt-1">
                                <div className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300 text-xs font-semibold flex items-center gap-2">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                  <span>Đang chờ ảnh từ điện thoại...</span>
                                </div>

                                {mobileCountdown !== null && (
                                  <div className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 ${
                                    mobileCountdown < 60
                                      ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-600"
                                      : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-700 dark:text-amber-300"
                                  }`}>
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Hết hạn: {formatCountdown(mobileCountdown)}</span>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => setProofSource("LOCAL")}
                                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer transition-colors"
                                >
                                  Hoặc chọn tệp trực tiếp trên máy tính này
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {mobileStatus === "UPLOADED" && mobileEvidence && (
                          <div className="space-y-3.5 animate-in fade-in-50 duration-200">
                            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>Đã nhận chứng từ từ điện thoại thành công!</span>
                            </div>

                            <div className="p-3.5 rounded-2xl border border-border bg-card shadow-xs flex items-center gap-3.5">
                              {mobileEvidence.previewUrl ? (
                                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-border shrink-0 shadow-xs">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={mobileEvidence.previewUrl}
                                    alt="Chứng từ từ điện thoại"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0 text-primary">
                                  <FileText className="w-7 h-7" />
                                  <span className="text-[10px] font-bold uppercase mt-0.5">
                                    {mobileEvidence.contentType.includes("pdf") ? "PDF" : "ẢNH"}
                                  </span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                                  {mobileEvidence.originalFileName || "Chung-tu-chuyen-khoan.jpg"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(mobileEvidence.fileSize)} • Đã tải lên từ điện thoại
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Chứng từ đã sẵn sàng để gửi</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-1">
                              <button
                                type="button"
                                onClick={handleCreateMobileSession}
                                className="px-3 py-1.5 rounded-lg border border-border bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Yêu cầu ảnh khác</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {mobileStatus === "EXPIRED" && (
                          <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                            <div className="space-y-1">
                              <p className="text-xs sm:text-sm font-bold text-foreground">
                                Phiên tải chứng từ đã hết hạn
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Để đảm bảo an toàn, mỗi mã QR chỉ có hiệu lực trong 10 phút.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleCreateMobileSession}
                              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span>Tạo mã QR mới</span>
                            </button>
                          </div>
                        )}

                        {mobileStatus === "ERROR" && (
                          <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                            <div className="space-y-1">
                              <p className="text-xs sm:text-sm font-bold text-foreground">
                                {mobileError || "Không thể khởi tạo phiên tải chứng từ"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Vui lòng kiểm tra kết nối mạng hoặc thử lại.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleCreateMobileSession}
                              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs sm:text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
                            >
                              <RefreshCw className="w-4 h-4" />
                              <span>Thử lại</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mô tả nghiệp vụ & Action Buttons */}
                  <div className="space-y-3 pt-2.5 border-t border-primary/20">
                    <p className="text-xs text-muted-foreground italic">
                      * Chủ nhà sẽ kiểm tra chứng từ và đối chiếu với tài khoản ngân hàng trước khi xác nhận.
                    </p>

                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setShowReportForm(false)}
                        className="rounded-xl border border-border bg-card px-4 py-2 text-xs sm:text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={
                          submitting ||
                          (proofSource === "LOCAL" && (uploadStatus === "UPLOADING" || (!selectedFile && !uploadedStorageId))) ||
                          (proofSource === "MOBILE_QR" && (mobileStatus !== "UPLOADED" || !mobileSessionId))
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-60 cursor-pointer"
                      >
                        {(submitting || (proofSource === "LOCAL" && uploadStatus === "UPLOADING")) && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>
                          {submitting
                            ? "Đang gửi chứng từ..."
                            : proofSource === "LOCAL" && uploadStatus === "UPLOADING"
                            ? "Đang tải tệp lên..."
                            : "Gửi chứng từ cho chủ nhà xác nhận"}
                        </span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 sm:px-8 py-4 sm:py-5 border-t border-border bg-card flex items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-xs sm:text-sm font-semibold text-foreground transition-colors cursor-pointer"
          >
            Đóng
          </button>

          {!loading && payment && !isConfirmed && !showReportForm && (
            <div>
              {isReported ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs sm:text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Đang chờ chủ nhà xác nhận</span>
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowReportForm(true)}
                  className="px-6 py-3 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm sm:text-base font-bold shadow-lg shadow-primary/25 transition-all cursor-pointer inline-flex items-center gap-2.5"
                >
                  <UploadCloud className="w-5 h-5" />
                  <span>{isRejected ? "Gửi lại chứng từ" : "Tôi đã chuyển khoản"}</span>
                </button>
              )}
            </div>
          )}

          {!loading && isConfirmed && (
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Chủ nhà đã xác nhận nhận đủ tiền</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
