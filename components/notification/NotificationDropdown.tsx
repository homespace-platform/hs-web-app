"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ShieldCheck,
  CreditCard,
  Building,
  FileText,
  Check,
  ExternalLink,
  Newspaper,
} from "lucide-react";
import { MOCK_NOTIFICATIONS } from "@/data/mock-notification-data";
import {
  NotificationItem,
  NotificationCategory,
  NotificationTagType,
} from "@/types/notification.type";

interface NotificationDropdownProps {
  initialCount?: number;
}

export default function NotificationDropdown({
  initialCount = 5,
}: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<NotificationCategory>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with localStorage settings if present
  useEffect(() => {
    try {
      const savedPrefs = localStorage.getItem("homespace_notification_prefs");
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (parsed.newsNotifications === false) {
          // If news notifications are disabled in settings, filter them out from active dropdown
          setNotifications(MOCK_NOTIFICATIONS.filter((n) => n.category !== "news"));
        } else {
          setNotifications(MOCK_NOTIFICATIONS);
        }
      }
    } catch {
      // fallback
    }
  }, [isOpen]);

  // Calculate unread count
  const unreadCount = useMemo(
    () => notifications.filter((n) => n.isUnread).length,
    [notifications]
  );

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Filter notifications based on tab and unread toggle
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // 1. Unread filter
      if (showUnreadOnly && !item.isUnread) {
        return false;
      }
      // 2. Tab filter
      if (activeTab !== "all" && item.category !== activeTab) {
        return false;
      }
      return true;
    });
  }, [notifications, activeTab, showUnreadOnly]);

  // Mark single item as read
  const handleItemClick = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n))
    );
  };

  // Mark all as read
  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  // Helper to render strictly 1 ICON per notification category type
  const renderIcon = (category: "listing" | "contract" | "payment" | "news") => {
    switch (category) {
      case "news":
        // Type 4: Tin tức & Bài viết từ Admin
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Newspaper className="w-5 h-5" />
          </div>
        );
      case "payment":
        // Type 1: Thanh toán & Tiền cọc (Icon ¥ màu hồng duy nhất)
        return (
          <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-500 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
            <span>¥</span>
          </div>
        );
      case "contract":
        // Type 2: Hợp đồng (Icon Khiên ShieldCheck màu tím duy nhất)
        return (
          <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
        );
      case "listing":
      default:
        // Type 3: Tin đăng (Icon Tòa nhà Building màu xanh dương duy nhất)
        return (
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Building className="w-5 h-5" />
          </div>
        );
    }
  };

  // Helper to render strictly 1 tag color style per category type
  const renderTagBadge = (tag: string, category: "listing" | "contract" | "payment" | "news") => {
    switch (category) {
      case "news":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-400 shrink-0">
            {tag}
          </span>
        );
      case "payment":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-400 shrink-0">
            {tag}
          </span>
        );
      case "contract":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200/80 dark:bg-purple-950/40 dark:border-purple-800/60 dark:text-purple-400 shrink-0">
            {tag}
          </span>
        );
      case "listing":
      default:
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-400 shrink-0">
            {tag}
          </span>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 1. Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Thông báo"
        className={`relative w-10 h-10 rounded-full border transition-all flex items-center justify-center cursor-pointer ${
          isOpen
            ? "border-primary/50 bg-muted text-primary shadow-xs"
            : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted hover:border-primary/30"
        }`}
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 2. Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[calc(100vw-32px)] sm:w-96 max-w-sm bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header Bar */}
          <div className="p-4 pb-3 flex items-center justify-between border-b border-border/70">
            <h2 className="text-base font-bold font-heading text-foreground">
              Thông báo
            </h2>

            <div className="flex items-center gap-3">
              {/* Toggle Switch "Chưa đọc" */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
                <div
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors ${
                    showUnreadOnly
                      ? "bg-primary"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      showUnreadOnly ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </div>
                <span>Chưa đọc</span>
              </label>

              {/* Mark all as read button (Double check icon) */}
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors cursor-pointer"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center px-4 border-b border-border/70 text-xs font-semibold overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`py-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "all"
                  ? "border-foreground text-foreground font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("listing")}
              className={`py-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "listing"
                  ? "border-foreground text-foreground font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Tin đăng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contract")}
              className={`py-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "contract"
                  ? "border-foreground text-foreground font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Hợp đồng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("payment")}
              className={`py-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "payment"
                  ? "border-foreground text-foreground font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Thanh toán
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("news")}
              className={`py-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                activeTab === "news"
                  ? "border-foreground text-foreground font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Tin tức
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50 no-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-1.5">
                <Bell className="w-8 h-8 text-muted-foreground/40 mb-1" />
                <p className="text-xs font-semibold">
                  {showUnreadOnly
                    ? "Không có thông báo chưa đọc nào"
                    : "Không có thông báo nào"}
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  Các cập nhật về hợp đồng và tin đăng sẽ hiển thị tại đây
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`p-3.5 hover:bg-muted/60 transition-colors flex items-start gap-3 cursor-pointer group ${
                    item.isUnread ? "bg-primary/[0.02]" : ""
                  }`}
                >
                  {/* Left Icon with Red Unread Dot */}
                  <div className="relative shrink-0 pt-0.5">
                    {item.isUnread && (
                      <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-card z-10" />
                    )}
                    {renderIcon(item.category)}
                  </div>

                  {/* Right Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1.5">
                      <h3 className="text-xs sm:text-[13px] font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      {renderTagBadge(item.tag, item.category)}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground/70 font-medium">
                      <span>{item.date}</span>
                      {item.link && (
                        <Link
                          href={item.link}
                          onClick={() => setIsOpen(false)}
                          className="text-primary hover:underline text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Xem chi tiết →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer: Xem tất cả thông báo */}
          <div className="p-2.5 bg-muted/30 border-t border-border/80 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1 text-xs font-bold text-primary hover:underline hover:opacity-90 transition-all py-1 px-4 rounded-lg cursor-pointer"
            >
              <span>Xem tất cả thông báo</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
