export type NotificationCategory =
  | "all"
  | "listing"
  | "contract"
  | "payment"
  | "news";

export type NotificationTagType =
  | "deposit"
  | "contract"
  | "listing"
  | "payment"
  | "news";

export interface NotificationItem {
  id: string;
  category: "listing" | "contract" | "payment" | "news";
  title: string;
  tag: string;
  tagType: NotificationTagType;
  message: string;
  date: string;
  isUnread: boolean;
  link?: string;
  author?: string;
  readTime?: string;
}

export interface NotificationPreferences {
  systemNotifications: boolean;
  soundEnabled: boolean;
  newsNotifications: boolean;
  newsMarketReports: boolean;
  newsLegalGuides: boolean;
  newsPlatformUpdates: boolean;
}
