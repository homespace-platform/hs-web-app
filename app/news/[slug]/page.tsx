"use client";

import React, { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NewsCard from "@/components/news/NewsCard";
import { MOCK_NEWS_ARTICLES } from "@/data/mock-news-data";
import { toast } from "sonner";
import {
  Calendar,
  Eye,
  Clock,
  Home,
  ArrowLeft,
  Share2,
  Bookmark,
  Check,
} from "lucide-react";

interface NewsDetailProps {
  params: Promise<{ slug: string }>;
}

export default function NewsDetailPage({ params }: NewsDetailProps) {
  const resolvedParams = use(params);
  const [copied, setCopied] = useState(false);

  const article =
    MOCK_NEWS_ARTICLES.find((a) => a.slug === resolvedParams.slug) ||
    MOCK_NEWS_ARTICLES[0];

  const relatedArticles = MOCK_NEWS_ARTICLES.filter(
    (a) => a.id !== article.id
  ).slice(0, 3);

  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success("Đã sao chép liên kết bài viết.");
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error("Không thể sao chép liên kết.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Link
              href="/"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </Link>
            <span>/</span>
            <Link href="/news" className="hover:text-primary transition-colors">
              Tin tức
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
              {article.title}
            </span>
          </nav>

          {/* Back button */}
          <Link
            href="/news"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang Tin tức</span>
          </Link>

          {/* Category Pill & Title */}
          <div className="space-y-3 mb-6">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              {article.categoryLabel}
            </span>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-foreground leading-tight">
              {article.title}
            </h1>
          </div>

          {/* Meta Info Bar: Author, Date, Views, Share */}
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-border mb-8">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted">
                <Image
                  src={article.author.avatar}
                  alt={article.author.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {article.author.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {article.author.role}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{article.publishedAt}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                <span>{article.views.toLocaleString("vi-VN")} lượt xem</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{article.readTimeMinutes} phút đọc</span>
              </div>

              {/* Share */}
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer ml-2"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Chia sẻ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Cover Hero Image */}
          <div className="relative w-full aspect-16/9 rounded-3xl overflow-hidden mb-8 shadow-md border border-border">
            <Image
              src={article.coverImage}
              alt={article.title}
              fill
              priority
              className="object-cover"
              unoptimized
            />
          </div>

          {/* Summary Lead */}
          <div className="p-5 rounded-2xl bg-muted/50 border-l-4 border-primary text-sm sm:text-base font-medium text-foreground leading-relaxed mb-8">
            {article.summary}
          </div>

          {/* Body Content */}
          <div className="prose dark:prose-invert max-w-none text-muted-foreground text-sm sm:text-base leading-relaxed space-y-5">
            <p>
              Thị trường bất động sản cho thuê tại Việt Nam đang bước vào giai đoạn phát triển mới với tính minh bạch và tiêu chuẩn hóa cao hơn bao giờ hết. Người thuê nhà hiện đại không chỉ quan tâm đến vị trí hay giá cả đơn thuần, mà còn đặc biệt chú trọng đến sự an toàn pháp lý, tính tiện nghi của không gian sống và sự tiện lợi trong các thủ tục hợp đồng.
            </p>
            <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground pt-4">
              1. Chuyển dịch mạnh mẽ sang giao dịch trực tiếp chủ nhà
            </h2>
            <p>
              Việc loại bỏ các khâu trung gian môi giới không cần thiết giúp người thuê tiết kiệm từ 50% đến 100% một tháng tiền thuê nhà. Đồng thời, chủ nhà cũng chủ động hơn trong việc lựa chọn đối tác thuê phù hợp, tạo dựng mối quan hệ tin cậy lâu dài.
            </p>
            <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground pt-4">
              2. Ứng dụng hợp đồng số và bảo mật tiền cọc
            </h2>
            <p>
              Các nền tảng công nghệ như HomeSpace đang tiên phong trong việc cung cấp quy trình ký số điện tử định danh và cơ chế lưu trữ tiền cọc an toàn. Điều này giúp loại bỏ triệt để các rủi ro lừa đảo cọc hay tranh chấp không đáng có khi bàn giao và thanh lý hợp đồng.
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-8 mt-8 border-t border-border">
            <span className="text-xs font-bold text-foreground mr-1">Thẻ:</span>
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Related Articles */}
          <div className="mt-14 pt-10 border-t border-border">
            <h3 className="font-heading font-extrabold text-xl text-foreground mb-6">
              Bài viết liên quan
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedArticles.map((rel) => (
                <NewsCard key={rel.id} article={rel} />
              ))}
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
