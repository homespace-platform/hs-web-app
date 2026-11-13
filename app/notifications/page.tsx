"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
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
import {
  FEED_DEFAULT_LIMIT,
  type NotificationCategory,
  type NotificationFilterCategory,
  type NotificationItem,
} from "@/types/notification.type";
import { getApiErrorMessage } from "@/utils/apiError";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  ShieldCheck,
  Building,
  Home,
  Trash2,
  Search,
  Newspaper,
  Calendar,
  MessageSquare,
  UserCheck,
  KeyRound,
  Loader2,
  LogIn,
  AlertCircle,
} from "lucide-react";

export default function NotificationsPage() {
  const { authenticated, initialized, userId, login } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<NotificationFilterCategory>("ALL");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
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
      // Feed request handles visible error state
    }
  }, [initialized, authenticated]);

  const loadFeed = useCallback(async () => {
    if (!initialized || !authenticated) {
      setNotifications([]);
      setNextCursor(null);
      setHasMore(false);
      setError(null);
      setLoadMoreError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    try {
      const page = await notificationService.getFeed({
        limit: FEED_DEFAULT_LIMIT,
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
      setError(getApiErrorMessage(err, "Không thể tải danh sách thông báo."));
    } finally {
      setLoading(false);
    }
  }, [initialized, authenticated, activeTab, showUnreadOnly]);

  useEffect(() => {
    if (!initialized) return;
    if (!authenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setNextCursor(null);
      setHasMore(false);
      setError(null);
      setLoadMoreError(null);
      setLoading(false);
      return;
    }
    void loadFeed();
    void loadUnreadCount();
  }, [initialized, authenticated, userId, loadFeed, loadUnreadCount]);

  // Sync with mutations triggered from other notification views (e.g. Header dropdown)
  useEffect(() => {
    const unsubscribe = notificationService.subscribe?.((event) => {
      if (isSelfMutatingRef.current) return;

      if (event.type === "unread-count") {
        setUnreadCount(event.count);
      } else if (event.type === "refresh") {
        void loadFeed();
        void loadUnreadCount();
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
  }, [showUnreadOnly, loadFeed, loadUnreadCount]);

  // Client-side search filter over loaded feed items
  const filteredNotifications = useMemo(() => {
    if (!searchQuery.trim()) return notifications;
    const q = searchQuery.toLowerCase().trim();
    return notifications.filter((item) => {
      const tag = `${getCategoryMeta(item.category).tag} ${getNotificationTag(item)}`.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        tag.includes(q)
      );
    });
  }, [notifications, searchQuery]);

  // Load next cursor page
  const handleLoadMore = async () => {
    if (!hasMore || !nextCursor || loadingMore || loading) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await notificationService.getFeed({
        limit: FEED_DEFAULT_LIMIT,
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
      const message = getApiErrorMessage(err, "Không thể tải thêm thông báo.");
      setLoadMoreError(message);
      toast.error(message);
    } finally {
      setLoadingMore(false);
    }
  };

  // Mark single notification as read
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

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    if (markingAllRead) return;
    setMarkingAllRead(true);
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
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể đánh dấu tất cả là đã đọc."));
    } finally {
      setMarkingAllRead(false);
      isSelfMutatingRef.current = false;
    }
  };

  // Remove single notification
  const handleRemoveSingle = async (
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
      toast.success("Đã xóa thông báo.");
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
          <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Newspaper className="w-5 h-5" />
          </div>
        );
      case "PAYMENT":
        return (
          <div className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-500 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
            <span>¥</span>
          </div>
        );
      case "CONTRACT":
        return (
          <div className="w-11 h-11 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
        );
      case "APPOINTMENT":
        return (
          <div className="w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Calendar className="w-5 h-5" />
          </div>
        );
      case "CHAT":
        return (
          <div className="w-11 h-11 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-2xs">
            <MessageSquare className="w-5 h-5" />
          </div>
        );
      case "ACCOUNT":
        return (
          <div className="w-11 h-11 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 shadow-2xs">
            <UserCheck className="w-5 h-5" />
          </div>
        );
      case "RENTAL_REQUEST":
        return (
          <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
            <KeyRound className="w-5 h-5" />
          </div>
        );
      case "LISTING":
      default:
        return (
          <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
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
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-400 shrink-0">
            {tag}
          </span>
        );
      case "PAYMENT":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-400 shrink-0">
            {tag}
          </span>
        );
      case "CONTRACT":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200/80 dark:bg-purple-950/40 dark:border-purple-800/60 dark:text-purple-400 shrink-0">
            {tag}
          </span>
        );
      case "APPOINTMENT":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-400 shrink-0">
            {tag}
          </span>
        );
      case "CHAT":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-200/80 dark:bg-sky-950/40 dark:border-sky-800/60 dark:text-sky-400 shrink-0">
            {tag}
          </span>
        );
      case "ACCOUNT":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200/80 dark:bg-teal-950/40 dark:border-teal-800/60 dark:text-teal-400 shrink-0">
            {tag}
          </span>
        );
      case "RENTAL_REQUEST":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/80 dark:bg-indigo-950/40 dark:border-indigo-800/60 dark:text-indigo-400 shrink-0">
            {tag}
          </span>
        );
      case "LISTING":
      default:
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-400 shrink-0">
            {tag}
          </span>
        );
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold font-heading">
                Đăng nhập để xem thông báo
              </h1>
              <p className="text-sm text-muted-foreground">
                Trung tâm thông báo chỉ dành cho tài khoản đã đăng nhập.
              </p>
            </div>
            <Button
              onClick={() => login("/notifications")}
              className="rounded-full h-10 px-6 cursor-pointer"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Đăng nhập
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div
          ref={sectionRef}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
        >
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Link
              href="/"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Thông báo</span>
          </nav>

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-foreground">
                  Trung tâm thông báo
                </h1>
                {unreadCount > 0 && (
                  <span
                    data-testid="notification-center-unread-badge"
                    className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-2xs"
                  >
                    {unreadCount} chưa đọc
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Theo dõi tiến độ hợp đồng, thanh toán tiền cọc và cập nhật tin đăng thuê nhà.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAllAsRead()}
                  disabled={markingAllRead}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted disabled:opacity-50 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
                >
                  {markingAllRead ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <CheckCheck className="w-4 h-4 text-primary" />
                  )}
                  <span>Đã đọc tất cả</span>
                </button>
              )}
            </div>
          </div>

          {/* Controls Bar: Tabs, Unread Switch, Search */}
          <div className="bg-card rounded-2xl border border-border p-3 sm:p-4 mb-6 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {NOTIFICATION_FILTER_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Unread Only Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground shrink-0">
                <div
                  onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    showUnreadOnly
                      ? "bg-primary"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showUnreadOnly ? "translate-x-4.5" : "translate-x-0.5"
                    }`}
                  />
                </div>
                <span>Chỉ chưa đọc</span>
              </label>
            </div>

            {/* Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm nội dung thông báo..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-muted/60 border border-border rounded-xl focus:border-primary/50 text-foreground placeholder:text-muted-foreground outline-none transition-all"
              />
            </div>
          </div>

          {/* Notifications Feed */}
          {loading ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                Đang tải thông báo...
              </p>
            </div>
          ) : error ? (
            <div className="bg-card rounded-2xl border border-red-200 dark:border-red-900/60 p-10 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Không thể tải thông báo
              </h3>
              <p className="text-xs sm:text-sm max-w-md text-muted-foreground">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadFeed()}
                className="mt-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground/50">
                <Bell className="w-8 h-8" />
              </div>
              <h3 className="font-heading font-bold text-base text-foreground">
                Không có thông báo nào
              </h3>
              <p className="text-xs sm:text-sm max-w-md text-muted-foreground">
                {showUnreadOnly
                  ? "Bạn đã đọc tất cả thông báo trong danh mục này."
                  : "Các hoạt động giao dịch, ký hợp đồng và duyệt tin sẽ xuất hiện tại đây."}
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border divide-y divide-border/60 overflow-hidden shadow-2xs">
              {filteredNotifications.map((item) => {
                const isUnread = isNotificationUnread(item);
                const safeHref = getSafeActionPath(item.actionPath);

                return (
                  <div
                    key={item.id}
                    onClick={() => void handleItemClick(item)}
                    className={`p-4 sm:p-5 hover:bg-muted/50 transition-colors flex items-start gap-3.5 sm:gap-4 cursor-pointer group relative ${
                      isUnread ? "bg-primary/[0.02]" : ""
                    }`}
                  >
                    {/* Left Icon with unread indicator dot */}
                    <div className="relative shrink-0 pt-0.5">
                      {isUnread && (
                        <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-card z-10" />
                      )}
                      {renderIcon(item.category)}
                    </div>

                    {/* Body Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <h2 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h2>
                        <div className="flex items-center gap-2">
                          {renderTagBadge(item)}
                          <button
                            type="button"
                            onClick={(e) => void handleRemoveSingle(e, item)}
                            title="Xóa thông báo này"
                            className="text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                        {item.body}
                      </p>

                      {getNotificationRecipientSideLabel(item) && (
                        <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                          {getNotificationRecipientSideLabel(item)}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground/70 font-medium">
                        <span>{formatNotificationDate(item.createdAt)}</span>
                        {safeHref && (
                          <Link
                            href={safeHref}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleItemClick(item);
                            }}
                            className="text-primary hover:underline font-semibold flex items-center gap-1"
                          >
                            <span>Xem chi tiết</span>
                            <span>→</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cursor Pagination */}
          {!loading && !error && filteredNotifications.length > 0 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80 pt-6">
              <p className="text-xs text-muted-foreground font-medium">
                Đang hiển thị{" "}
                <span className="font-bold text-foreground">
                  {filteredNotifications.length}
                </span>{" "}
                thông báo
              </p>

              {hasMore && nextCursor && (
                <div className="flex flex-col items-end gap-2">
                  {loadMoreError && (
                    <span className="text-xs text-red-500">{loadMoreError}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                    className="h-10 px-5 rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                  >
                    {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>
                      {loadingMore ? "Đang tải thêm..." : "Tải thêm thông báo"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
