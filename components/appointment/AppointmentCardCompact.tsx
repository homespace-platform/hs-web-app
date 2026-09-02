"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Users,
  Building,
  ExternalLink,
  Eye,
  Check,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarCheck,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type {
  AppointmentResponse,
  AppointmentStatus,
} from "@/types/appointment.type";

interface AppointmentCardCompactProps {
  appointment: AppointmentResponse;
  viewRole: "OWNER" | "RENTER";
  onViewDetail: (apt: AppointmentResponse) => void;
  onQuickApprove?: (apt: AppointmentResponse) => void;
  onQuickReject?: (apt: AppointmentResponse) => void;
  onQuickComplete?: (apt: AppointmentResponse) => void;
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

export default function AppointmentCardCompact({
  appointment,
  viewRole,
  onViewDetail,
  onQuickApprove,
  onQuickReject,
  onQuickComplete,
}: AppointmentCardCompactProps) {
  const statusConfig = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = statusConfig.icon;

  return (
    <div
      onClick={() => onViewDetail(appointment)}
      className="group bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-md cursor-pointer flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
    >
      {/* KHỐI 1: BẤT ĐỘNG SẢN */}
      <div className="flex items-center gap-3.5 min-w-0 w-full lg:w-72 shrink-0">
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
          {isValidImageUrl(appointment.listingThumbnail) ? (
            <Image
              src={appointment.listingThumbnail!}
              alt={appointment.listingTitle || "Ảnh tin đăng"}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              <Building className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {appointment.listingTitle}
          </h4>
          {appointment.listingAddress && (
            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
              {appointment.listingAddress}
            </p>
          )}
          {appointment.listingPrice && (
            <p className="text-xs font-bold text-primary mt-0.5">
              {formatVND(appointment.listingPrice)} / tháng
            </p>
          )}
        </div>
      </div>

      {/* KHỐI 2: THỜI GIAN VÀ ĐỐI TÁC */}
      <div className="flex-1 min-w-0 w-full grid grid-cols-1 sm:grid-cols-2 gap-3 border-t lg:border-t-0 lg:border-l border-border pt-3 lg:pt-0 lg:pl-4">
        {/* Thời gian xem */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground">
            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{formatDateLabel(appointment.appointmentDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>
              {appointment.startTime.slice(0, 5)} – {appointment.endTime.slice(0, 5)}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] font-medium">
              {SLOT_TYPE_LABELS[appointment.slotType] || appointment.slotType}
            </span>
          </div>
        </div>

        {/* Thông tin đối tác */}
        <div className="space-y-1">
          {viewRole === "OWNER" ? (
            <>
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{appointment.renterName}</span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  ({appointment.visitorCount} người)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>{appointment.renterPhone}</span>
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-foreground line-clamp-1">
                <span className="text-muted-foreground">Lời dặn: </span>
                <span className="italic font-medium">
                  {appointment.ownerNote ? `"${appointment.ownerNote}"` : "Không có lời dặn"}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {appointment.visitorCount > 1
                  ? `Đi cùng: ${appointment.visitorCount} người`
                  : "Đi xem một mình"}
              </div>
            </>
          )}
        </div>

        {/* Banner nhỏ nếu có yêu cầu dời lịch */}
        {appointment.rescheduleRequested && (
          <div className="col-span-1 sm:col-span-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin text-amber-600 shrink-0" />
            <span>
              Khách xin đổi sang:{" "}
              <strong>{formatDateLabel(appointment.proposedDate)}</strong> ({appointment.proposedStartTime?.slice(0, 5)} – {appointment.proposedEndTime?.slice(0, 5)})
            </span>
          </div>
        )}
      </div>

      {/* KHỐI 3: TRẠNG THÁI VÀ THAO TÁC */}
      <div
        className="flex items-center justify-between lg:justify-end gap-3 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${statusConfig.badgeClass}`}
        >
          <StatusIcon className="w-3 h-3" />
          <span>{statusConfig.label}</span>
        </span>

        {/* Nút thao tác nhanh hoặc Xem chi tiết */}
        <div className="flex items-center gap-2">
          {viewRole === "OWNER" && appointment.status === "PENDING" && onQuickApprove && (
            <button
              type="button"
              onClick={() => onQuickApprove(appointment)}
              className="px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer flex items-center gap-1"
              title="Chấp nhận lịch hẹn"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Duyệt</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onViewDetail(appointment)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:text-primary hover:border-primary/50 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
            <span>Chi tiết</span>
          </button>
        </div>
      </div>
    </div>
  );
}
