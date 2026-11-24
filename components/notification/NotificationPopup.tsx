"use client";

import Link from "next/link";
import { MessageCircle, TriangleAlert, X } from "lucide-react";
import NotificationIcon from "@/components/notification/NotificationIcon";
import UserAvatar from "@/components/common/UserAvatar";
import { getCategoryMeta, getNotificationTag, getSafeActionPath } from "@/services/notification.service";
import type { NotificationItem } from "@/types/notification.type";

type Props = {
  item: Pick<NotificationItem, "category" | "type" | "metadata" | "title" | "body" | "priority" | "actionPath">;
  sender?: { name: string; avatar?: string };
  onDismiss: () => void;
  /** Called when the popup link is followed (the page marks the notification read). */
  onOpen?: () => void;
};

export default function NotificationPopup({ item, sender: participant, onDismiss, onOpen }: Props) {
  const sender = item.category === "CHAT" ? participant ?? { name: "Người dùng HomeSpace" } : undefined;
  const urgent = item.priority === "URGENT";
  const title = sender ? sender.name : item.title;
  const body = sender ? "Có tin nhắn mới" : item.body;
  const href = getSafeActionPath(item.actionPath);
  const label = getCategoryMeta(item.category).label;
  const tag = getNotificationTag(item);

  return (
    <div className="pointer-events-auto relative flex h-[104px] w-full items-center gap-3 overflow-hidden rounded-2xl border border-blue-500 bg-blue-600 p-4 pr-10 shadow-[0_8px_32px_rgba(37,99,235,0.24)] transition-shadow hover:shadow-[0_12px_36px_rgba(37,99,235,0.32)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2">
      {href && <Link href={href} onClick={() => { onOpen?.(); onDismiss(); }} aria-label={sender ? "Mở trò chuyện" : `Mở thông báo ${label.toLowerCase()}`}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white" />}
      <div className="relative shrink-0" aria-hidden="true">
        {sender ? <>
          <UserAvatar src={sender.avatar} name={sender.name} sizeClassName="h-11 w-11 text-base" className="!border-white/30" fallbackClassName="!bg-white/20 !text-white" />
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-blue-600 bg-white text-blue-600">
            <MessageCircle className="h-3 w-3" />
          </span>
        </> : <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white">
          <NotificationIcon category={item.category} />
        </span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium leading-4 text-blue-50">
          <span className="min-w-0 truncate">{label}{!sender && tag !== label ? ` · ${tag}` : " · HomeSpace"}</span>
          {urgent && <span className="flex shrink-0 items-center gap-1 text-amber-200"><TriangleAlert className="h-3 w-3" aria-hidden="true" />Khẩn</span>}
        </div>
        <p className="truncate text-sm font-semibold leading-5 text-white">{title}</p>
        <p className="mt-0.5 truncate text-xs leading-5 text-blue-50">{body}</p>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Đóng thông báo"
        className="absolute right-2 top-2 z-20 flex h-7 w-7 items-center justify-center rounded-full text-blue-50 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
