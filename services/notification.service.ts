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
