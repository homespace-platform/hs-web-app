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
  RESERVED: {
    status: "RESERVED",
    label: "Đang giữ chỗ",
    badgeClassName:
      "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    dotClassName: "bg-amber-500 animate-pulse",
    description: "Tin đăng đang được giữ chỗ trong 24 giờ cho khách thuê",
  },
  RENTED: {
    status: "RENTED",
    label: "Đã cho thuê qua HomeSpace",
    badgeClassName:
      "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    dotClassName: "bg-blue-500",
    description: "Tin đã có hợp đồng thuê hoàn tất trên HomeSpace",
  },
  RENTED_EXTERNALLY: {
    status: "RENTED_EXTERNALLY",
    label: "Cho thuê ngoài hệ thống",
    badgeClassName:
      "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    dotClassName: "bg-violet-500",
    description: "Chủ tin tự tìm được khách thuê bên ngoài HomeSpace",
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

export type ListingOwnerActionIcon =
  | "hide"
  | "show"
  | "rented"
  | "rentedExternally"
  | "resubmit";

export interface ListingOwnerAction {
  targetStatus: ListingStatus;
  label: string;
  /** Shown inside the confirmation dialog */
  title: string;
  description: string;
  icon: ListingOwnerActionIcon;
  accentClassName: string;
  confirmClassName: string;
  /** Only available while the publication window is still open */
  requiresOpenPublicationWindow?: boolean;
  /** Only available after the publication window has ended */
  requiresClosedPublicationWindow?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
}

const HIDE_ACTION: ListingOwnerAction = {
  targetStatus: "HIDDEN",
  label: "Ẩn tin",
  title: "Ẩn tin đăng",
  description:
    "Tin sẽ không còn hiển thị với khách thuê nhưng vẫn được giữ lại. Bạn có thể hiện lại trong thời hạn hiển thị còn lại.",
  icon: "hide",
  accentClassName:
    "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60",
  confirmClassName: "bg-amber-600 hover:bg-amber-700",
};

const RENTED_EXTERNALLY_ACTION: ListingOwnerAction = {
  targetStatus: "RENTED_EXTERNALLY",
  label: "Đã cho thuê ngoài hệ thống",
  title: "Đánh dấu đã cho thuê ngoài hệ thống",
  description:
    "Dùng khi bạn tự tìm được khách thuê bên ngoài HomeSpace. Tin sẽ ngừng hiển thị công khai để tránh khách liên hệ thêm.",
  icon: "rentedExternally",
  accentClassName:
    "text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60",
  confirmClassName: "bg-violet-600 hover:bg-violet-700",
  noteLabel: "Ghi chú (không bắt buộc)",
  notePlaceholder: "Ví dụ: Khách thuê tự liên hệ qua người quen, đã ký hợp đồng ngày 20/08...",
};

const AVAILABLE_AGAIN_ACTION: ListingOwnerAction = {
  targetStatus: "PUBLISHED",
  label: "Phòng trống, hiển thị lại",
  title: "Hiển thị lại tin đăng",
  description:
    "Dùng khi phòng đã trống và bạn muốn cho thuê lại trên HomeSpace. Tin sẽ hiển thị ngay trong thời hạn còn lại.",
  icon: "show",
  accentClassName:
    "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60",
  confirmClassName: "bg-emerald-600 hover:bg-emerald-700",
  requiresOpenPublicationWindow: true,
};

const REPUBLISH_ACTION: ListingOwnerAction = {
  targetStatus: "PUBLISHED",
  label: "Hiển thị lại tin",
  title: "Hiển thị lại tin đăng",
  description:
    "Tin sẽ hiển thị lại ngay với khách thuê, sử dụng thời hạn hiển thị còn lại mà không cần duyệt lại.",
  icon: "show",
  accentClassName:
    "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60",
  confirmClassName: "bg-emerald-600 hover:bg-emerald-700",
  requiresOpenPublicationWindow: true,
};

const RESUBMIT_ACTION: ListingOwnerAction = {
  targetStatus: "PENDING_REVIEW",
  label: "Gửi duyệt lại",
  title: "Gửi tin đăng đi duyệt lại",
  description:
    "Tin sẽ được gửi tới quản trị viên. Sau khi được duyệt, thời hạn hiển thị sẽ được làm mới.",
  icon: "resubmit",
  accentClassName: "text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60",
  confirmClassName: "bg-amber-600 hover:bg-amber-700",
};

const RESUBMIT_AFTER_HIDDEN_ACTION: ListingOwnerAction = {
  ...RESUBMIT_ACTION,
  description:
    "Thời hạn hiển thị đã hết. Gửi tin để quản trị viên duyệt lại và cấp thời hạn hiển thị mới.",
  requiresClosedPublicationWindow: true,
};

/**
 * Owner-initiated status transitions. Must stay in sync with
 * ListingStatusService.OWNER_TRANSITIONS on the backend.
 */
export const LISTING_OWNER_ACTIONS: Partial<Record<ListingStatus, ListingOwnerAction[]>> = {
  PUBLISHED: [HIDE_ACTION, RENTED_EXTERNALLY_ACTION],
  HIDDEN: [REPUBLISH_ACTION, RENTED_EXTERNALLY_ACTION, RESUBMIT_AFTER_HIDDEN_ACTION],
  RENTED_EXTERNALLY: [AVAILABLE_AGAIN_ACTION],
  EXPIRED: [RESUBMIT_ACTION],
  REJECTED: [RESUBMIT_ACTION],
};

export function getListingOwnerActions(
  status?: ListingStatus | null,
  expiresAt?: string | null
): ListingOwnerAction[] {
  if (!status) return [];
  const actions = LISTING_OWNER_ACTIONS[status] ?? [];
  const publicationWindowOpen = Boolean(expiresAt && new Date(expiresAt).getTime() > Date.now());
  return actions.filter((action) => {
    if (action.requiresOpenPublicationWindow && !publicationWindowOpen) return false;
    if (action.requiresClosedPublicationWindow && publicationWindowOpen) return false;
    return true;
  });
}
