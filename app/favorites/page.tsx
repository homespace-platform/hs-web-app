"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PropertyCard from "@/components/property/PropertyCard";
import { useAuth } from "@/features/auth/useAuth";
import { MOCK_FAVORITE_PROPERTIES } from "@/data/mock-favorites-data";
import { PropertyItem } from "@/data/home-data";
import { toast } from "sonner";
import {
  Heart,
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Home,
  Trash2,
  Sparkles,
  ArrowUpDown,
  Building,
  LogIn,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 8;

const FAVORITE_CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "apartment", label: "Căn hộ/Chung cư" },
  { id: "house", label: "Nhà ở" },
  { id: "studio", label: "Studio" },
  { id: "office", label: "Văn phòng" },
  { id: "room", label: "Phòng trọ" },
];

export default function FavoritesPage() {
  const { initialized, authenticated, login } = useAuth();
  const [favorites, setFavorites] = useState<PropertyItem[]>(
    MOCK_FAVORITE_PROPERTIES
  );
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "area_desc">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const listingsSectionRef = useRef<HTMLDivElement>(null);

  // Filter & Sort Logic
  const filteredAndSortedFavorites = useMemo(() => {
    let result = [...favorites];

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
      return 0; // Default newest
    });

    return result;
  }, [favorites, activeCategory, searchQuery, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, sortBy]);

  // Pagination calculation
  const totalItems = filteredAndSortedFavorites.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentItems = filteredAndSortedFavorites.slice(startIndex, endIndex);

  // Handle page change with smooth scroll
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    listingsSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // Remove a single favorite item
  const handleRemoveFavorite = (id: string) => {
    setFavorites((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear all favorites
  const handleClearAll = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tất cả tin đăng yêu thích?")) {
      setFavorites([]);
      try {
        localStorage.removeItem("homespace_saved_favorites");
      } catch {
        toast.error("Không thể cập nhật dữ liệu yêu thích trên trình duyệt.");
        return;
      }
      toast.success("Đã xóa tất cả tin yêu thích.");
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
            <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
              <Heart className="w-7 h-7 text-rose-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold font-heading">
                Đăng nhập để xem yêu thích
              </h1>
              <p className="text-sm text-muted-foreground">
                Danh sách tin đã lưu chỉ dành cho tài khoản đã đăng nhập.
              </p>
            </div>
            <Button
              onClick={() => login()}
              className="rounded-full h-10 px-6 cursor-pointer"
            >
              <LogIn className="w-4 h-4" data-icon="inline-start" />
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
            <span className="font-semibold text-foreground">Tin đăng đã lưu</span>
          </nav>

          {/* Page Title & Stats */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border/80 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
                  Danh sách yêu thích
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {favorites.length} tin
                </span>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                Quản lý các không gian sống bạn đang quan tâm. Dễ dàng so sánh giá, vị trí và liên hệ trực tiếp chủ nhà.
              </p>
            </div>

            {/* Quick Actions (Clear all) */}
            {favorites.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-red-50 dark:hover:bg-red-950/40 text-muted-foreground hover:text-red-600 hover:border-red-200 text-xs font-semibold transition-all shadow-2xs self-start md:self-auto cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa tất cả</span>
              </button>
            )}
          </div>

          {/* Search, Filter Tabs & Sorting Bar */}
          {favorites.length > 0 && (
            <div className="space-y-4 mb-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Category Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {FAVORITE_CATEGORIES.map((cat) => {
                    const count =
                      cat.id === "all"
                        ? favorites.length
                        : favorites.filter((f) => f.category === cat.id).length;
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
                  {/* Search within favorites */}
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm theo tên, quận..."
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
                            | "newest"
                            | "price_asc"
                            | "price_desc"
                            | "area_desc"
                        )
                      }
                      className="appearance-none bg-card border border-border text-foreground text-xs sm:text-sm font-medium rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-primary/50 shadow-2xs cursor-pointer"
                    >
                      <option value="newest">Mới lưu gần đây</option>
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
                  tin đăng
                </span>
                <span>Trang {currentPage} / {totalPages}</span>
              </div>
            </div>
          )}

          {/* 3. Properties Grid or Empty State */}
          {totalItems === 0 ? (
            <div className="py-16 sm:py-24 text-center flex flex-col items-center justify-center bg-card rounded-3xl border border-border p-8 shadow-2xs">
              <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-500 mb-5 shadow-xs animate-in zoom-in-90 duration-300">
                <Heart className="w-10 h-10 stroke-[1.5]" />
              </div>
              <h3 className="font-heading font-bold text-lg sm:text-xl text-foreground mb-2">
                {favorites.length === 0
                  ? "Chưa có tin đăng yêu thích nào"
                  : "Không tìm thấy tin đăng phù hợp"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
                {favorites.length === 0
                  ? "Hãy nhấn vào biểu tượng trái tim ở góc các căn hộ bạn yêu thích để lưu và xem lại bất cứ lúc nào."
                  : "Thử thay đổi bộ lọc thể loại hoặc tìm kiếm với từ khóa khác."}
              </p>
              <Link
                href="/#featured-listings"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-md shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Khám phá tin đăng mới</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {currentItems.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  initialFavorited={true}
                  onRemoveFavorite={handleRemoveFavorite}
                />
              ))}
            </div>
          )}

          {/* 4. Pagination Controls (8 items per page) */}
          {totalPages > 1 && (
            <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground font-medium">
                Đang hiển thị {startIndex + 1} - {endIndex} của {totalItems} tin đăng
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
