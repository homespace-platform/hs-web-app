"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Edit,
  Eye,
  Building,
  Home,
  Briefcase,
  Store,
  DoorOpen,
  AlertTriangle,
  Calendar,
  Layers,
} from "lucide-react";
import type { ListingCategory, MyListingSummaryResponse } from "@/types/listing.type";
import { getListingStatusConfig } from "@/config/listing-status.config";
import ListingStatusActionMenu from "@/app/dashboard/properties/components/ListingStatusActionMenu";

const CATEGORY_ICONS: Record<ListingCategory, React.ReactNode> = {
  APARTMENT: <Building className="h-3.5 w-3.5" />,
  HOUSE: <Home className="h-3.5 w-3.5" />,
  OFFICE: <Briefcase className="h-3.5 w-3.5" />,
  COMMERCIAL_SPACE: <Store className="h-3.5 w-3.5" />,
  ROOM: <DoorOpen className="h-3.5 w-3.5" />,
};

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  APARTMENT: "Căn hộ",
  HOUSE: "Nhà nguyên căn",
  OFFICE: "Văn phòng",
  COMMERCIAL_SPACE: "Mặt bằng",
  ROOM: "Nhà trọ / Phòng",
};

function formatCurrency(amount: number): string {
  if (!amount || amount <= 0) return "Thỏa thuận";
  if (amount >= 1_000_000_000) {
    return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ`;
  }
  if (amount >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")} triệu`;
  }
  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

interface ListingPropertyCardProps {
  item: MyListingSummaryResponse;
  onStatusChanged?: () => void;
  showBranchBadge?: boolean;
}

export default function ListingPropertyCard({
  item,
  onStatusChanged,
  showBranchBadge = true,
}: ListingPropertyCardProps) {
  const router = useRouter();
  const statusConfig = getListingStatusConfig(item.status);
  const canEdit = item.status !== "VIOLATION";

  const handleOpenDetail = () => {
    router.push(`/rent/${item.id}`);
  };

  const handleEditListing = () => {
    router.push(`/dashboard/properties/new?id=${item.id}`);
  };

  return (
    <div className="group relative flex flex-col sm:flex-row overflow-hidden rounded-2xl border border-border bg-card transition-all hover:border-primary/40 hover:shadow-md">
      {/* Cover Image Thumbnail */}
      <div
        onClick={handleOpenDetail}
        className="relative h-48 sm:h-auto sm:w-56 shrink-0 bg-muted cursor-pointer overflow-hidden"
      >
        {item.coverImageUrl ? (
          <Image
            src={item.coverImageUrl}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground bg-muted">
            <Building className="h-10 w-10 opacity-40" />
          </div>
        )}

        {/* Category Pill on Image */}
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-lg bg-black/65 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs">
          {CATEGORY_ICONS[item.category] || <Building className="h-3 w-3" />}
          <span>{CATEGORY_LABELS[item.category] || item.category}</span>
        </span>

        {/* Media Count */}
        {item.mediaCount > 0 && (
          <span className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
            <Layers className="h-3 w-3" />
            {item.mediaCount} ảnh
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5 space-y-3">
        <div>
          {/* Status & Subtype Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${statusConfig.badgeClassName}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotClassName}`} />
                {statusConfig.label}
              </span>
              {showBranchBadge && item.branchName && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Building className="h-3 w-3" />
                  {item.branchName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Đăng: {formatDate(item.createdAt)}</span>
            </div>
          </div>

          {/* Title */}
          <h2
            onClick={handleOpenDetail}
            className="text-sm sm:text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer line-clamp-2"
          >
            {item.title}
          </h2>

          {/* Address */}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="truncate">
              {item.fullAddress || "Chưa có thông tin địa chỉ"}
            </span>
          </p>

          {/* Price & Area Specs */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-primary text-sm sm:text-base">
              {formatCurrency(item.priceAmount)}
              <span className="text-[11px] font-normal text-muted-foreground">
                /{item.priceUnit === "M2_MONTH" ? "m²/tháng" : "tháng"}
              </span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="font-semibold text-foreground">{item.areaM2} m²</span>
            {item.availableFrom && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground text-[11px]">
                  Vào ở từ: {formatDate(item.availableFrom)}
                </span>
              </>
            )}
          </div>

          {/* Status Reason Alert for REJECTED or VIOLATION */}
          {item.statusReason && (item.status === "REJECTED" || item.status === "VIOLATION") && (
            <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-2.5 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <span className="font-bold">
                  {item.status === "VIOLATION" ? "Lý do khóa tin: " : "Lý do từ chối: "}
                </span>
                <span>{item.statusReason}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/60">
          <div className="text-[11px] text-muted-foreground">
            {item.publishedAt ? (
              <span>Duyệt ngày: {formatDate(item.publishedAt)}</span>
            ) : item.submittedAt ? (
              <span>Gửi duyệt: {formatDate(item.submittedAt)}</span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Xem chi tiết */}
            <button
              type="button"
              onClick={handleOpenDetail}
              className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Xem</span>
            </button>

            {/* Chỉnh sửa (nếu không phải VIOLATION) */}
            {canEdit && (
              <button
                type="button"
                onClick={handleEditListing}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Sửa</span>
              </button>
            )}

            {/* Đổi trạng thái menu */}
            <ListingStatusActionMenu
              listing={{
                id: item.id,
                title: item.title,
                status: item.status,
                expiresAt: item.expiresAt,
              }}
              onChanged={() => {
                if (onStatusChanged) onStatusChanged();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
