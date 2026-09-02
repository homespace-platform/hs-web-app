"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RentCollageCard from "@/components/rent/RentCollageCard";
import type { RentPropertyItem } from "@/types/rent.type";
import { toRentProperty } from "@/lib/listing-to-rent-property";
import { useAuth } from "@/features/auth/useAuth";
import { useAppDispatch } from "@/store/hooks";
import historyService from "@/services/history.service";
import { clearHistoryThunk, setHistoryIds } from "@/features/history/historySlice";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Home,
  Trash2,
  Sparkles,
  ArrowUpDown,
  History,
  LogIn,
  Loader2,
} from "lucide-react";

const ITEMS_PER_PAGE = 8;
const MAX_HISTORY_LIMIT = 40;

const HISTORY_CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "apartment", label: "Căn hộ/Chung cư" },
  { id: "house", label: "Nhà ở" },
  { id: "studio", label: "Studio" },
  { id: "office", label: "Văn phòng" },
  { id: "commercial", label: "Mặt bằng kinh doanh" },
  { id: "room", label: "Phòng trọ" },
];

export default function HistoryPage() {
  const { authenticated, initialized, login } = useAuth();
  const dispatch = useAppDispatch();
  const [historyList, setHistoryList] = useState<RentPropertyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "price_asc" | "price_desc" | "area_desc">("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const listingsSectionRef = useRef<HTMLDivElement>(null);

  // Fetch view history from backend API
  const fetchHistory = async () => {
    if (!authenticated) {
      setHistoryList([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await historyService.getMyHistory(1, MAX_HISTORY_LIMIT);
      const items = (res.result || []).map((pub) => toRentProperty(pub));
      setHistoryList(items);
      dispatch(setHistoryIds(items.map((i) => i.id)));
    } catch (error) {
      console.error("Failed to load view history:", error);
      toast.error("Không thể tải lịch sử xem tin.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialized && authenticated) {
      fetchHistory();
    } else if (initialized && !authenticated) {
      setHistoryList([]);
      setIsLoading(false);
    }
  }, [initialized, authenticated]);

  // Filter & Sort Logic
  const filteredAndSortedList = useMemo(() => {
    let result = [...historyList];

    // 1. Filter by category
    if (activeCategory !== "all") {
      result = result.filter((item) => item.category === activeCategory);
    }

    // 2. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          item.district.toLowerCase().includes(q) ||
          item.city.toLowerCase().includes(q)
      );
    }

    // 3. Sort
    result.sort((a, b) => {
      if (sortBy === "price_asc") return a.priceMillion - b.priceMillion;
      if (sortBy === "price_desc") return b.priceMillion - a.priceMillion;
      if (sortBy === "area_desc") return b.areaM2 - a.areaM2;
      return 0; // Default recent
    });

    return result;
  }, [historyList, activeCategory, searchQuery, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, sortBy]);

  // Pagination calculation (8 items per page)
  const totalItems = filteredAndSortedList.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentItems = filteredAndSortedList.slice(startIndex, endIndex);

  // Handle page change with smooth scroll
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    listingsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // Clear all viewing history
  const handleClearAllHistory = async () => {
    if (historyList.length === 0) return;
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem tin?")) {
      const current = [...historyList];
      setHistoryList([]);
      try {
        await dispatch(clearHistoryThunk()).unwrap();
        toast.success("Đã xóa toàn bộ lịch sử xem tin.");
      } catch {
        toast.error("Có lỗi xảy ra khi xóa lịch sử.");
        setHistoryList(current);
      }
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Đang tải...</span>
      </div>
    );
  }

  if (initialized && !authenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1 pt-32 pb-16 flex items-center justify-center">
          <div className="max-w-md w-full mx-auto px-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <History className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold font-heading">Đăng nhập để xem lịch sử</h2>
              <p className="text-sm text-muted-foreground">
                Lịch sử xem tin đăng chỉ dành cho tài khoản đã đăng nhập.
              </p>
            </div>
            <Button
              onClick={() => login()}
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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* 1. Main Header */}
      <Header />

      {/* 2. Page Content */}
      <main className="flex-1 pt-24 pb-16">
        <div
          ref={listingsSectionRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
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
            <span className="font-semibold text-foreground">Lịch sử xem tin</span>
          </nav>

          {/* Page Title & Stats */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border/80 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
                  Lịch sử xem tin
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {historyList.length} / 40 tin
                </span>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                Tự động ghi nhận tối đa 40 tin đăng bạn đã xem gần đây nhất, giúp bạn dễ dàng so sánh và tìm lại căn nhà phù hợp.
              </p>
            </div>

            {/* Quick Actions (Clear history) */}
            {historyList.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllHistory}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-red-50 dark:hover:bg-red-950/40 text-muted-foreground hover:text-red-600 hover:border-red-200 text-xs font-semibold transition-all shadow-2xs self-start md:self-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa lịch sử</span>
              </button>
            )}
          </div>

          {/* Search, Filter Tabs & Sorting Bar */}
          {historyList.length > 0 && (
            <div className="space-y-4 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Category Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {HISTORY_CATEGORIES.map((cat) => {
                    const count =
                      cat.id === "all"
                        ? historyList.length
                        : historyList.filter((f) => f.category === cat.id).length;
                    const isActive = activeCategory === cat.id;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? "bg-foreground text-background shadow-xs"
                            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        }`}
                      >
                        <span>{cat.label}</span>
                        <span
                          className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                            isActive
                              ? "bg-background text-foreground"
                              : "bg-background/80 text-muted-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Right: Search & Sort */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {/* Search within history */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm trong lịch sử xem..."
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-card border border-border rounded-xl focus:border-primary/50 text-foreground placeholder:text-muted-foreground outline-none shadow-2xs transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative shrink-0">
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(
                          e.target.value as
                            | "recent"
                            | "price_asc"
                            | "price_desc"
                            | "area_desc"
                        )
                      }
                      className="appearance-none bg-card border border-border text-foreground text-xs sm:text-sm font-medium rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-primary/50 shadow-2xs cursor-pointer"
                    >
                      <option value="recent">Mới xem gần đây</option>
                      <option value="price_asc">Giá: Thấp đến Cao</option>
                      <option value="price_desc">Giá: Cao đến Thấp</option>
                      <option value="area_desc">Diện tích: Lớn nhất</option>
                    </select>
                    <ArrowUpDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Items Counter Bar */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 px-1">
                <span>
                  Hiển thị{" "}
                  <strong className="text-foreground font-semibold">
                    {totalItems > 0 ? `${startIndex + 1} - ${endIndex}` : "0"}
                  </strong>{" "}
                  trên tổng số{" "}
                  <strong className="text-foreground font-semibold">
                    {totalItems}
                  </strong>{" "}
                  tin đã xem
                </span>
                <span>Trang {currentPage} / {totalPages} (8 tin/trang)</span>
              </div>
            </div>
          )}

          {/* 3. Properties Grid or Empty State */}
          {isLoading ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Đang tải lịch sử xem tin...</p>
            </div>
          ) : totalItems === 0 ? (
            <div className="py-16 sm:py-24 text-center flex flex-col items-center justify-center bg-card rounded-3xl border border-border p-8 shadow-2xs">
              <div className="w-20 h-20 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-primary mb-5 shadow-xs animate-in zoom-in-90 duration-300">
                <History className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-2">
                {historyList.length === 0
                  ? "Chưa có lịch sử xem tin nào"
                  : "Không tìm thấy tin đã xem phù hợp"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
                {historyList.length === 0
                  ? "Các tin đăng cho thuê bạn mở xem sẽ được tự động lưu vào đây để bạn dễ dàng theo dõi lại."
                  : "Thử thay đổi bộ lọc thể loại hoặc tìm kiếm với từ khóa khác."}
              </p>
              <Link
                href="/rent"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-md shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Khám phá tin đăng ngay</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentItems.map((property) => (
                <RentCollageCard
                  key={property.id}
                  property={property}
                  viewMode="grid"
                />
              ))}
            </div>
          )}

          {/* 4. Pagination Controls (8 items per page -> 5 pages for 40 items) */}
          {totalPages > 1 && (
            <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground font-medium">
                Đang hiển thị {startIndex + 1} - {endIndex} của {totalItems} tin đã xem
              </span>

              {/* Numbered Pagination Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Trước</span>
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (pageNum) => {
                    const isCurrent = currentPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          isCurrent
                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 scale-105"
                            : "border border-border bg-card hover:bg-muted text-foreground"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                )}

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
                >
                  <span className="hidden sm:inline">Tiếp</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 5. Main Footer */}
      <Footer />
    </div>
  );
}
