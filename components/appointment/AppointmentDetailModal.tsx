"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  Users,
  MessageSquare,
  Building,
  ExternalLink,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarCheck,
  RefreshCw,
  Info,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type {
  AppointmentResponse,
  AppointmentStatus,
} from "@/types/appointment.type";

interface AppointmentDetailModalProps {
  appointment: AppointmentResponse | null;
  isOpen: boolean;
  onClose: () => void;
  viewRole: "OWNER" | "RENTER";
  onApprove?: (apt: AppointmentResponse) => void;
  onReject?: (apt: AppointmentResponse) => void;
  onComplete?: (apt: AppointmentResponse) => void;
  onCancel?: (apt: AppointmentResponse) => void;
  onApproveReschedule?: (apt: AppointmentResponse) => void;
  onRejectReschedule?: (apt: AppointmentResponse) => void;
  onRequestReschedule?: (apt: AppointmentResponse) => void;
}

const formatVND = (price: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);

function isValidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/");
}

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: "Chờ xác nhận",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Đã từ chối",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
    icon: XCircle,
  },
  CANCELLED: {
    label: "Đã hủy",
    badgeClass: "bg-muted text-muted-foreground border border-border",
    icon: XCircle,
  },
  COMPLETED: {
    label: "Đã hoàn thành",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    icon: CalendarCheck,
  },
  EXPIRED: {
    label: "Quá hạn",
    badgeClass: "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20",
    icon: AlertCircle,
  },
};

const CANCELLED_BY_LABELS: Record<string, string> = {
  RENTER: "Khách hàng hủy",
  OWNER: "Chủ nhà hủy",
  SYSTEM: "Hệ thống tự động hủy",
};

const SLOT_TYPE_LABELS: Record<string, string> = {
  MORNING: "Buổi sáng",
  AFTERNOON: "Buổi chiều",
  EVENING: "Buổi tối",
};

function formatDateLabel(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return format(date, "EEEE, dd/MM/yyyy", { locale: vi });
  } catch {
    return dateStr;
  }
}

export default function AppointmentDetailModal({
  appointment,
  isOpen,
  onClose,
  viewRole,
  onApprove,
  onReject,
  onComplete,
  onCancel,
  onApproveReschedule,
  onRejectReschedule,
  onRequestReschedule,
}: AppointmentDetailModalProps) {
  if (!isOpen || !appointment) return null;

  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs overflow-y-auto animate-in fade-in-50 duration-200">
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.badgeClass}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusConfig.label}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Mã: <code className="font-mono">{appointment.id.slice(0, 8)}</code>
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 no-scrollbar">
          {/* 1. Tin đăng Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                {isValidImageUrl(appointment.listingThumbnail) ? (
                  <Image
                    src={appointment.listingThumbnail!}
                    alt={appointment.listingTitle || "Ảnh tin đăng"}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Building className="w-6 h-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-1">
                  {appointment.listingTitle}
                </h3>
                {appointment.listingAddress && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{appointment.listingAddress}</span>
                  </p>
                )}
                {appointment.listingPrice && (
                  <p className="text-xs sm:text-sm font-bold text-primary mt-1">
                    {formatVND(appointment.listingPrice)} / tháng
                  </p>
                )}
              </div>
            </div>

            <Link
              href={`/rent/${appointment.listingId}`}
              target="_blank"
              className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:text-primary hover:border-primary/50 transition-colors flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
            >
              <span>Xem tin đăng</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 2. Banner Cảnh Báo Nếu Có Yêu Cầu Đổi Lịch */}
          {appointment.rescheduleRequested && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                  Yêu cầu dời lịch hẹn đang chờ duyệt
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground">Ngày mới đề xuất:</span>
                  <p className="font-bold text-foreground mt-0.5">
                    {formatDateLabel(appointment.proposedDate)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card border border-border">
                  <span className="text-muted-foreground">Khung giờ mới:</span>
                  <p className="font-bold text-foreground mt-0.5">
                    {appointment.proposedStartTime?.slice(0, 5)} –{" "}
                    {appointment.proposedEndTime?.slice(0, 5)}
                  </p>
                </div>
              </div>

              {appointment.rescheduleReason && (
                <div className="text-xs text-muted-foreground pt-1">
                  <strong>Lý do xin đổi: </strong>
                  <span className="italic text-foreground">&ldquo;{appointment.rescheduleReason}&rdquo;</span>
                </div>
              )}

              {/* Action buttons cho chủ nhà đối với yêu cầu đổi lịch */}
              {viewRole === "OWNER" && (
                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onApproveReschedule?.(appointment);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Đồng ý đổi lịch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRejectReschedule?.(appointment);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    Từ chối đổi
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 3. Grid 2 Cột: Thời gian xem nhà & Thông tin người liên hệ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cột 1: Thời gian hẹn */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Thời gian hẹn xem nhà
              </span>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Ngày xem</p>
                    <p className="font-bold text-foreground">
                      {formatDateLabel(appointment.appointmentDate)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-[11px] text-muted-foreground">Khung giờ</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-bold text-foreground">
                        {appointment.startTime.slice(0, 5)} – {appointment.endTime.slice(0, 5)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
                        {SLOT_TYPE_LABELS[appointment.slotType] || appointment.slotType}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột 2: Thông tin Người đi xem (hoặc của bạn) */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-border space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {viewRole === "OWNER" ? "Khách hàng liên hệ" : "Thông tin của bạn"}
              </span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-bold text-foreground">{appointment.renterName}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                  <a
                    href={`tel:${appointment.renterPhone}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {appointment.renterPhone}
                  </a>
                </div>

                {appointment.renterEmail && (
                  <div className="flex items-center gap-2.5">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">{appointment.renterEmail}</span>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    Số người đi cùng: <strong className="text-foreground">{appointment.visitorCount} người</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Ghi chú của khách */}
          {appointment.renterNote && (
            <div className="p-3.5 rounded-xl bg-card border border-border text-xs space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                Ghi chú từ người đặt:
              </p>
              <p className="text-muted-foreground italic pl-5">
                &ldquo;{appointment.renterNote}&rdquo;
              </p>
            </div>
          )}

          {/* 5. Lời dặn từ chủ nhà */}
          {appointment.ownerNote && (
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-primary" />
                Lời dặn từ chủ nhà:
              </p>
              <p className="text-foreground font-medium italic pl-5">
                &ldquo;{appointment.ownerNote}&rdquo;
              </p>
            </div>
          )}

          {/* 6. Lý do từ chối hoặc hủy */}
          {appointment.rejectReason && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
              <strong>Lý do từ chối: </strong>
              <span>{appointment.rejectReason}</span>
            </div>
          )}

          {appointment.cancelReason && (
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
              <strong>
                Lý do hủy
                {appointment.cancelledBy ? ` (${CANCELLED_BY_LABELS[appointment.cancelledBy] || appointment.cancelledBy})` : ""}
                :{" "}
              </strong>
              <span>{appointment.cancelReason}</span>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 px-6 py-4 border-t border-border bg-card/60 backdrop-blur-md">
          {/* Nút đóng */}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
          >
            Đóng
          </button>

          {/* CÁC THAO TÁC CỦA CHỦ NHÀ */}
          {viewRole === "OWNER" && (
            <>
              {appointment.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onReject?.(appointment);
                    }}
                    className="px-4 py-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold transition-all cursor-pointer"
                  >
                    Từ chối lịch hẹn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onApprove?.(appointment);
                    }}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Chấp nhận & Khóa lịch</span>
                  </button>
                </>
              )}

              {appointment.status === "CONFIRMED" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCancel?.(appointment);
                    }}
                    className="px-4 py-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold transition-all cursor-pointer"
                  >
                    Hủy lịch hẹn
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onComplete?.(appointment);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>Đã tiếp khách xong</span>
                  </button>
                </>
              )}
            </>
          )}

          {/* CÁC THAO TÁC CỦA KHÁCH THUÊ */}
          {viewRole === "RENTER" && (
            <>
              {["PENDING", "CONFIRMED"].includes(appointment.status) && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onCancel?.(appointment);
                    }}
                    className="px-4 py-2 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-bold transition-all cursor-pointer"
                  >
                    Hủy lịch hẹn
                  </button>
                  {!appointment.rescheduleRequested && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestReschedule?.(appointment);
                      }}
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Yêu cầu đổi lịch</span>
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
