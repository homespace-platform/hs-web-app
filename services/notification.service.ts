import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import {
  FEED_MAX_LIMIT,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationFeedPage,
  type NotificationFeedQuery,
  type NotificationFilterCategory,
  type NotificationItem,
  type NotificationPreferenceItem,
} from "@/types/notification.type";

const BASE_PATH = "/api/v1/notifications";
const ACTION_PATH_MAX = 500;
// Same-origin relative path only: one leading "/", no scheme, no backslash,
// no whitespace/control characters (blocks "//host", "/\host", "javascript:").
const ACTION_PATH_PATTERN = /^\/(?!\/)[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/;

export function isSafeActionPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= ACTION_PATH_MAX &&
    ACTION_PATH_PATTERN.test(value) &&
    !value.includes("://") &&
    !/(^|\/)\.\.(\/|$|\?|#)/.test(value)
  );
}

export function getSafeActionPath(value: unknown): string | null {
  return isSafeActionPath(value) ? value : null;
}

export function isNotificationUnread(item: Pick<NotificationItem, "readAt">): boolean {
  return item.readAt === null || item.readAt === undefined;
}

export function formatNotificationDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : "";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export interface NotificationCategoryMeta {
  category: NotificationCategory;
  label: string;
  tag: string;
  settingsTitle: string;
  settingsDescription: string;
}

export const NOTIFICATION_CATEGORY_META: Record<
  NotificationCategory,
  NotificationCategoryMeta
> = {
  LISTING: {
    category: "LISTING",
    label: "Tin đăng",
    tag: "Tin đăng",
    settingsTitle: "Tin đăng cho thuê",
    settingsDescription:
      "Cập nhật trạng thái duyệt tin, hết hạn hiển thị và hoạt động tin đăng",
  },
  CONTRACT: {
    category: "CONTRACT",
    label: "Hợp đồng",
    tag: "Hợp đồng",
    settingsTitle: "Hợp đồng thuê & Đặt cọc",
    settingsDescription:
      "Tiến độ tạo hợp đồng, ký số, phụ lục và biên bản bàn giao",
  },
  PAYMENT: {
    category: "PAYMENT",
    label: "Thanh toán",
    tag: "Thanh toán",
    settingsTitle: "Thanh toán & Hóa đơn",
    settingsDescription:
      "Nhắc hạn tiền thuê, tiền cọc, hóa đơn hàng tháng và biên lai giao dịch",
  },
  APPOINTMENT: {
    category: "APPOINTMENT",
    label: "Lịch hẹn",
    tag: "Lịch hẹn",
    settingsTitle: "Lịch hẹn xem nhà",
    settingsDescription:
      "Yêu cầu đặt lịch, xác nhận hoặc thay đổi lịch hẹn xem bất động sản",
  },
  RENTAL_REQUEST: {
    category: "RENTAL_REQUEST",
    label: "Yêu cầu thuê",
    tag: "Yêu cầu thuê",
    settingsTitle: "Yêu cầu thuê",
    settingsDescription:
      "Cập nhật yêu cầu thuê, giữ chỗ, hủy thuê, đổi ngày bắt đầu và tiếp tục thuê",
  },
  CHAT: {
    category: "CHAT",
    label: "Tin nhắn",
    tag: "Tin nhắn",
    settingsTitle: "Tin nhắn trao đổi",
    settingsDescription:
      "Thông báo khi có tin nhắn mới từ chủ nhà hoặc khách thuê",
  },
  ACCOUNT: {
    category: "ACCOUNT",
    label: "Tài khoản",
    tag: "Tài khoản",
    settingsTitle: "Tài khoản & Bảo mật",
    settingsDescription:
      "Xác thực danh tính eKYC, bảo mật đăng nhập và cập nhật hồ sơ",
  },
  SYSTEM: {
    category: "SYSTEM",
    label: "Hệ thống",
    tag: "Hệ thống",
    settingsTitle: "Hệ thống & Bản tin",
    settingsDescription:
      "Thông báo bảo trì, cập nhật tính năng và thông tin chung từ HomeSpace",
  },
};

export const NOTIFICATION_FILTER_TABS: ReadonlyArray<{
  id: NotificationFilterCategory;
  label: string;
}> = [
  { id: "ALL", label: "Tất cả" },
  { id: "LISTING", label: "Tin đăng" },
  { id: "CONTRACT", label: "Hợp đồng" },
  { id: "PAYMENT", label: "Thanh toán" },
  { id: "APPOINTMENT", label: "Lịch hẹn" },
  { id: "RENTAL_REQUEST", label: "Yêu cầu thuê" },
  { id: "CHAT", label: "Tin nhắn" },
  { id: "ACCOUNT", label: "Tài khoản" },
  { id: "SYSTEM", label: "Hệ thống" },
];

export function getCategoryMeta(category: NotificationCategory): NotificationCategoryMeta {
  return (
    NOTIFICATION_CATEGORY_META[category] ?? {
      category: "SYSTEM",
      label: "Hệ thống",
      tag: "Hệ thống",
      settingsTitle: "Hệ thống",
      settingsDescription: "Thông báo hệ thống",
    }
  );
}

const APPOINTMENT_TYPE_TAGS: Record<string, string> = {
  BOOKING_REQUESTED: "Đặt mới",
  BOOKING_CONFIRMED: "Xác nhận",
  BOOKING_REJECTED: "Từ chối",
  BOOKING_RESCHEDULE_REQUESTED: "Đổi lịch",
  BOOKING_RESCHEDULE_APPROVED: "Đổi lịch ✓",
  BOOKING_RESCHEDULE_REJECTED: "Đổi lịch ×",
  BOOKING_CANCELLED: "Đã hủy",
  BOOKING_COMPLETED: "Hoàn tất",
  BOOKING_EXPIRED: "Hết hạn",
};

const LISTING_TYPE_TAGS: Record<string, string> = {
  LISTING_CREATED: "Tạo tin",
  LISTING_UPDATED: "Cập nhật",
  LISTING_APPROVED: "Đã duyệt",
  LISTING_REJECTED: "Từ chối",
  LISTING_EDIT_APPROVED: "Sửa đã duyệt",
  LISTING_EDIT_REJECTED: "Sửa bị từ chối",
  LISTING_EXPIRED: "Hết hạn",
};

const LISTING_STATUS_TAGS: Record<string, string> = {
  PENDING_REVIEW: "Chờ duyệt",
  HIDDEN: "Đã ẩn",
  VIOLATION: "Vi phạm",
  RENTED_EXTERNALLY: "Đã cho thuê",
};

const RENTAL_REQUEST_TYPE_TAGS: Record<string, string> = {
  RENTAL_REQUEST_SUBMITTED: "Yêu cầu mới",
  RENTAL_REQUEST_ACCEPTED: "Chấp nhận",
  RENTAL_REQUEST_REJECTED: "Từ chối",
  RENTAL_REQUEST_AUTO_REJECTED: "Tự động từ chối",
  RENTAL_REQUEST_CANCELLED: "Đã hủy",
  RENTAL_REQUEST_EXPIRED: "Hết hạn",
  RENTAL_HOLD_EXPIRED: "Hết hạn giữ chỗ",
  RENTAL_CANCELLATION_REQUESTED: "Yêu cầu hủy",
  RENTAL_CANCELLATION_REFUND_PENDING: "Chờ hoàn tiền",
  RENTAL_CANCELLATION_REJECTED: "Từ chối hủy",
  RENTAL_CANCELLATION_WITHDRAWN: "Rút yêu cầu hủy",
  RENTAL_CANCELLATION_DISPUTED: "Tranh chấp hủy",
  RENTAL_START_CHANGE_REQUESTED: "Đổi ngày",
  RENTAL_START_CHANGE_APPROVED: "Đổi ngày ✓",
  RENTAL_START_CHANGE_REJECTED: "Đổi ngày ×",
  RENTAL_START_CHANGE_WITHDRAWN: "Rút đổi ngày",
  RENTAL_START_CHANGE_EXPIRED: "Đổi ngày hết hạn",
  RENTAL_SIGNING_WINDOW_REOPENED: "Mở lại ký",
  RENTAL_HOLD_EXTENDED: "Gia hạn giữ chỗ",
  RENTAL_DEFAULT_NOTICE_ISSUED: "Thông báo vi phạm",
  RENTAL_DEFAULT_DISPUTED: "Tranh chấp vi phạm",
  RENTAL_REQUEST_CANCELLED_BY_SYSTEM: "Hệ thống hủy",
  RENTAL_RESUME_REQUESTED: "Yêu cầu tiếp tục",
  RENTAL_RESUMED: "Đã tiếp tục",
  RENTAL_RESUME_REJECTED: "Từ chối tiếp tục",
  RENTAL_RESUME_WITHDRAWN: "Rút yêu cầu tiếp tục",
};

const ACCOUNT_TYPE_TAGS: Record<string, string> = {
  ACCOUNT_ROLE_CHANGED: "Đổi vai trò",
  ACCOUNT_DISABLED: "Đã vô hiệu hóa",
  ACCOUNT_ENABLED: "Đã kích hoạt lại",
};

const PAYMENT_TYPE_TAGS: Record<string, string> = {
  MEMBERSHIP_ACTIVATED: "Kích hoạt gói",
  MEMBERSHIP_PAYMENT_REVIEW: "Chờ đối soát",
  PAYMENT_REQUEST_CREATED: "Yêu cầu chuyển khoản",
  PAYMENT_OBLIGATION_OVERDUE: "Khoản chuyển khoản quá hạn",
  PAYMENT_TRANSFER_REPORTED: "Đã báo chuyển khoản",
  PAYMENT_RECEIPT_CONFIRMED: "Đã xác nhận nhận",
  PAYMENT_RECEIPT_REJECTED: "Chưa xác nhận",
  PAYMENT_DISPUTE_OPENED: "Mở đối soát",
  PAYMENT_DISPUTE_EVIDENCE_ADDED: "Bổ sung chứng cứ",
  PAYMENT_DISPUTE_PROPOSED: "Đề xuất đối soát",
  PAYMENT_DISPUTE_PROPOSAL_DECLINED: "Từ chối đề xuất",
  PAYMENT_DISPUTE_ESCALATED: "Chuyển cấp đối soát",
  PAYMENT_DISPUTE_REVIEW_TRANSFER: "Xem lại chuyển khoản",
  PAYMENT_DISPUTE_REOPENED: "Mở lại thanh toán",
};

// Invoice lifecycle notices (PAYMENT category). They open /dashboard/invoices/<contractId>?section=monthly&invoice=<id>
// and only invalidate the invoice page; they never feed payment/membership recovery.
const INVOICE_TYPE_TAGS: Record<string, string> = {
  INVOICE_DRAFT_READY: "Bản nháp hóa đơn",
  INVOICE_ISSUED: "Đã phát hành",
  INVOICE_OVERDUE: "Quá hạn",
  INVOICE_AMOUNT_UPDATED: "Đổi số tiền",
  INVOICE_EXTENSION_REQUESTED: "Xin gia hạn",
  INVOICE_EXTENSION_APPROVED: "Gia hạn ✓",
  INVOICE_EXTENSION_REJECTED: "Gia hạn ×",
  INVOICE_EXTENSION_EXPIRED: "Gia hạn hết hạn",
  INVOICE_OVERDUE_ACTION_RECORDED: "Xử lý quá hạn",
  INVOICE_OVERDUE_ACTION_ACKNOWLEDGED: "Đã phản hồi quá hạn",
  INVOICE_DEFERRED: "Cộng dồn nợ",
  INVOICE_ROLLED_OVER: "Đã chuyển nợ",
  INVOICE_OVERDUE_ACTION_REQUIRED: "Cần xử lý quá hạn",
};

export function isInvoiceNotificationType(type: unknown): boolean {
  return typeof type === "string" && Object.hasOwn(INVOICE_TYPE_TAGS, type);
}

// Move-in handover record notices (CONTRACT category). They open
// /dashboard/invoices/<contractId>?section=deposit&workflow=move-in and only invalidate the handover panel.
const MOVE_IN_HANDOVER_TYPE_TAGS: Record<string, string> = {
  MOVE_IN_HANDOVER_PROPOSED: "Biên bản bàn giao",
  MOVE_IN_HANDOVER_CONFIRMED: "Đã xác nhận bàn giao",
  MOVE_IN_HANDOVER_COMPLETED: "Hoàn tất bàn giao",
  MOVE_IN_HANDOVER_DISPUTED: "Bàn giao có tranh chấp",
  MOVE_IN_HANDOVER_READY: "Có thể lập biên bản",
};

export function isMoveInHandoverNotificationType(type: unknown): boolean {
  return typeof type === "string" && Object.hasOwn(MOVE_IN_HANDOVER_TYPE_TAGS, type);
}

// Agreement signing notices (CONTRACT category). data/metadata are exactly {agreementId, agreementKind}; the id is the signing
// envelope (a child id is allowed). They open /dashboard/contracts/<agreementId> and only invalidate that exact document.
const AGREEMENT_TYPE_TAGS: Record<string, string> = {
  AGREEMENT_REVIEW_READY: "Văn bản để rà soát",
  AGREEMENT_SIGNING_TURN: "Đến lượt ký",
  AGREEMENT_FULLY_SIGNED: "Đủ chữ ký",
  AGREEMENT_SIGNATURE_NEEDS_REVIEW: "Cần kiểm tra chữ ký",
};

export function isAgreementNotificationType(type: unknown): boolean {
  return typeof type === "string" && Object.hasOwn(AGREEMENT_TYPE_TAGS, type);
}

const AMENDMENT_TYPE_TAGS: Record<string, string> = {
  AMENDMENT_RESPONSE_NEEDED: "Cần phản hồi phụ lục",
  AMENDMENT_DECIDED: "Đã phản hồi phụ lục",
  AMENDMENT_WITHDRAWN: "Đã rút đề nghị",
  AMENDMENT_EXPIRED: "Đề nghị hết hạn",
  AMENDMENT_APPLIED: "Phụ lục áp dụng",
};

export function isAmendmentNotificationType(type: unknown): boolean {
  return typeof type === "string" && Object.hasOwn(AMENDMENT_TYPE_TAGS, type);
}

const RENEWAL_TYPE_TAGS: Record<string, string> = {
  RENEWAL_REQUESTED: "Yêu cầu gia hạn",
  RENEWAL_APPROVED: "Gia hạn được duyệt",
  RENEWAL_REJECTED: "Gia hạn bị từ chối",
  RENEWAL_EXPIRED: "Gia hạn hết hạn",
};

export function isRenewalNotificationType(type: unknown): boolean {
  return typeof type === "string" && Object.hasOwn(RENEWAL_TYPE_TAGS, type);
}

const TERMINATION_TYPE_TAGS: Record<string, string> = {
  TERMINATION_RESPONSE_NEEDED: "Cần phản hồi chấm dứt", TERMINATION_AGREED: "Đã đồng ý chấm dứt",
  TERMINATION_DECLINED: "Đã từ chối chấm dứt", TERMINATION_WITHDRAWN: "Đã rút đề nghị",
  TERMINATION_NOTICE_ISSUED: "Quyết định chấm dứt", TERMINATION_REVIEW_REQUESTED: "Cần xem xét quyết định",
  TERMINATION_REVIEW_APPROVED: "Đã đổi phương án", TERMINATION_NOTICE_CANCELLED: "Đã rút quyết định",
  TERMINATION_ENDED: "Hợp đồng chấm dứt", LEASE_EXPIRED: "Hết thời hạn thuê",
};

export function isTerminationNotificationType(type: unknown): boolean {
  return typeof type === "string" && Object.hasOwn(TERMINATION_TYPE_TAGS, type);
}

const RETURN_SETTLEMENT_TYPE_TAGS: Record<string, string> = {
  LEASE_RETURN_CONFIRMED: "Xác nhận trả nhà", LEASE_RETURN_COMPLETED: "Đã ghi nhận trả nhà",
  SETTLEMENT_RESPONSE_NEEDED: "Cần phản hồi quyết toán", SETTLEMENT_DISPUTED: "Cần đối soát quyết toán",
  SETTLEMENT_PROPOSAL_INVALIDATED: "Cần lập lại quyết toán", SETTLEMENT_AGREED: "Đã đồng ý quyết toán",
  SETTLEMENT_RESPONSE_OVERDUE: "Quá hạn phản hồi quyết toán", SETTLEMENT_PAYMENT_OVERDUE: "Cần kiểm tra khoản quyết toán",
  LEASE_CLOSED: "Đã đóng hồ sơ quyết toán cọc",
};

export function isReturnSettlementNotificationType(type: unknown): boolean {
  return typeof type === "string" && Object.hasOwn(RETURN_SETTLEMENT_TYPE_TAGS, type);
}

// Routed payment types open /dashboard/payments?paymentId=…; legacy PAYMENT_* types do not.
const ROUTED_PAYMENT_TYPES: ReadonlySet<string> = new Set([
  "PAYMENT_REQUEST_CREATED",
  "PAYMENT_OBLIGATION_OVERDUE",
  "PAYMENT_TRANSFER_REPORTED",
  "PAYMENT_RECEIPT_CONFIRMED",
  "PAYMENT_RECEIPT_REJECTED",
  "PAYMENT_DISPUTE_OPENED",
  "PAYMENT_DISPUTE_EVIDENCE_ADDED",
  "PAYMENT_DISPUTE_PROPOSED",
  "PAYMENT_DISPUTE_PROPOSAL_DECLINED",
  "PAYMENT_DISPUTE_ESCALATED",
  "PAYMENT_DISPUTE_REVIEW_TRANSFER",
  "PAYMENT_DISPUTE_REOPENED",
]);

export function isRoutedPaymentType(type: unknown): boolean {
  return typeof type === "string" && ROUTED_PAYMENT_TYPES.has(type);
}

type NotificationTagItem = Pick<NotificationItem, "category" | "type" | "metadata">;

export function getNotificationTag(item: NotificationTagItem): string {
  if (item.category === "PAYMENT") {
    if (isInvoiceNotificationType(item.type)) return INVOICE_TYPE_TAGS[item.type];
    return Object.hasOwn(PAYMENT_TYPE_TAGS, item.type)
      ? PAYMENT_TYPE_TAGS[item.type]
      : getCategoryMeta(item.category).tag;
  }
  if (item.category === "CONTRACT") {
    if (isAgreementNotificationType(item.type)) return AGREEMENT_TYPE_TAGS[item.type];
    if (isAmendmentNotificationType(item.type)) return AMENDMENT_TYPE_TAGS[item.type];
    if (isRenewalNotificationType(item.type)) return RENEWAL_TYPE_TAGS[item.type];
    if (isTerminationNotificationType(item.type)) return TERMINATION_TYPE_TAGS[item.type];
    if (isReturnSettlementNotificationType(item.type)) return RETURN_SETTLEMENT_TYPE_TAGS[item.type];
    return isMoveInHandoverNotificationType(item.type)
      ? MOVE_IN_HANDOVER_TYPE_TAGS[item.type]
      : getCategoryMeta(item.category).tag;
  }
  if (item.category === "ACCOUNT") {
    return Object.hasOwn(ACCOUNT_TYPE_TAGS, item.type)
      ? ACCOUNT_TYPE_TAGS[item.type]
      : getCategoryMeta(item.category).tag;
  }
  if (item.category === "RENTAL_REQUEST") {
    return Object.hasOwn(RENTAL_REQUEST_TYPE_TAGS, item.type)
      ? RENTAL_REQUEST_TYPE_TAGS[item.type]
      : getCategoryMeta(item.category).tag;
  }
  if (item.category === "LISTING") {
    const status = item.metadata?.status;
    const tag = item.type === "LISTING_STATUS_CHANGED"
      ? typeof status === "string" && Object.hasOwn(LISTING_STATUS_TAGS, status) ? LISTING_STATUS_TAGS[status] : undefined
      : Object.hasOwn(LISTING_TYPE_TAGS, item.type) ? LISTING_TYPE_TAGS[item.type] : undefined;
    return tag ?? getCategoryMeta(item.category).tag;
  }
  if (item.category !== "APPOINTMENT") return getCategoryMeta(item.category).tag;
  return Object.hasOwn(APPOINTMENT_TYPE_TAGS, item.type)
    ? APPOINTMENT_TYPE_TAGS[item.type]
    : getCategoryMeta(item.category).tag;
}

export function getNotificationRecipientSideLabel(item: NotificationTagItem): string | null {
  if (item.category !== "APPOINTMENT" && item.category !== "RENTAL_REQUEST") return null;
  if (item.metadata?.recipientSide === "OWNER") return "Vai trò chủ nhà";
  if (item.metadata?.recipientSide === "RENTER") return "Vai trò người thuê";
  return null;
}

export function withDefaultPreferences(
  items: NotificationPreferenceItem[] | null | undefined,
): NotificationPreferenceItem[] {
  const byCategory = new Map(items?.map((item) => [item.category, item]));
  return NOTIFICATION_CATEGORIES.map((category) => {
    const existing = byCategory.get(category);
    return {
      category,
      push: existing?.push ?? true,
      email: existing?.email ?? true,
    };
  });
}

export type NotificationSyncEvent =
  | { type: "appointment-changed"; bookingId?: string }
  | { type: "listing-changed"; listingId?: string }
  | { type: "rental-request-changed"; requestId?: string }
  | { type: "membership-changed"; orderId?: string }
  | { type: "payment-changed"; paymentId?: string }
  | { type: "invoice-changed"; contractId?: string; invoiceId?: string }
  | { type: "handover-changed"; contractId?: string }
  | { type: "agreement-changed"; agreementId?: string }
  | { type: "refresh" }
  | { type: "unread-count"; count: number }
  | { type: "read"; id: string; item: NotificationItem }
  | { type: "read-all"; updated: number; readAt: string }
  | { type: "delete"; id: string };

type NotificationSyncListener = (event: NotificationSyncEvent) => void;

const listeners = new Set<NotificationSyncListener>();

function emitSyncEvent(event: NotificationSyncEvent): void {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // Ignore listener errors to avoid breaking caller flow
    }
  });
}

export const notificationService = {
  notifyAppointmentChanged(bookingId?: string): void {
    emitSyncEvent({ type: "appointment-changed", bookingId });
  },

  notifyListingChanged(listingId?: string): void {
    emitSyncEvent({ type: "listing-changed", listingId });
  },

  notifyRentalRequestChanged(requestId?: string): void {
    emitSyncEvent({ type: "rental-request-changed", requestId });
  },

  notifyMembershipChanged(orderId?: string): void {
    emitSyncEvent({ type: "membership-changed", orderId });
  },

  notifyPaymentChanged(paymentId?: string): void {
    emitSyncEvent({ type: "payment-changed", paymentId });
  },

  notifyInvoiceChanged(contractId?: string, invoiceId?: string): void {
    emitSyncEvent({ type: "invoice-changed", contractId, invoiceId });
  },

  notifyHandoverChanged(contractId?: string): void {
    emitSyncEvent({ type: "handover-changed", contractId });
  },

  notifyAgreementChanged(agreementId?: string): void {
    emitSyncEvent({ type: "agreement-changed", agreementId });
  },

  notifyRemoteChanged(): void {
    emitSyncEvent({ type: "refresh" });
  },

  subscribe(listener: NotificationSyncListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  async getFeed(query: NotificationFeedQuery = {}): Promise<NotificationFeedPage> {
    const params: Record<string, string | number | boolean> = {};

    if (typeof query.limit === "number" && Number.isFinite(query.limit)) {
      params.limit = Math.min(Math.max(Math.trunc(query.limit), 1), FEED_MAX_LIMIT);
    }
    if (typeof query.cursor === "string" && query.cursor.trim().length > 0) {
      params.cursor = query.cursor.trim();
    }
    if (
      typeof query.category === "string" &&
      (NOTIFICATION_CATEGORIES as readonly string[]).includes(query.category)
    ) {
      params.category = query.category;
    }
    if (query.unreadOnly === true) {
      params.unreadOnly = true;
    }

    const response = await axiosClient.get<ApiResponse<NotificationFeedPage>>(
      `${BASE_PATH}/feed`,
      { params },
    );
    const result = response.data?.result;
    return {
      items: Array.isArray(result?.items) ? result.items : [],
      nextCursor: result?.nextCursor ?? null,
      hasMore: Boolean(result?.hasMore),
    };
  },

  async getUnreadCount(): Promise<number> {
    const response = await axiosClient.get<ApiResponse<{ count: number }>>(
      `${BASE_PATH}/unread-count`,
    );
    const count =
      typeof response.data?.result?.count === "number"
        ? Math.max(0, response.data.result.count)
        : 0;
    emitSyncEvent({ type: "unread-count", count });
    return count;
  },

  async markRead(id: string): Promise<NotificationItem> {
    const trimmedId = id.trim();
    const response = await axiosClient.patch<ApiResponse<NotificationItem>>(
      `${BASE_PATH}/${encodeURIComponent(trimmedId)}/read`,
    );
    const item = response.data.result;
    emitSyncEvent({ type: "read", id: trimmedId, item });
    return item;
  },

  async markAllRead(): Promise<{ updated: number }> {
    const response = await axiosClient.patch<ApiResponse<{ updated: number }>>(
      `${BASE_PATH}/read-all`,
    );
    const result = response.data?.result ?? { updated: 0 };
    emitSyncEvent({
      type: "read-all",
      updated: result.updated,
      readAt: new Date().toISOString(),
    });
    return result;
  },

  async deleteNotification(id: string): Promise<void> {
    const trimmedId = id.trim();
    await axiosClient.delete<ApiResponse<void>>(
      `${BASE_PATH}/${encodeURIComponent(trimmedId)}`,
    );
    emitSyncEvent({ type: "delete", id: trimmedId });
  },

  async getPreferences(): Promise<NotificationPreferenceItem[]> {
    const response = await axiosClient.get<
      ApiResponse<{ items: NotificationPreferenceItem[] }>
    >(`${BASE_PATH}/preferences`);
    return withDefaultPreferences(response.data?.result?.items);
  },

  async updatePreferences(
    items: NotificationPreferenceItem[],
  ): Promise<NotificationPreferenceItem[]> {
    const seen = new Set<NotificationCategory>();
    const sanitized: NotificationPreferenceItem[] = [];

    for (const item of items) {
      if (
        (NOTIFICATION_CATEGORIES as readonly string[]).includes(item.category) &&
        !seen.has(item.category)
      ) {
        seen.add(item.category);
        sanitized.push({
          category: item.category,
          push: Boolean(item.push),
          email: Boolean(item.email),
        });
      }
    }

    const response = await axiosClient.put<
      ApiResponse<{ items: NotificationPreferenceItem[] }>
    >(`${BASE_PATH}/preferences`, { items: sanitized });
    return withDefaultPreferences(response.data?.result?.items ?? sanitized);
  },
};

export default notificationService;
