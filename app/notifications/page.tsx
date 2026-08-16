"use client";

import React, { useState, useMemo, useRef } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { MOCK_NOTIFICATIONS } from "@/data/mock-notification-data";
import {
  NotificationItem,
  NotificationCategory,
} from "@/types/notification.type";
import {
  Bell,
  CheckCheck,
  ShieldCheck,
  Building,
  Home,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

const ITEMS_PER_PAGE = 8;

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<NotificationCategory>("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Unread count
  const unreadCount = useMemo(
    () => notifications.filter((n) => n.isUnread).length,
    [notifications]
  );

  // Filter logic
  const filteredNotifications = useMemo(() => {
    return notifications.filter((item) => {
      // 1. Unread filter
      if (showUnreadOnly && !item.isUnread) return false;

      // 2. Category tab
      if (activeTab !== "all" && item.category !== activeTab) return false;

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          item.title.toLowerCase().includes(q) ||
          item.message.toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [notifications, activeTab, showUnreadOnly, searchQuery]);

  // Pagination
  const totalItems = filteredNotifications.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentItems = filteredNotifications.slice(startIndex, endIndex);

  // Mark single as read
  const handleItemClick = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n))
    );
  };

  // Mark all as read
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
  };

  // Clear all notifications
  const handleClearAll = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ thông báo?")) {
      setNotifications([]);
    }
  };

  // Remove single notification
  const handleRemoveSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Helper to render strictly 1 ICON per category
  const renderIcon = (category: "listing" | "contract" | "payment") => {
    switch (category) {
      case "payment":
        return (
          <div className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-500 flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
            <span>¥</span>
          </div>
        );
      case "contract":
        return (
          <div className="w-11 h-11 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
        );
      case "listing":
      default:
        return (
          <div className="w-11 h-11 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Building className="w-5 h-5" />
          </div>
        );
    }
  };

  // Helper to render strictly 1 tag color style per category
  const renderTagBadge = (
    tag: string,
    category: "listing" | "contract" | "payment"
  ) => {
    switch (category) {
      case "payment":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-400 shrink-0">
            {tag}
          </span>
        );
      case "contract":
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200/80 dark:bg-purple-950/40 dark:border-purple-800/60 dark:text-purple-400 shrink-0">
            {tag}
          </span>
        );
      case "listing":
      default:
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-400 shrink-0">
            {tag}
          </span>
        );
    }
  };

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
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold shadow-2xs">
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
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-2xs"
                >
                  <CheckCheck className="w-4 h-4 text-primary" />
                  <span>Đã đọc tất cả</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card hover:bg-red-50 dark:hover:bg-red-950/40 text-muted-foreground hover:text-red-600 hover:border-red-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa tất cả</span>
                </button>
              )}
            </div>
          </div>

          {/* Controls Bar: Tabs, Unread Switch, Search */}
          <div className="bg-card rounded-2xl border border-border p-3 sm:p-4 mb-6 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("all");
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === "all"
                      ? "bg-foreground text-background font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Tất cả ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("listing");
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === "listing"
                      ? "bg-foreground text-background font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Tin đăng (
                  {notifications.filter((n) => n.category === "listing").length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("contract");
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === "contract"
                      ? "bg-foreground text-background font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Hợp đồng (
                  {notifications.filter((n) => n.category === "contract").length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("payment");
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeTab === "payment"
                      ? "bg-foreground text-background font-bold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  Thanh toán (
                  {notifications.filter((n) => n.category === "payment").length}
                  )
                </button>
              </div>

              {/* Unread Only Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground shrink-0">
                <div
                  onClick={() => {
                    setShowUnreadOnly(!showUnreadOnly);
                    setCurrentPage(1);
                  }}
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
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm kiếm nội dung thông báo..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-muted/60 border border-border rounded-xl focus:border-primary/50 text-foreground placeholder:text-muted-foreground outline-none transition-all"
              />
            </div>
          </div>

          {/* Notifications Feed */}
          {filteredNotifications.length === 0 ? (
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
              {currentItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`p-4 sm:p-5 hover:bg-muted/50 transition-colors flex items-start gap-3.5 sm:gap-4 cursor-pointer group relative ${
                    item.isUnread ? "bg-primary/[0.02]" : ""
                  }`}
                >
                  {/* Left Icon with unread indicator dot */}
                  <div className="relative shrink-0 pt-0.5">
                    {item.isUnread && (
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
                        {renderTagBadge(item.tag, item.category)}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveSingle(e, item.id)}
                          title="Xóa thông báo này"
                          className="text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-2">
                      {item.message}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground/70 font-medium">
                      <span>{item.date}</span>
                      {item.link && (
                        <Link
                          href={item.link}
                          className="text-primary hover:underline font-semibold flex items-center gap-1"
                        >
                          <span>Xem chi tiết</span>
                          <span>→</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80 pt-6">
              <p className="text-xs text-muted-foreground font-medium order-2 sm:order-1">
                Hiển thị <span className="font-bold text-foreground">{startIndex + 1} - {endIndex}</span> trong tổng số <span className="font-bold text-foreground">{totalItems}</span> thông báo
              </p>

              <div className="flex items-center gap-2 order-1 sm:order-2">
                <button
                  type="button"
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      sectionRef.current?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  disabled={currentPage === 1}
                  className="h-10 px-3.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Trước</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => {
                          setCurrentPage(page);
                          sectionRef.current?.scrollIntoView({
                            behavior: "smooth",
                          });
                        }}
                        className={`w-10 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          currentPage === page
                            ? "bg-primary text-primary-foreground shadow-xs scale-105"
                            : "border border-border bg-card text-foreground hover:bg-muted"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (currentPage < totalPages) {
                      setCurrentPage(currentPage + 1);
                      sectionRef.current?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  disabled={currentPage === totalPages}
                  className="h-10 px-3.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Tiếp</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
