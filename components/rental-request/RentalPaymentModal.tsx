"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  CreditCard,
  Loader2,
  X,
  ShieldCheck,
  AlertCircle,
  Home,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { rentalPaymentService } from "@/services/rental-payment.service";
import type { RentalPaymentResponse } from "@/types/rental-payment.type";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import {
  parseCostBreakdownSnapshot,
  parseExcludedChargesSnapshot,
} from "./rental-request-snapshot.helper";
import { formatExcludedChargeValue } from "./rental-request.helper";
import { getApiErrorMessage } from "@/utils/apiError";

interface RentalPaymentModalProps {
  request: RentalRequestResponse;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (payment: RentalPaymentResponse) => void;
}

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  );
}

export default function RentalPaymentModal({
  request,
  isOpen,
  onClose,
  onPaymentSuccess,
}: RentalPaymentModalProps) {
  const [payment, setPayment] = useState<RentalPaymentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    async function loadPayment() {
      setLoading(true);
      try {
        const res = await rentalPaymentService.getInitialPayment(request.id);
        if (isMounted) {
          setPayment(res);
        }
      } catch (err) {
        if (isMounted) {
          toast.error(getApiErrorMessage(err, "Không thể tải thông tin thanh toán."));
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

  const costBreakdown = parseCostBreakdownSnapshot(
    payment?.costBreakdownSnapshot ?? request.costBreakdownSnapshot
  );
  const excludedCharges = parseExcludedChargesSnapshot(
    payment?.excludedChargesSnapshot ?? request.excludedChargesSnapshot
  );

  const monthlyRent = payment?.monthlyRent ?? request.effectiveMonthlyRent ?? request.monthlyRentPrice ?? 0;
  const depositAmount = payment?.depositAmount ?? request.depositAmount ?? 0;
  const totalAmount = payment?.totalAmount ?? request.estimatedInitialTotal ?? monthlyRent + depositAmount;
  const isPaid = payment?.status === "PAID_MOCK" || payment?.status === "PAID";

  // Danh sách các khoản phí cố định hàng tháng đã tính vào tổng
  const includedCharges = costBreakdown.filter(
    (c) => !c.includedInRent && (c.amount > 0 || c.unitAmount > 0)
  );

  async function handlePayMock() {
    if (submitting || isPaid) return;
    setSubmitting(true);
    try {
      const updated = await rentalPaymentService.payMock(request.id);
      setPayment(updated);
      toast.success("Thanh toán ban đầu giả lập thành công!");
      onPaymentSuccess?.(updated);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Thanh toán ban đầu thất bại."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in-50 duration-200">
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
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
              <span>Thanh toán ban đầu giữ chỗ</span>
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              Yêu cầu thuê #{request.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-40"
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
              <span className="text-xs font-medium">Đang tải thông tin thanh toán...</span>
            </div>
          ) : (
            <>
              {/* Thông tin phòng & bài đăng */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30 flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted border border-border/50">
                  {isValidImageUrl(request.listingThumbnail) ? (
                    <Image
                      src={request.listingThumbnail!}
                      alt={request.listingTitle}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Home className="w-5 h-5 opacity-40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-xs text-foreground line-clamp-1">
                    {request.listingTitle}
                  </h3>
                  {request.listingAddress && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {request.listingAddress}
                    </p>
                  )}
                </div>
              </div>

              {/* Trạng thái đã thanh toán nếu có */}
              {isPaid && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold">Khoản thanh toán này đã hoàn tất</p>
                    <p className="text-[11px] opacity-90">
                      Chủ nhà đang được thông báo để tạo và gửi hợp đồng thuê cho bạn.
                    </p>
                  </div>
                </div>
              )}

              {/* Chi tiết chi phí snapshot */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-foreground pb-2 border-b border-border/60">
                  <span>Khoản mục snapshot</span>
                  <span>Số tiền</span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Tiền thuê tháng đầu */}
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Tiền thuê tháng đầu</span>
                    <span className="font-semibold text-foreground">
                      {formatVND(monthlyRent)}
                    </span>
                  </div>

                  {/* Tiền cọc */}
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Tiền đặt cọc</span>
                    <span className="font-semibold text-foreground">
                      {formatVND(depositAmount)}
                    </span>
                  </div>

                  {/* Các phí cố định tháng đầu */}
                  {includedCharges.map((c, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-muted-foreground"
                    >
                      <span className="truncate pr-2">{c.displayName}</span>
                      <span className="font-semibold text-foreground shrink-0">
                        {formatVND(c.amount || c.unitAmount)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Tổng thanh toán */}
                <div className="pt-3 border-t border-border/60 flex items-baseline justify-between">
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      Tổng thanh toán ban đầu
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Đã bao gồm tiền cọc + chi phí tháng đầu
                    </span>
                  </div>
                  <span className="text-base sm:text-lg font-extrabold text-primary">
                    {formatVND(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Các khoản chưa bao gồm */}
              {excludedCharges.length > 0 && (
                <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Chưa bao gồm trong lần thanh toán này:</span>
                  </div>
                  <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
                    {excludedCharges.map((item, idx) => (
                      <li key={idx}>
                        <span className="font-medium text-foreground">{item.displayName}:</span>{" "}
                        <span>{formatExcludedChargeValue(item)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-muted-foreground italic pt-0.5">
                    * Các khoản điện/nước công tơ sẽ được chốt số đo khi bàn giao và thanh toán theo thực tế.
                  </p>
                </div>
              )}

              {/* Ghi chú an toàn */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-primary">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Cơ chế bảo vệ thanh toán</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Số tiền được thanh toán để tiếp tục giữ chỗ sau khi chủ nhà chấp thuận yêu cầu. Hệ thống tạm giữ khoản thanh toán này cho đến khi hợp đồng được hoàn tất.
                </p>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-40"
          >
            Đóng
          </button>

          {!loading && !isPaid && (
            <button
              type="button"
              disabled={submitting}
              onClick={handlePayMock}
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý thanh toán...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Thanh toán giả lập</span>
                </>
              )}
            </button>
          )}

          {!loading && isPaid && (
            <div className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã thanh toán thành công</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
