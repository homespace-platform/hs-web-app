"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  ShieldCheck,
  Building,
  Newspaper,
  Calendar,
  MessageSquare,
  UserCheck,
  KeyRound,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import notificationService, {
  formatNotificationDate,
  getCategoryMeta,
  getNotificationTag,
  getNotificationRecipientSideLabel,
  getSafeActionPath,
  isNotificationUnread,
  NOTIFICATION_FILTER_TABS,
} from "@/services/notification.service";
import type {
  NotificationCategory,
  NotificationFilterCategory,
  NotificationItem,
} from "@/types/notification.type";
import { getApiErrorMessage } from "@/utils/apiError";

const DROPDOWN_PAGE_LIMIT = 10;

export default function NotificationDropdown() {
  const { authenticated, initialized, userId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<NotificationFilterCategory>("ALL");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isSelfMutatingRef = useRef(false);

  const loadUnreadCount = useCallback(async () => {
    if (!initialized || !authenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Silent on background badge refresh; feed panel surfaces explicit errors
    }
  }, [initialized, authenticated]);

  const loadFeed = useCallback(async () => {
    if (!initialized || !authenticated) {
      setNotifications([]);
      setNextCursor(null);
      setHasMore(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const page = await notificationService.getFeed({
        limit: DROPDOWN_PAGE_LIMIT,
        category: activeTab === "ALL" ? undefined : activeTab,
        unreadOnly: showUnreadOnly ? true : undefined,
      });
      setNotifications(page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (err) {
      setNotifications([]);
      setNextCursor(null);
      setHasMore(false);
      setError(getApiErrorMessage(err, "Không thể tải thông báo."));
    } finally {
      setLoading(false);
    }
  }, [initialized, authenticated, activeTab, showUnreadOnly]);

  // Initial unread badge fetch on auth ready / user change
  useEffect(() => {
    if (!initialized || !authenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setNextCursor(null);
      setHasMore(false);
      setError(null);
      setIsOpen(false);
      return;
    }
    void loadUnreadCount();
  }, [initialized, authenticated, userId, loadUnreadCount]);

  // Fetch feed whenever dropdown opens or filters change while open
  useEffect(() => {
    if (!isOpen || !initialized || !authenticated) return;
    void loadFeed();
    void loadUnreadCount();
  }, [isOpen, initialized, authenticated, activeTab, showUnreadOnly, loadFeed, loadUnreadCount]);

  // Sync with mutations triggered from other notification views (e.g. /notifications page)
  useEffect(() => {
    const unsubscribe = notificationService.subscribe?.((event) => {
      if (isSelfMutatingRef.current) return;

      if (event.type === "unread-count") {
        setUnreadCount(event.count);
      } else if (event.type === "refresh") {
        void loadUnreadCount();
        if (isOpen) void loadFeed();
      } else if (event.type === "read") {
        setNotifications((prev) => {
          const target = prev.find((n) => n.id === event.id);
          if (target && isNotificationUnread(target)) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          if (showUnreadOnly) {
            return prev.filter((n) => n.id !== event.id);
          }
          return prev.map((n) =>
            n.id === event.id
              ? event.item ?? { ...n, readAt: n.readAt ?? new Date().toISOString() }
              : n,
          );
        });
      } else if (event.type === "read-all") {
        setUnreadCount(0);
        setNotifications((prev) =>
          showUnreadOnly
            ? []
            : prev.map((n) => (n.readAt ? n : { ...n, readAt: event.readAt })),
        );
      } else if (event.type === "delete") {
        setNotifications((prev) => {
          const target = prev.find((n) => n.id === event.id);
          if (target && isNotificationUnread(target)) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter((n) => n.id !== event.id);
        });
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [showUnreadOnly, isOpen, loadFeed, loadUnreadCount]);

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

  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor || loadingMore || loading) return;
    setLoadingMore(true);
    try {
      const page = await notificationService.getFeed({
        limit: DROPDOWN_PAGE_LIMIT,
        cursor: nextCursor,
        category: activeTab === "ALL" ? undefined : activeTab,
        unreadOnly: showUnreadOnly ? true : undefined,
      });
      setNotifications((prev) => {
        const existingIds = new Set(prev.map((item) => item.id));
        const appended = page.items.filter((item) => !existingIds.has(item.id));
        return [...prev, ...appended];
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể tải thêm thông báo."));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!isNotificationUnread(item)) return;
    isSelfMutatingRef.current = true;
    try {
      const updated = await notificationService.markRead(item.id);
      const nextReadAt = updated?.readAt ?? new Date().toISOString();
      setNotifications((prev) =>
        showUnreadOnly
          ? prev.filter((n) => n.id !== item.id)
          : prev.map((n) =>
              n.id === item.id ? { ...n, ...(updated ?? {}), readAt: nextReadAt } : n,
            ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể đánh dấu đã đọc."));
    } finally {
      isSelfMutatingRef.current = false;
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unreadCount === 0 && notifications.every((n) => !isNotificationUnread(n))) {
      return;
    }
    isSelfMutatingRef.current = true;
    try {
      await notificationService.markAllRead();
      const nowIso = new Date().toISOString();
      setNotifications((prev) =>
        showUnreadOnly
          ? []
          : prev.map((n) => (n.readAt ? n : { ...n, readAt: nowIso })),
      );
      setUnreadCount(0);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể đánh dấu tất cả là đã đọc."));
    } finally {
      isSelfMutatingRef.current = false;
    }
  };

  const handleDeleteItem = async (
    e: React.MouseEvent,
    item: NotificationItem,
  ) => {
    e.stopPropagation();
    const wasUnread = isNotificationUnread(item);
    isSelfMutatingRef.current = true;
    try {
      await notificationService.deleteNotification(item.id);
      setNotifications((prev) => prev.filter((n) => n.id !== item.id));
      if (wasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể xóa thông báo."));
    } finally {
      isSelfMutatingRef.current = false;
    }
  };

  const renderIcon = (category: NotificationCategory) => {
    switch (category) {
      case "SYSTEM":
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Newspaper className="w-5 h-5" />
          </div>
        );
      case "PAYMENT":
        return (
          <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-500 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
            <span>¥</span>
          </div>
        );
      case "CONTRACT":
        return (
          <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
        );
      case "APPOINTMENT":
        return (
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar className="w-5 h-5" />
          </div>
        );
      case "CHAT":
        return (
          <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-2xs">
            <MessageSquare className="w-5 h-5" />
          </div>
        );
      case "ACCOUNT":
        return (
          <div className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-2xs">
            <UserCheck className="w-5 h-5" />
          </div>
        );
      case "RENTAL_REQUEST":
        return (
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
            <KeyRound className="w-5 h-5" />
          </div>
        );
      case "LISTING":
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Building className="w-5 h-5" />
          </div>
        );
    }
  };

  const renderTagBadge = (item: NotificationItem) => {
    const { category } = item;
    const tag = getNotificationTag(item);
    switch (category) {
      case "SYSTEM":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-400 shrink-0">
            {tag}
          </span>
        );
      case "PAYMENT":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-400 shrink-0">
            {tag}
          </span>
        );
      case "CONTRACT":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200/80 dark:bg-purple-950/40 dark:border-purple-800/60 dark:text-purple-400 shrink-0">
            {tag}
          </span>
        );
      case "APPOINTMENT":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-400 shrink-0">
            {tag}
          </span>
        );
      case "CHAT":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-200/80 dark:bg-sky-950/40 dark:border-sky-800/60 dark:text-sky-400 shrink-0">
            {tag}
          </span>
        );
      case "ACCOUNT":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200/80 dark:bg-teal-950/40 dark:border-teal-800/60 dark:text-teal-400 shrink-0">
            {tag}
          </span>
        );
      case "RENTAL_REQUEST":
        return (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/80 dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-400 shrink-0">
            {tag}
          </span>
        );
      case "LISTING":
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
          <span
            data-testid="notification-unread-badge"
            className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* 2. Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[calc(100vw-32px)] sm:w-96 max-w-sm bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header Bar */}
          <div className="p-4 pb-3 flex items-center justify-between border-b border-border/70">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-heading text-foreground">
                Thông báo
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </div>

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

              {/* Mark all as read button */}
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="p-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center px-4 border-b border-border/70 text-xs font-semibold overflow-x-auto no-scrollbar">
            {NOTIFICATION_FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-3 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? "border-foreground text-foreground font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50 no-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-xs font-medium">Đang tải thông báo...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center flex flex-col items-center justify-center gap-2.5">
                <AlertCircle className="w-7 h-7 text-red-500" />
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => void loadFeed()}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : notifications.length === 0 ? (
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
              <>
                {notifications.map((item) => {
                  const isUnread = isNotificationUnread(item);
                  const safeHref = getSafeActionPath(item.actionPath);

                  return (
                    <div
                      key={item.id}
                      onClick={() => void handleItemClick(item)}
                      className={`p-3.5 hover:bg-muted/60 transition-colors flex items-start gap-3 cursor-pointer group ${
                        isUnread ? "bg-primary/[0.02]" : ""
                      }`}
                    >
                      {/* Left Icon with Red Unread Dot */}
                      <div className="relative shrink-0 pt-0.5">
                        {isUnread && (
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
                          <div className="flex items-center gap-1.5 shrink-0">
                            {renderTagBadge(item)}
                            <button
                              type="button"
                              onClick={(e) => void handleDeleteItem(e, item)}
                              title="Xóa thông báo này"
                              className="text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">
                          {item.body}
                        </p>

                        {getNotificationRecipientSideLabel(item) && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                            {getNotificationRecipientSideLabel(item)}
                          </p>
                        )}

                        <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground/70 font-medium">
                          <span>{formatNotificationDate(item.createdAt)}</span>
                          {safeHref && (
                            <Link
                              href={safeHref}
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleItemClick(item);
                                setIsOpen(false);
                              }}
                              className="text-primary hover:underline text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Xem chi tiết →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {hasMore && nextCursor && (
                  <div className="p-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => void handleLoadMore()}
                      disabled={loadingMore}
                      className="w-full py-1.5 px-3 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground disabled:opacity-50 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>{loadingMore ? "Đang tải..." : "Tải thêm thông báo"}</span>
                    </button>
                  </div>
                )}
              </>
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
