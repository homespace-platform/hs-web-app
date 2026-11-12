export const NOTIFICATION_CATEGORIES = [
  "SYSTEM",
  "ACCOUNT",
  "LISTING",
  "APPOINTMENT",
  "CONTRACT",
  "PAYMENT",
  "CHAT",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationFilterCategory = "ALL" | NotificationCategory;

export const NOTIFICATION_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
] as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_CHANNELS = ["push", "email"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const FEED_DEFAULT_LIMIT = 20;
export const FEED_MAX_LIMIT = 50;

export type NotificationMetadata = Record<string, string | number | boolean>;

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  actionPath: string | null;
  metadata: NotificationMetadata | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationFeedPage {
  items: NotificationItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NotificationFeedQuery {
  limit?: number;
  cursor?: string;
  category?: NotificationCategory;
  unreadOnly?: boolean;
}

export interface NotificationPreferenceItem {
  category: NotificationCategory;
  push: boolean;
  email: boolean;
}
