import type { ListingStatus } from "@/types/listing.type";

export interface ListingStatusConfigItem {
  status: ListingStatus;
  label: string;
  badgeClassName: string;
  dotClassName: string;
  description: string;
}

export const LISTING_STATUS_CONFIG: Record<ListingStatus, ListingStatusConfigItem> = {
  DRAFT: {
    status: "DRAFT",
    label: "Tin nháp",
    badgeClassName:
      "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    dotClassName: "bg-slate-500",
    description: "Tin đăng đang được soạn thảo, chưa gửi duyệt",
  },
  PENDING_REVIEW: {
    status: "PENDING_REVIEW",
    label: "Chờ duyệt",
    badgeClassName:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    dotClassName: "bg-amber-500 animate-pulse",
    description: "Đã gửi đến quản trị viên và đang chờ duyệt",
  },
  PUBLISHED: {
    status: "PUBLISHED",
    label: "Đang hiển thị",
    badgeClassName:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dotClassName: "bg-emerald-500",
    description: "Tin đăng đã được duyệt và hiển thị công khai trên hệ thống",
  },
  RENTED: {
    status: "RENTED",
    label: "Đã cho thuê",
    badgeClassName:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    dotClassName: "bg-blue-500",
    description: "Bất động sản đã có khách thuê",
  },
  EXPIRED: {
    status: "EXPIRED",
    label: "Hết hạn",
    badgeClassName:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
    dotClassName: "bg-zinc-400",
    description: "Tin đăng đã hết thời hạn hiển thị",
  },
  REJECTED: {
    status: "REJECTED",
    label: "Bị từ chối",
    badgeClassName:
      "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    dotClassName: "bg-rose-500",
    description: "Tin đăng bị từ chối duyệt do chưa đạt yêu cầu",
  },
  HIDDEN: {
    status: "HIDDEN",
    label: "Đã ẩn",
    badgeClassName:
      "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400 border-stone-200 dark:border-stone-700",
    dotClassName: "bg-stone-400",
    description: "Tin đăng đã được tạm ẩn",
  },
  VIOLATION: {
    status: "VIOLATION",
    label: "Vi phạm",
    badgeClassName:
      "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800",
    dotClassName: "bg-red-600",
    description: "Tin đăng vi phạm quy chuẩn cộng đồng và đã bị khóa",
  },
};

export function getListingStatusConfig(
  status?: ListingStatus | string | null
): ListingStatusConfigItem {
  if (status && status in LISTING_STATUS_CONFIG) {
    return LISTING_STATUS_CONFIG[status as ListingStatus];
  }
  return LISTING_STATUS_CONFIG.DRAFT;
}
