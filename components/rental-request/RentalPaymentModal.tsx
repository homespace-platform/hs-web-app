"use client";

import React, { useEffect, useState } from "react";
import {
  CreditCard,
  Loader2,
  X,
  ShieldCheck,
  CheckCircle2,
  Copy,
  QrCode,
  UploadCloud,
  Clock,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import paymentRequestService from "@/services/payment-request.service";
import storageService from "@/services/storage.service";
import type { PaymentRequest, ReportTransferPayload } from "@/types/payment-request.type";
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
  }).format(amount);
}

export default function RentalPaymentModal({
  request,
  isOpen,
  onClose,
  onPaymentSuccess,
}: RentalPaymentModalProps) {
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);

  // Report transfer form state
  const [bankTxRef, setBankTxRef] = useState("");
  const [payerLast4, setPayerLast4] = useState("");
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    async function loadPayment() {
      try {
        const res = await paymentRequestService.getInitialPaymentByRentalRequestId(request.id);
        if (isMounted) {
          setPayment(res);
        }
      } catch (err) {
        if (isMounted) {
          toast.error(getApiErrorMessage(err, "Không thể tải thông tin yêu cầu thanh toán."));
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

  if (!isOpen) return null;

  const totalAmount = payment?.totalAmount ?? request.estimatedInitialTotal ?? 0;
  const payee = payment?.payeeAccount;
  const isConfirmed = payment?.status === "CONFIRMED";
  const isReported = payment?.status === "TRANSFER_REPORTED";
  const isRejected = payment?.status === "REJECTED";

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  }

  async function handleReportTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!payment) return;

    setUploading(true);
    try {
      let proofStorageId: string | undefined = undefined;

      if (selectedFile) {
        proofStorageId = await storageService.uploadPaymentProof(selectedFile, payment.id);
      }

      const payload: ReportTransferPayload = {
        declaredTransferTime: new Date().toISOString(),
        bankTransactionReference: bankTxRef.trim() || undefined,
        payerAccountLast4: payerLast4.trim() || undefined,
        proofStorageId,
        note: note.trim() || undefined,
      };

      const updated = await paymentRequestService.reportTransfer(payment.id, payload);
      setPayment(updated);
      setShowReportForm(false);
      toast.success("Đã ghi nhận thông báo chuyển khoản! Đang chờ chủ nhà xác nhận.");
      onPaymentSuccess?.(updated);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Khai báo chuyển khoản thất bại. Vui lòng thử lại."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-50 duration-200">
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="space-y-0.5 min-w-0">
            <h2
              id="payment-modal-title"
              className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2"
            >
              <CreditCard className="w-5 h-5 text-primary shrink-0" />
              <span>Chuyển khoản trực tiếp giữ chỗ</span>
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              Yêu cầu thuê #{request.id.slice(0, 8).toUpperCase()} {payment?.transferReference ? `• Ref: ${payment.transferReference}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs font-medium">Đang tải yêu cầu chuyển khoản...</span>
            </div>
          ) : !payment ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Chưa có thông tin thanh toán cho yêu cầu này.
            </div>
          ) : (
            <>
              {/* Direct Transfer Disclaimer Banner */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="space-y-0.5 leading-relaxed">
                    <p className="font-bold text-blue-950 dark:text-blue-100">
                      Chuyển khoản trực tiếp đến tài khoản chủ nhà
                    </p>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
                      HomeSpace không phải ví điện tử, không nhận tiền và không giữ tiền. Bạn chuyển tiền trực tiếp cho chủ nhà. Sau khi chuyển, vui lòng báo chuyển khoản để chủ nhà xác nhận.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Notice */}
              {isConfirmed && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold">Chủ nhà đã xác nhận nhận đủ tiền</p>
                    <p className="text-[11px] opacity-90">
                      Khoản tiền cọc đã được ghi nhận. Hệ thống đã mở khóa quy trình tạo và ký hợp đồng thuê.
                    </p>
                  </div>
                </div>
              )}

              {isReported && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold">Đã gửi thông báo chuyển khoản</p>
                    <p className="text-[11px] opacity-90">
                      Chủ nhà đang kiểm tra tài khoản ngân hàng để xác nhận giao dịch. Vui lòng giữ lại biên lai chuyển khoản.
                    </p>
                  </div>
                </div>
              )}

              {isRejected && (
                <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-start gap-2.5">
                  <Ban className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold">Chủ nhà chưa nhận được hoặc số tiền không khớp</p>
                    <p className="text-[11px] opacity-90">
                      Vui lòng kiểm tra lại thông tin giao dịch, liên hệ trực tiếp với chủ nhà hoặc khai báo lại bằng chứng chuyển khoản.
                    </p>
                  </div>
                </div>
              )}

              {/* VietQR Quick Link Box */}
              {!isConfirmed && payee && (
                <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-5">
                    {/* QR Code Image */}
                    {payment.qrImageUrl && (
                      <div className="flex flex-col items-center shrink-0">
                        <div className="p-2 rounded-2xl bg-white border border-border/80 shadow-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={payment.qrImageUrl}
                            alt="VietQR Chuyển khoản trực tiếp"
                            className="w-36 h-36 object-contain"
                          />
                        </div>
                        <span className="mt-1.5 text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <QrCode className="w-3 h-3" /> Quét bằng App Ngân hàng
                        </span>
                      </div>
                    )}

                    {/* Bank & Beneficiary Details */}
                    <div className="flex-1 min-w-0 w-full space-y-2.5 text-xs">
                      <div className="flex items-center justify-between pb-1 border-b border-border/60">
                        <span className="text-muted-foreground">Ngân hàng:</span>
                        <span className="font-bold text-foreground truncate max-w-[200px] text-right">
                          {payee.bankName} ({payee.bankCode})
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Số tài khoản:</span>
                        <div className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                          <span>{payee.accountNumber}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payee.accountNumber, "số tài khoản")}
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Sao chép số tài khoản"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Chủ tài khoản:</span>
                        <div className="flex items-center gap-1.5 font-bold uppercase text-foreground">
                          <span className="truncate max-w-[170px]">{payee.accountHolderName}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payee.accountHolderName, "tên chủ tài khoản")}
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Sao chép tên chủ tài khoản"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Số tiền:</span>
                        <div className="flex items-center gap-1.5 font-bold text-primary">
                          <span>{formatVND(totalAmount)}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(String(totalAmount), "số tiền")}
                            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                            title="Sao chép số tiền"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/60">
                        <span className="text-muted-foreground font-semibold text-primary">Nội dung CK:</span>
                        <div className="flex items-center gap-1.5 font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                          <span>{payment.transferReference}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(payment.transferReference, "nội dung chuyển khoản")}
                            className="p-0.5 rounded hover:bg-primary/20 text-primary"
                            title="Sao chép nội dung chuyển khoản"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-2.5 rounded-xl text-center">
                    ⚠️ <strong>Lưu ý:</strong> Vui lòng nhập chính xác <strong>nội dung chuyển khoản</strong> ({payment.transferReference}) để chủ nhà đối soát nhanh chóng.
                  </p>
                </div>
              )}

              {/* Chi tiết chi phí snapshot */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-foreground pb-2 border-b border-border/60">
                  <span>Khoản mục thanh toán ban đầu</span>
                  <span>Số tiền</span>
                </div>

                <div className="space-y-2 text-xs">
                  {payment.lineItems && payment.lineItems.length > 0 ? (
                    payment.lineItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-muted-foreground">
                        <span>{item.displayName}</span>
                        <span className="font-semibold text-foreground">
                          {formatVND(item.amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Tiền thuê tháng đầu</span>
                        <span className="font-semibold text-foreground">
                          {formatVND(request.effectiveMonthlyRent || request.monthlyRentPrice || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Tiền đặt cọc</span>
                        <span className="font-semibold text-foreground">
                          {formatVND(request.depositAmount || 0)}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-3 border-t border-border/60 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Tổng tiền cần chuyển
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Chuyển 100% trực tiếp cho chủ nhà
                    </span>
                  </div>
                  <span className="text-base sm:text-lg font-extrabold text-primary">
                    {formatVND(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Form Khai báo chuyển khoản khi click */}
              {showReportForm && (
                <form onSubmit={handleReportTransfer} className="p-4 rounded-2xl border border-primary/30 bg-primary/5 space-y-3">
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider">
                    Xác nhận đã chuyển khoản
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Mã giao dịch ngân hàng (FT... / GD...)
                    </label>
                    <input
                      value={bankTxRef}
                      onChange={(e) => setBankTxRef(e.target.value)}
                      placeholder="Ví dụ: FT260920123456"
                      className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        4 số cuối TK của bạn
                      </label>
                      <input
                        value={payerLast4}
                        maxLength={4}
                        onChange={(e) => setPayerLast4(e.target.value.replace(/\D/g, ""))}
                        placeholder="1234"
                        className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-mono outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1">
                        Ủy nhiệm chi / Biên lai ảnh
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            setProofPreviewUrl(URL.createObjectURL(file));
                          }
                        }}
                        className="h-10 w-full text-[11px] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                      />
                    </div>
                  </div>

                  {proofPreviewUrl && (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proofPreviewUrl} alt="Biên lai" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Ghi chú thêm (nếu có)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      placeholder="Ghi chú cho chủ nhà..."
                      className="w-full rounded-xl border border-border bg-background p-2.5 text-xs outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setShowReportForm(false)}
                      className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-sm shadow-primary/20 disabled:opacity-60"
                    >
                      {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {uploading ? "Đang gửi báo cáo..." : "Xác nhận gửi thông báo"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            Đóng
          </button>

          {!loading && payment && !isConfirmed && !showReportForm && (
            <button
              type="button"
              onClick={() => setShowReportForm(true)}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{isReported ? "Cập nhật chứng từ chuyển khoản" : "Tôi đã chuyển khoản"}</span>
            </button>
          )}

          {!loading && isConfirmed && (
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã hoàn tất thanh toán</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
