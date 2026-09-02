"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NewsCard from "@/components/news/NewsCard";
import { NewsArticle, type PublicNewsSummary } from "@/types/news.type";
import newsService from "@/services/news.service";
import {
  Newspaper,
  Search,
  ChevronLeft,
  ChevronRight,
  Home,
  ArrowRight,
} from "lucide-react";

const ITEMS_PER_PAGE = 8;

const NEWS_CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "market", label: "Thị trường" },
  { id: "legal", label: "Pháp lý" },
  { id: "guide", label: "Cẩm nang thuê" },
  { id: "investment", label: "Đầu tư" },
  { id: "trend", label: "Xu hướng" },
];

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const latestSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    newsService.list({ page: 1, size: 50 })
      .then((response) => setArticles(response.result.map(toArticle)))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // Featured Articles (Tin nổi bật)
  const featuredArticles = useMemo(
    () => articles.filter((a) => a.isFeatured),
    [articles]
  );

  // Filtered Articles for Latest Feed
  const filteredArticles = useMemo(() => {
    let result = [...articles];

    // 1. Category Filter
    if (activeCategory !== "all") {
      result = result.filter((item) => item.category === activeCategory);
    }

    // 2. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }, [articles, activeCategory, searchQuery]);

  // Pagination calculation
  const totalItems = filteredArticles.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);
  const currentItems = filteredArticles.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    latestSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 1. Global Navigation Header */}
      <Header />

      {/* 2. Main News Content */}
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
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
            <span className="font-semibold text-foreground">Tin tức</span>
          </nav>

          {/* Page Title & Stats (Đồng bộ chuẩn đẹp không dùng icon heading) */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border/80 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
                  Tin tức & Thị trường
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {articles.length} bài viết
                </span>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                Cập nhật xu hướng giá thuê, chính sách pháp lý nhà ở mới nhất, quy hoạch hạ tầng và cẩm nang thuê nhà an toàn.
              </p>
            </div>
          </div>

          {/* Search, Filter Tabs & Controls (Đồng bộ chuẩn như trang Yêu thích) */}
          <div className="space-y-4 mb-10">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Category Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {NEWS_CATEGORIES.map((cat) => {
                  const count =
                    cat.id === "all"
                      ? articles.length
                      : articles.filter((a) => a.category === cat.id).length;
                  const isActive = activeCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "bg-foreground text-background shadow-xs font-bold"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span
                        className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? "bg-background text-foreground font-bold"
                            : "bg-background/80 text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Right: Search Input */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="relative flex-1 sm:w-64 lg:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Tìm kiếm bài viết..."
                    className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-card border border-border rounded-xl focus:border-primary/50 text-foreground placeholder:text-muted-foreground outline-none shadow-2xs transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {loading && <p className="py-12 text-center text-sm text-muted-foreground">Đang tải tin tức...</p>}
          {error && <p className="py-12 text-center text-sm text-destructive">Không thể tải tin tức. Vui lòng thử lại sau.</p>}

          {/* Section 1: Tin nổi bật (Theo ảnh mẫu) */}
          {!searchQuery && activeCategory === "all" && featuredArticles.length > 0 && (
            <section className="mb-14">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-border/80 mb-6">
                <div>
                  <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-foreground">
                    Tin nổi bật
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                    Tổng hợp bài viết chiến lược được chọn lọc kỹ.
                  </p>
                </div>

                <a
                  href="#latest-news"
                  className="text-xs sm:text-sm font-semibold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <span>Xem tất cả</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Featured Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredArticles.map((article) => (
                  <NewsCard
                    key={article.id}
                    article={article}
                    featuredLayout={true}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Section 2: Bản tin mới nhất (Theo ảnh mẫu) */}
          <section id="latest-news" ref={latestSectionRef} className="scroll-mt-24">
            <div className="pb-4 border-b border-border/80 mb-6">
              <h2 className="font-heading font-extrabold text-xl sm:text-2xl text-foreground">
                Bản tin mới nhất
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Cập nhật liên tục theo từng khu vực và phân khúc.
              </p>
            </div>

            {/* Articles Feed */}
            {filteredArticles.length === 0 ? (
              <div className="bg-card rounded-3xl border border-border p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground/50">
                  <Newspaper className="w-8 h-8" />
                </div>
                <h3 className="font-heading font-bold text-base text-foreground">
                  Không tìm thấy bài viết phù hợp
                </h3>
                <p className="text-xs sm:text-sm max-w-md text-muted-foreground">
                  Hãy thử tìm kiếm với từ khóa khác hoặc chọn danh mục khác.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                {currentItems.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            )}

            {/* Pagination Controls (Đồng bộ chuẩn như trang Yêu thích) */}
            {totalPages > 1 && (
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80 pt-6">
                <p className="text-xs text-muted-foreground font-medium order-2 sm:order-1">
                  Hiển thị <span className="font-bold text-foreground">{startIndex + 1} - {endIndex}</span> trong tổng số <span className="font-bold text-foreground">{totalItems}</span> bài viết
                </p>

                <div className="flex items-center gap-2 order-1 sm:order-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
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
                          onClick={() => handlePageChange(page)}
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
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-10 px-3.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Tiếp</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* 3. Global Footer */}
      <Footer />
    </div>
  );
}

function toArticle(item: PublicNewsSummary): NewsArticle {
  const category = item.category.toLowerCase() as NewsArticle["category"];
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    coverImage: item.thumbnailUrl || "/logo/homespace-logo-removebg.png",
    category,
    categoryLabel: NEWS_CATEGORIES.find((entry) => entry.id === category)?.label || category,
    tags: item.tags || [],
    isFeatured: item.featured,
    publishedAt: item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("vi-VN") : "",
    views: 0,
    readTimeMinutes: 1,
    author: { name: item.authorName || "HomeSpace", avatar: "/logo/homespace-logo-removebg.png", role: "HomeSpace" },
  };
}
