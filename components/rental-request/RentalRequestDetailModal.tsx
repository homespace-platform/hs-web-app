"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  X,
  Home,
  MapPin,
  ExternalLink,
  User,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Ban,
  Wallet,
  Sparkles,
  AlertCircle,
  FileText,
  CreditCard,
  RefreshCw,
  Car,
  Bike,
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { vi } from "date-fns/locale";
import rentalRequestService from "@/services/rental-request.service";
import type {
  RentalRequestResponse,
  RentalRequestStatus,
} from "@/types/rental-request.type";
import type { ContractResponse } from "@/types/contract.type";
import {
  formatVND,
  partitionPredictableCharges,
  partitionExcludedCharges,
  formatChargeDisplay,
  formatExcludedChargeValue,
  getDepositBadge,
} from "./rental-request.helper";
import {
  parseCostBreakdownSnapshot,
  parseExcludedChargesSnapshot,
  formatOccupantCount,
  formatMotorbikeCount,
  formatCarCount,
  calculateEstimatedEndDate,
} from "./rental-request-snapshot.helper";
import {
  RENTAL_HOLD_DURATION_SHORT,
} from "@/config/rental-hold.config";

interface RentalRequestDetailModalProps {
  requestId: string | null;
  isOpen: boolean;
  onClose: () => void;
  mode: "RECEIVED" | "SENT";
  linkedContract?: ContractResponse | null;
  onAccept?: (req: RentalRequestResponse) => void;
  onReject?: (req: RentalRequestResponse) => void;
  onCancel?: (req: RentalRequestResponse) => void;
  onPayMock?: (req: RentalRequestResponse) => void;
  onOpenContract?: (contractId: string) => void;
  onCreateContract?: (req: RentalRequestResponse) => void;
  onViewListing?: (listingId: string) => void;
  isProcessingAction?: boolean;
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

function formatHoldRemaining(expiresAt: string, nowMs: number): string {
  const ms = new Date(expiresAt).getTime() - nowMs;
  if (ms <= 0) return "đã hết hạn";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours} giờ ${minutes} phút`;
  if (minutes > 0) return `${minutes} phút ${seconds} giây`;
  return `${seconds} giây`;
}

const STATUS_CONFIG: Record<
  RentalRequestStatus,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: "Chờ duyệt",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    icon: Clock,
  },
  ACCEPTED: {
    label: `Đang giữ chỗ ${RENTAL_HOLD_DURATION_SHORT}`,
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Bị từ chối",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    icon: XCircle,
  },
  CANCELLED_BY_SYSTEM: {
    label: "Hủy bởi hệ thống",
    badgeClass:
      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    icon: Ban,
  },
  CANCELLED_BY_RENTER: {
    label: "Khách đã hủy",
    badgeClass:
      "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    icon: Ban,
  },
  EXPIRED: {
    label: "Hết hạn giữ chỗ",
    badgeClass:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    icon: Clock,
  },
  COMPLETED: {
    label: "Đã thuê thành công",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    icon: CheckCircle2,
  },
};

export default function RentalRequestDetailModal({
  requestId,
  isOpen,
  onClose,
  mode,
  linkedContract,
  onAccept,
  onReject,
  onCancel,
  onPayMock,
  onOpenContract,
  onCreateContract,
  onViewListing,
  isProcessingAction = false,
}: RentalRequestDetailModalProps) {
  const [detail, setDetail] = useState<RentalRequestResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Fetch fresh request detail when modal opens or requestId changes
  useEffect(() => {
    if (!isOpen || !requestId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    rentalRequestService
      .getRequestById(requestId)
      .then((res) => {
        if (isMounted) {
          setDetail(res);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Không thể tải chi tiết yêu cầu thuê. Vui lòng thử lại.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, requestId]);

  // Tick for hold countdown
  useEffect(() => {
    if (!detail?.holdExpiresAt || detail.status !== "ACCEPTED") return;
    const isHoldValid = !isPast(new Date(detail.holdExpiresAt));
    if (!isHoldValid) return;

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [detail?.holdExpiresAt, detail?.status]);

  // Parse snapshots safely
  const predictableCharges = useMemo(() => {
    return parseCostBreakdownSnapshot(detail?.costBreakdownSnapshot);
  }, [detail?.costBreakdownSnapshot]);

  const excludedCharges = useMemo(() => {
    return parseExcludedChargesSnapshot(detail?.excludedChargesSnapshot);
  }, [detail?.excludedChargesSnapshot]);

  const { payableCharges, includedCharges, freeCharges } = useMemo(() => {
    return partitionPredictableCharges(predictableCharges);
  }, [predictableCharges]);

  const { meteredCharges, negotiableOrCustomCharges } = useMemo(() => {
    return partitionExcludedCharges(excludedCharges);
  }, [excludedCharges]);

  if (!isOpen) return null;

  // Compute status presentation (consistent with card)
  const isContractPending = linkedContract?.status === "PENDING_REVIEW";
  const isContractActive = linkedContract?.status === "ACTIVE";
  const isContractDraft = linkedContract?.status === "DRAFT";
  const isContractPaid =
    linkedContract?.paymentStatus === "PAID_MOCK" ||
    Boolean(linkedContract?.rentalPaymentId);
  const hasExecutionContract = isContractPending || isContractActive;

  const initialPayment = detail?.initialPayment;
  const isPaymentPaid =
    initialPayment?.status === "PAID_MOCK" ||
    initialPayment?.status === "PAID" ||
    isContractPaid;
  const isPaymentPending =
    detail?.status === "ACCEPTED" &&
    !hasExecutionContract &&
    !isPaymentPaid;

  const statusInfo = isContractActive
    ? {
        label: "Đã thuê thành công",
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        icon: CheckCircle2,
      }
    : isContractPending
    ? {
        label: "Chờ ký hợp đồng",
        badgeClass:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        icon: FileText,
      }
    : isContractDraft
    ? {
        label: "Chủ nhà đang soạn hợp đồng",
        badgeClass:
          "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
        icon: FileText,
      }
    : detail?.status === "ACCEPTED"
    ? isPaymentPaid
      ? {
          label: "Đã thanh toán — chờ hợp đồng",
          badgeClass:
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
          icon: CheckCircle2,
        }
      : mode === "SENT"
      ? {
          label: "Chờ bạn thanh toán",
          badgeClass:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
          icon: Clock,
        }
      : {
          label: "Chờ khách thanh toán",
          badgeClass:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
          icon: Clock,
        }
    : detail
    ? STATUS_CONFIG[detail.status] || STATUS_CONFIG.PENDING
    : STATUS_CONFIG.PENDING;

  const StatusIcon = statusInfo.icon;

  const hasHoldExpired =
    detail?.status === "ACCEPTED" &&
    detail?.holdExpiresAt &&
    isPast(new Date(detail.holdExpiresAt));

  const estimatedEndDate = calculateEstimatedEndDate(
    detail?.moveInDate,
    detail?.leaseMonths
  );

  const rentPriceToDisplay =
    detail?.effectiveMonthlyRent != null && detail.effectiveMonthlyRent > 0
      ? detail.effectiveMonthlyRent
      : detail?.monthlyRentPrice ?? 0;

  const depositBadge = getDepositBadge(undefined, undefined, false);

  const handleBackdropClick = () => {
    if (!isProcessingAction) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs overflow-y-auto animate-in fade-in-50 duration-200"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/70 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusInfo.badgeClass}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusInfo.label}</span>
            </span>
            {detail && (
              <span className="text-xs text-muted-foreground truncate">
                Mã yêu cầu: <code className="font-mono font-semibold text-foreground">#{detail.id.slice(0, 8)}</code>
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={isProcessingAction}
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer disabled:opacity-40"
            title="Đóng chi tiết"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin opacity-80" />
              <p className="text-xs text-muted-foreground font-medium">
                Đang tải thông tin chi tiết yêu cầu thuê...
              </p>
            </div>
          ) : error || !detail ? (
            <div className="p-6 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-rose-800 dark:text-rose-200">
                  Không thể tải yêu cầu
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300">
                  {error || "Yêu cầu thuê không tồn tại hoặc bạn không có quyền truy cập."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (requestId) {
                    setLoading(true);
                    setError(null);
                    rentalRequestService
                      .getRequestById(requestId)
                      .then((res) => setDetail(res))
                      .catch(() => setError("Không thể tải chi tiết yêu cầu thuê."))
                      .finally(() => setLoading(false));
                  }
                }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : (
            <>
              {/* 1. THÔNG TIN BÀI ĐĂNG */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted border border-border/50 shrink-0">
                    {isValidImageUrl(detail.listingThumbnail) ? (
                      <Image
                        src={detail.listingThumbnail!}
                        alt={detail.listingTitle || "Ảnh bài đăng"}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Home className="w-6 h-6 opacity-40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
                      Bài đăng cho thuê
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-1 mt-0.5">
                      {detail.listingTitle}
                    </h3>
                    {detail.listingAddress && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>{detail.listingAddress}</span>
                      </p>
                    )}
                    {detail.listingPrice != null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Giá niêm yết hiện tại:{" "}
                        <strong className="text-foreground font-bold">
                          {formatVND(detail.listingPrice)}
                        </strong>
                        /tháng
                      </p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onViewListing?.(detail.listingId)}
                  className="px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:text-primary hover:border-primary/50 transition-colors flex items-center gap-1.5 shrink-0 self-end sm:self-auto shadow-2xs cursor-pointer"
                >
                  <span>Xem bài đăng</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 2. THÔNG TIN KHÁCH THUÊ */}
              <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-2xs">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {mode === "RECEIVED" ? "Thông tin khách thuê" : "Thông tin của bạn"}
                  </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                    <span className="text-[11px] text-muted-foreground block">Họ và tên</span>
                    <span className="font-bold text-foreground text-sm block">
                      {detail.renterName}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                    <span className="text-[11px] text-muted-foreground block">Số điện thoại</span>
                    <a
                      href={`tel:${detail.renterPhone}`}
                      className="font-bold text-primary hover:underline text-sm flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{detail.renterPhone}</span>
                    </a>
                  </div>

                  {detail.renterEmail && (
                    <div className="sm:col-span-2 p-3 rounded-xl bg-muted/20 border border-border/60 space-y-1">
                      <span className="text-[11px] text-muted-foreground block">Email liên hệ</span>
                      <a
                        href={`mailto:${detail.renterEmail}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{detail.renterEmail}</span>
                      </a>
                    </div>
                  )}
                </div>

                {detail.renterNote && (
                  <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-primary" />
                      <span>Lời nhắn gửi chủ nhà</span>
                    </span>
                    <p className="text-xs text-foreground italic leading-relaxed pt-0.5">
                      &quot;{detail.renterNote}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* 3. ĐIỀU KIỆN THUÊ */}
              <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-2xs">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>Điều kiện thuê & Nhân khẩu</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-0.5">
                    <span className="text-[11px] text-muted-foreground block">Ngày dọn vào</span>
                    <span className="font-bold text-foreground text-sm block">
                      {detail.moveInDate ? format(new Date(detail.moveInDate), "dd/MM/yyyy") : "—"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-0.5">
                    <span className="text-[11px] text-muted-foreground block">Thời hạn thuê</span>
                    <span className="font-bold text-foreground text-sm block">
                      {detail.leaseMonths} tháng
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-0.5">
                    <span className="text-[11px] text-muted-foreground block">Dự kiến kết thúc</span>
                    <span className="font-bold text-foreground text-sm block">
                      {estimatedEndDate || "—"}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-0.5">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3 text-primary" />
                      <span>Số người ở</span>
                    </span>
                    <span className="font-bold text-foreground text-sm block">
                      {formatOccupantCount(detail.occupantCount)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-0.5">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Bike className="w-3 h-3 text-primary" />
                      <span>Xe máy</span>
                    </span>
                    <span className="font-bold text-foreground text-sm block">
                      {formatMotorbikeCount(detail.motorbikeCount)}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/20 border border-border/60 space-y-0.5">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Car className="w-3 h-3 text-primary" />
                      <span>Ô tô</span>
                    </span>
                    <span className="font-bold text-foreground text-sm block">
                      {formatCarCount(detail.carCount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. DỰ TOÁN TÀI CHÍNH TẠI THỜI ĐIỂM GỬI (SNAPSHOT) */}
              <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
                {/* Header Dự Toán */}
                <div className="border-b border-border pb-2 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Dự toán tại thời điểm gửi yêu cầu</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Các khoản dưới đây được lưu tại thời điểm khách gửi yêu cầu và không tự thay đổi khi bài đăng được chỉnh sửa.
                  </p>
                </div>

                {/* A. Đóng trước mỗi tháng */}
                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
                  <div className="flex items-baseline justify-between text-xs font-bold text-foreground border-b border-border/60 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-foreground/80" />
                      <span>Đóng trước mỗi tháng</span>
                    </div>
                    <span className="text-sm font-extrabold text-foreground">
                      {formatVND(detail.estimatedMonthlyTotal ?? rentPriceToDisplay)}
                    </span>
                  </div>

                  <div className="space-y-2 pt-0.5 text-xs">
                    {/* Tiền thuê nhà snapshot */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-foreground block">Tiền thuê nhà</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-semibold text-foreground">
                          {formatVND(rentPriceToDisplay)}
                        </span>
                        <span className="text-[11px] text-muted-foreground block">/tháng</span>
                      </div>
                    </div>

                    {/* Các khoản phí cố định hàng tháng */}
                    {payableCharges.map((c, idx) => {
                      const info = formatChargeDisplay(c);
                      return (
                        <div key={idx} className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-foreground block truncate">
                              {c.displayName}
                            </span>
                            {info.subText && (
                              <span className="text-[11px] text-muted-foreground block">
                                {info.subText}
                              </span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {info.isUnregisteredVehicle ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-background text-muted-foreground font-medium">
                                {info.mainText}
                              </span>
                            ) : (
                              <>
                                <span className="font-semibold text-foreground">
                                  {info.mainText}
                                </span>
                                <span className="text-[11px] text-muted-foreground block">/tháng</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/40">
                    * Các khoản này được thanh toán vào đầu mỗi kỳ thuê.
                  </p>
                </div>

                {/* B. Đã bao gồm hoặc miễn phí */}
                {(includedCharges.length > 0 || freeCharges.length > 0) && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2.5 text-xs">
                    {includedCharges.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Đã bao gồm trong tiền thuê</span>
                        </span>
                        <div className="flex flex-col gap-1.5 pl-5">
                          {includedCharges.map((c, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-emerald-300/80 dark:border-emerald-800 bg-background text-foreground font-medium">
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                                <span>
                                  {c.chargeType === "MANAGEMENT"
                                    ? "Phí quản lý tòa nhà"
                                    : c.displayName}
                                </span>
                              </span>
                              {c.chargeType === "MANAGEMENT" && (
                                <p className="text-[10px] text-muted-foreground pl-0.5">
                                  Phí vận hành khu vực chung như bảo vệ, vệ sinh, thang máy và tiện ích chung của tòa nhà.
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {freeCharges.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Miễn phí</span>
                        </span>
                        <div className="flex flex-wrap gap-1.5 pl-5">
                          {freeCharges.map((c, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded-md border border-emerald-300/80 dark:border-emerald-800 bg-background text-foreground font-medium flex items-center gap-1"
                            >
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                              <span>{c.displayName}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* C. Chưa tính vào tổng */}
                {(meteredCharges.length > 0 || negotiableOrCustomCharges.length > 0) && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Chưa tính vào tổng</span>
                    </div>

                    {meteredCharges.length > 0 && (
                      <div className="space-y-1.5 rounded-lg border border-amber-500/20 bg-background/70 p-2.5">
                        <span className="text-[11px] font-bold text-foreground block">
                          Tính sau theo sử dụng thực tế
                        </span>
                        <ul className="space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
                          {meteredCharges.map((c, idx) => (
                            <li key={idx} className="leading-relaxed">
                              <span className="font-semibold text-foreground">{c.displayName}:</span>{" "}
                              <span>{formatExcludedChargeValue(c)}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-muted-foreground italic pt-0.5">
                          * Các khoản này chưa nằm trong tổng dự kiến và sẽ được chốt theo số liệu sử dụng thực tế.
                        </p>
                      </div>
                    )}

                    {negotiableOrCustomCharges.length > 0 && (
                      <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/70 p-2.5">
                        <span className="text-[11px] font-bold text-foreground block">
                          Cần xác nhận hoặc tự thanh toán
                        </span>
                        <ul className="space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
                          {negotiableOrCustomCharges.map((c, idx) => (
                            <li key={idx} className="leading-relaxed">
                              <span className="font-semibold text-foreground">{c.displayName}:</span>{" "}
                              <span>{c.reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* D. Thanh toán ban đầu */}
                <div className="rounded-xl border-2 border-primary/40 bg-primary/5 dark:border-primary/50 dark:bg-primary/10 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Thanh toán ban đầu</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-md border border-primary/30 bg-background text-primary font-semibold shrink-0">
                      {depositBadge}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Chi phí tháng đầu</span>
                      <span className="font-semibold text-foreground">
                        {formatVND(detail.estimatedMonthlyTotal ?? rentPriceToDisplay)}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Tiền đặt cọc</span>
                        <span className="font-semibold text-foreground">
                          {formatVND(detail.depositAmount ?? 0)}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Khoản bảo đảm, hoàn trả theo điều kiện hợp đồng.
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-primary/10">
                    * Số tiền được thanh toán để tiếp tục giữ chỗ sau khi chủ nhà chấp thuận yêu cầu. Hệ thống tạm giữ khoản thanh toán này cho đến khi hợp đồng được hoàn tất.
                  </p>

                  <div className="border-t border-primary/20 pt-2.5 flex items-baseline justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-xs font-bold text-foreground block">
                        Tổng cần thanh toán
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        Chi phí tháng đầu + Tiền đặt cọc
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-extrabold text-primary shrink-0">
                      {formatVND(
                        detail.estimatedInitialTotal ??
                          (detail.estimatedMonthlyTotal ?? rentPriceToDisplay) + (detail.depositAmount ?? 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. LỊCH SỬ & TRẠNG THÁI */}
              <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-2xs">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Lịch sử và tiến độ</span>
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Thời điểm gửi yêu cầu:</span>
                    <span className="font-semibold text-foreground">
                      {detail.createdAt
                        ? `${format(new Date(detail.createdAt), "HH:mm:ss, dd/MM/yyyy")} (${formatDistanceToNow(new Date(detail.createdAt), { addSuffix: true, locale: vi })})`
                        : "—"}
                    </span>
                  </div>

                  {detail.updatedAt && detail.updatedAt !== detail.createdAt && (
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Cập nhật lần cuối:</span>
                      <span className="font-semibold text-foreground">
                        {format(new Date(detail.updatedAt), "HH:mm:ss, dd/MM/yyyy")}
                      </span>
                    </div>
                  )}

                  {detail.acceptedAt && (
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground">Thời điểm chấp thuận:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {format(new Date(detail.acceptedAt), "HH:mm:ss, dd/MM/yyyy")}
                      </span>
                    </div>
                  )}

                  {/* Trạng thái thanh toán và giữ chỗ */}
                  {detail.status === "ACCEPTED" && !hasExecutionContract && (
                    <>
                      {isPaymentPending && (
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600 dark:text-amber-400" />
                              <span>{mode === "SENT" ? "Chờ bạn thanh toán ban đầu" : "Chờ khách thanh toán ban đầu"}:</span>
                            </span>
                            <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400">
                              {detail.holdExpiresAt ? `còn ${formatHoldRemaining(initialPayment?.expiresAt ?? detail.holdExpiresAt, nowMs)}` : "Đang giữ chỗ"}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-90">
                            Tổng cần thanh toán: <strong className="text-foreground">{formatVND(initialPayment?.totalAmount ?? detail.estimatedInitialTotal ?? 0)}</strong>
                            {detail.holdExpiresAt && ` (hết hạn lúc ${format(new Date(initialPayment?.expiresAt ?? detail.holdExpiresAt), "HH:mm:ss, dd/MM/yyyy")})`}
                          </p>
                        </div>
                      )}

                      {isPaymentPaid && (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>{mode === "SENT" ? "Đã thanh toán ban đầu — chờ hợp đồng" : "Khách đã thanh toán ban đầu"}:</span>
                            </span>
                            <span className="font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                              {formatVND(initialPayment?.totalAmount ?? detail.estimatedInitialTotal ?? 0)}
                            </span>
                          </div>
                          <p className="text-[11px] opacity-90">
                            {initialPayment?.paidAt && `Thanh toán thành công vào lúc ${format(new Date(initialPayment.paidAt), "HH:mm:ss, dd/MM/yyyy")}. `}
                            {mode === "RECEIVED" && initialPayment?.contractDueAt && (
                              <span>Thời hạn tạo hợp đồng: <strong>còn {formatHoldRemaining(initialPayment.contractDueAt, nowMs)}</strong></span>
                            )}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {hasHoldExpired && (
                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-800 dark:text-orange-300">
                      <span className="font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        <span>Thời hạn giữ chỗ {RENTAL_HOLD_DURATION_SHORT} đã kết thúc vào lúc {format(new Date(detail.holdExpiresAt!), "HH:mm:ss, dd/MM/yyyy")}</span>
                      </span>
                    </div>
                  )}

                  {detail.rejectReason && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 space-y-1">
                      <span className="font-bold flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Lý do từ chối:</span>
                      </span>
                      <p className="text-xs italic leading-relaxed">
                        &quot;{detail.rejectReason}&quot;
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-border bg-card/80 backdrop-blur-md sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isProcessingAction}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer disabled:opacity-40"
          >
            Đóng
          </button>

          {detail && !loading && (
            <div className="flex items-center gap-2">
              {/* Chủ nhà PENDING -> Từ chối / Chấp thuận */}
              {mode === "RECEIVED" && detail.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => onReject?.(detail)}
                    className="px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer disabled:opacity-40"
                  >
                    Từ chối
                  </button>
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => onAccept?.(detail)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Chấp thuận (Giữ chỗ {RENTAL_HOLD_DURATION_SHORT})</span>
                  </button>
                </>
              )}

              {/* Khách thuê PENDING -> Hủy yêu cầu */}
              {mode === "SENT" && detail.status === "PENDING" && (
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => onCancel?.(detail)}
                  className="px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold transition-all cursor-pointer disabled:opacity-40"
                >
                  Hủy yêu cầu
                </button>
              )}

              {/* Khách thuê ACCEPTED và PENDING thanh toán -> Nút Thanh toán ban đầu */}
              {mode === "SENT" && detail.status === "ACCEPTED" && isPaymentPending && (
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => onPayMock?.(detail)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Thanh toán ban đầu</span>
                </button>
              )}

              {/* Chủ nhà ACCEPTED -> Tạo hợp đồng hoặc Xem hợp đồng */}
              {mode === "RECEIVED" && (detail.status === "ACCEPTED" || detail.status === "COMPLETED") && (
                linkedContract ? (
                  <button
                    type="button"
                    disabled={isProcessingAction}
                    onClick={() => onOpenContract?.(linkedContract.id)}
                    className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Xem / tiếp tục hợp đồng</span>
                  </button>
                ) : (
                  detail.status === "ACCEPTED" && (
                    isPaymentPaid ? (
                      <button
                        type="button"
                        disabled={isProcessingAction}
                        onClick={() => onCreateContract?.(detail)}
                        className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Tạo hợp đồng</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled
                          title="Chỉ có thể tạo hợp đồng sau khi khách thanh toán ban đầu."
                          className="px-4 py-2 rounded-xl bg-muted text-muted-foreground border border-border text-xs font-semibold cursor-not-allowed inline-flex items-center gap-1.5 opacity-60"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Tạo hợp đồng</span>
                        </button>
                        <span className="text-[11px] text-muted-foreground italic hidden sm:inline">
                          * Chỉ tạo hợp đồng sau khi khách thanh toán.
                        </span>
                      </div>
                    )
                  )
                )
              )}

              {/* Khách thuê ACCEPTED / COMPLETED -> Mở hợp đồng nếu có */}
              {mode === "SENT" && linkedContract && (
                <button
                  type="button"
                  disabled={isProcessingAction}
                  onClick={() => onOpenContract?.(linkedContract.id)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-40"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isContractActive ? "Xem hợp đồng hiệu lực" : "Mở hợp đồng"}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
