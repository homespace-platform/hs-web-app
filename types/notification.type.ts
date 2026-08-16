export type NotificationCategory = "all" | "listing" | "contract" | "payment";

export type NotificationTagType = "deposit" | "contract" | "listing" | "payment";

export interface NotificationItem {
  id: string;
  category: "listing" | "contract" | "payment";
  title: string;
  tag: string;
  tagType: NotificationTagType;
  message: string;
  date: string;
  isUnread: boolean;
  link?: string;
}
