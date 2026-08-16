"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { NewsArticle } from "@/types/news.type";
import {
  Calendar,
  Eye,
  Clock,
  ArrowUpRight,
  Sparkles,
  Share2,
  Check,
} from "lucide-react";

interface NewsCardProps {
  article: NewsArticle;
  featuredLayout?: boolean;
}

export default function NewsCard({
  article,
  featuredLayout = false,
}: NewsCardProps) {
  const [imgSrc, setImgSrc] = useState(article.coverImage);
  const [copied, setCopied] = useState(false);

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(
        `${window.location.origin}/news/${article.slug}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper for category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "market":
        return "bg-blue-500/90 text-white border-blue-400/30";
      case "legal":
        return "bg-purple-600/90 text-white border-purple-400/30";
      case "investment":
        return "bg-amber-600/90 text-white border-amber-400/30";
      case "trend":
        return "bg-rose-500/90 text-white border-rose-400/30";
      case "guide":
      default:
        return "bg-emerald-600/90 text-white border-emerald-400/30";
    }
  };

  return (
    <div className="group rounded-2xl sm:rounded-3xl border border-border bg-card overflow-hidden shadow-2xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col h-full relative">
      <Link
        href={`/news/${article.slug}`}
        className="flex flex-col h-full focus:outline-none"
      >
        {/* 1. Image Thumbnail Container */}
        <div className="relative w-full aspect-16/10 overflow-hidden bg-muted">
          <Image
            src={imgSrc}
            alt={article.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={() =>
              setImgSrc(
                "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80"
              )
            }
            unoptimized
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-80 group-hover:opacity-60 transition-opacity" />

          {/* Top Left: Category Tag */}
          <div className="absolute top-3 left-3 z-10">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-md border shadow-xs ${getCategoryColor(
                article.category
              )}`}
            >
              {article.categoryLabel}
            </span>
          </div>

          {/* Top Right: Featured Badge or Share Button */}
          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            {article.isFeatured && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/90 text-white backdrop-blur-md shadow-xs">
                <Sparkles className="w-3 h-3 fill-white" />
                <span>NỔI BẬT</span>
              </span>
            )}
            <button
              type="button"
              onClick={handleShare}
              title="Sao chép liên kết chia sẻ"
              className="w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Share2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Bottom Overlay: Read time */}
          <div className="absolute bottom-2.5 left-3 z-10 flex items-center gap-1 text-[11px] font-medium text-white/90">
            <Clock className="w-3 h-3" />
            <span>{article.readTimeMinutes} phút đọc</span>
          </div>
        </div>

        {/* 2. Card Body */}
        <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
          <div>
            {/* Title */}
            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {article.title}
            </h3>

            {/* Summary Snippet */}
            <p className="text-xs sm:text-[13px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
              {article.summary}
            </p>
          </div>

          {/* 3. Card Footer Metadata */}
          <div className="pt-3 border-t border-border/70 flex items-center justify-between text-xs text-muted-foreground">
            {/* Published Date */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span>{article.publishedAt}</span>
            </div>

            {/* Views Count */}
            <div className="flex items-center gap-1.5 font-medium">
              <Eye className="w-3.5 h-3.5 text-muted-foreground/70" />
              <span>{article.views.toLocaleString("vi-VN")}</span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
