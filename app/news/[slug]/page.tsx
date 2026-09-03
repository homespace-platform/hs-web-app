"use client";

import React, { use, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NewsCard from "@/components/news/NewsCard";
import newsService from "@/services/news.service";
import type { NewsArticle, PublicNewsResponse, PublicNewsSummary } from "@/types/news.type";
import { toast } from "sonner";
import {
  Calendar,
  Eye,
  Clock,
  Home,
  ArrowLeft,
  Share2,
  Check,
} from "lucide-react";

interface NewsDetailProps {
  params: Promise<{ slug: string }>;
}

export default function NewsDetailPage({ params }: NewsDetailProps) {
  const resolvedParams = use(params);
  const [copied, setCopied] = useState(false);
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);

  useEffect(() => {
    newsService.getBySlug(resolvedParams.slug).then((response) => {
      setArticle(toArticle(response));
      return newsService.list({ size: 4, category: response.category });
    }).then((response) => {
      if (!response) return;
      setRelatedArticles(response.result.filter((item) => item.slug !== resolvedParams.slug).slice(0, 3).map(toArticle));
    }).catch(() => setArticle(null));
  }, [resolvedParams.slug]);

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

  if (!article) return <div className="min-h-screen bg-background"><Header /><main className="mx-auto max-w-4xl px-4 pt-32 text-center text-muted-foreground">Đang tải bài viết hoặc bài viết không tồn tại.</main></div>;

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
            {article.contentBlocks?.map((block, index) => block.type === "IMAGE" ? (
              <figure key={index} className="space-y-2">
                <img src={block.storageObjectId ? article.media?.find((media) => media.storageObjectId === block.storageObjectId)?.url || "" : ""} alt="Ảnh trong bài viết" className="w-full rounded-2xl object-contain" />
                {block.caption && <figcaption className="text-center text-xs italic text-muted-foreground">{block.caption}</figcaption>}
              </figure>
            ) : block.type === "HEADING" ? (
              <h2 key={index} className="font-heading font-bold text-lg sm:text-xl text-foreground pt-4" dangerouslySetInnerHTML={{ __html: sanitizeNewsInlineMarkup(block.text) }} />
            ) : block.type === "QUOTE" ? (
              <blockquote key={index} className="border-l-4 border-primary pl-4 italic" dangerouslySetInnerHTML={{ __html: sanitizeNewsInlineMarkup(block.text) }} />
            ) : <p key={index} dangerouslySetInnerHTML={{ __html: sanitizeNewsInlineMarkup(block.text) }} />)}
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

const NEWS_INLINE_TAGS = new Map([
  ["strong", "strong"],
  ["b", "strong"],
  ["em", "em"],
  ["i", "em"],
  ["u", "u"],
  ["br", "br"],
]);

function sanitizeNewsInlineMarkup(value: string | null | undefined) {
  value = value ?? "";
  value = value.replace(/&lt;br\s*\/?&gt;/gi, "<br>");
  const tagPattern = /<\/?[a-z][^>]*>/gi;
  let result = "";
  let cursor = 0;

  for (const match of value.matchAll(tagPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    result += escapeNewsText(value.slice(cursor, index));
    const tag = token.match(/^<\/?\s*([a-z]+)\b/i)?.[1]?.toLowerCase();
    const normalized = tag ? NEWS_INLINE_TAGS.get(tag) : undefined;
    result += normalized
      ? token.startsWith("</") ? `</${normalized}>` : `<${normalized}>`
      : escapeNewsHtml(token);
    cursor = index + token.length;
  }

  return result + escapeNewsText(value.slice(cursor));
}

function escapeNewsHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeNewsText(value: string) {
  return value
    .replace(/&(?!amp;|lt;|gt;|quot;|#\d+;|#x[\da-f]+;)/gi, "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toArticle(item: PublicNewsResponse | PublicNewsSummary): NewsArticle {
  const category = item.category.toLowerCase() as NewsArticle["category"];
  return {
    id: item.id, slug: item.slug, title: item.title, summary: item.summary,
    coverImage: item.thumbnailUrl || "/logo/homespace-logo-removebg.png", category,
    categoryLabel: category, tags: item.tags || [], isFeatured: item.featured,
    publishedAt: item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("vi-VN") : "",
    views: 0, readTimeMinutes: 1,
    author: { name: item.authorName || "HomeSpace", avatar: "/logo/homespace-logo-removebg.png", role: "HomeSpace" },
    contentBlocks: "contentBlocks" in item ? item.contentBlocks : [],
    media: "media" in item ? item.media : [],
  };
}
