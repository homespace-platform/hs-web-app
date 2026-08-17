"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { RentPropertyItem } from "@/data/mock-rent-data";
import {
  Heart,
  MapPin,
  Camera,
  Video,
  ShieldCheck,
  Sparkles,
  Bed,
  Bath,
  Maximize,
  Phone,
  MessageCircle,
  Clock,
  Eye,
} from "lucide-react";

interface RentCollageCardProps {
  property: RentPropertyItem;
  viewMode?: "collage" | "grid";
}

export default function RentCollageCard({
  property,
  viewMode = "collage",
}: RentCollageCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const views =
    property.viewsCount ||
    Math.floor(parseInt(property.id.replace(/\D/g, "") || "1", 10) * 87 + 142);

  // 1. Collage View (Clean, Non-duplicated, Price Focused)
  if (viewMode === "collage") {
    return (
      <div className="bg-card rounded-2xl sm:rounded-3xl border border-border overflow-hidden shadow-2xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 group">
        <Link href={`/#property-${property.id}`} className="block p-4 sm:p-5">
          {/* Multi-Image Gallery Collage */}
          <div className="grid grid-cols-12 gap-1.5 sm:gap-2 h-56 sm:h-64 rounded-2xl overflow-hidden relative mb-4 bg-muted">
            {/* Main Big Photo (7 cols) */}
            <div className="col-span-7 relative h-full overflow-hidden">
              <Image
                src={property.images[0]}
                alt={property.title}
                fill
                sizes="(max-width: 768px) 60vw, 40vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                unoptimized
              />
              {/* Category Badge overlay */}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-md">
                {property.categoryLabel}
              </div>
            </div>

            {/* Sub Photo 1 & 2 (5 cols) */}
            <div className="col-span-5 grid grid-rows-2 gap-1.5 sm:gap-2 h-full">
              <div className="relative w-full h-full overflow-hidden">
                <Image
                  src={property.images[1] || property.images[0]}
                  alt={`${property.title} - ảnh 2`}
                  fill
                  sizes="(max-width: 768px) 40vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
              </div>

              {/* Sub Photo 2 with total count badge */}
              <div className="relative w-full h-full overflow-hidden">
                <Image
                  src={property.images[2] || property.images[0]}
                  alt={`${property.title} - ảnh 3`}
                  fill
                  sizes="(max-width: 768px) 40vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                {/* Total Photos Badge */}
                <div className="absolute bottom-2.5 right-2.5 px-2 py-1 rounded-md bg-black/70 text-white text-[11px] font-semibold backdrop-blur-md flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  <span>{property.photosCount}</span>
                </div>
                {property.hasVideo && (
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold backdrop-blur-md flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    <span>Video</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2">
            {property.title}
          </h3>

          {/* Price & Specs Row (Price on Left, Specs on Right) */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <span className="font-heading font-bold text-base sm:text-lg text-rose-600 dark:text-rose-500">
              {property.priceMillion >= 1
                ? `${property.priceMillion} triệu/tháng`
                : `${property.priceMillion * 1000}k/tháng`}
            </span>

            {/* Quick Specs on the right */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <span>{property.areaM2} m²</span>
              <span>·</span>
              <span>{property.beds} PN</span>
              <span>·</span>
              <span>{property.baths} WC</span>
              {property.floor && (
                <>
                  <span>·</span>
                  <span>{property.floor}</span>
                </>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{property.location}</span>
          </div>

          {/* Landlord Footer & Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            {/* Landlord info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                {property.landlord.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-xs min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {property.landlord.name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span>{property.landlord.listingsCount} tin đăng</span>
                  <span>·</span>
                  <span className="text-primary font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {property.timeAgo}
                  </span>
                </p>
              </div>
            </div>

            {/* Action buttons (View count, Chat, Favorite Heart) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Lượt xem bài viết */}
              <div
                className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground font-medium pr-1 select-none"
                title="Lượt xem bài đăng"
              >
                <Eye className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>{views}</span>
              </div>

              {/* Nút Chat */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = "/chat";
                }}
                title="Nhắn tin cho chủ nhà"
                className="w-8 h-8 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-primary flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <MessageCircle className="w-4 h-4" />
              </button>

              {/* Nút Tym (Yêu thích) */}
              <button
                type="button"
                onClick={handleFavoriteClick}
                title={isFavorite ? "Bỏ lưu tin" : "Lưu tin"}
                className={`w-8 h-8 rounded-full border border-border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                  isFavorite
                    ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/60 dark:border-rose-900"
                    : "bg-card hover:bg-muted text-muted-foreground hover:text-rose-500"
                }`}
              >
                <Heart
                  className={`w-4 h-4 transition-transform ${
                    isFavorite ? "fill-rose-500 stroke-rose-500 scale-110" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // 2. Standard Grid Card View (Đồng bộ hoàn toàn với Collage View)
  return (
    <div className="bg-card rounded-2xl sm:rounded-3xl border border-border overflow-hidden shadow-2xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col h-full group">
      <Link href={`/#property-${property.id}`} className="flex flex-col h-full">
        {/* Image Thumbnail */}
        <div className="relative w-full aspect-16/10 overflow-hidden bg-muted">
          <Image
            src={property.images[0]}
            alt={property.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            unoptimized
          />
          {/* Category Badge overlay */}
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-md">
            {property.categoryLabel}
          </div>

          {/* Badges on right: Video / Photo Count */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
            {property.hasVideo && (
              <div className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold backdrop-blur-md flex items-center gap-1">
                <Video className="w-3 h-3" />
                <span>Video</span>
              </div>
            )}
            <div className="px-2 py-0.5 rounded-md bg-black/70 text-white text-[11px] font-semibold backdrop-blur-md flex items-center gap-1">
              <Camera className="w-3 h-3" />
              <span>{property.photosCount}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
          <div>
            {/* Title */}
            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2">
              {property.title}
            </h3>

            {/* Price & Specs Row (Price on Left, Specs on Right) */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="font-heading font-bold text-base text-rose-600 dark:text-rose-500">
                {property.priceMillion >= 1
                  ? `${property.priceMillion} triệu/tháng`
                  : `${property.priceMillion * 1000}k/tháng`}
              </span>

              {/* Quick Specs on the right */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <span>{property.areaM2} m²</span>
                <span>·</span>
                <span>{property.beds} PN</span>
                <span>·</span>
                <span>{property.baths} WC</span>
                {property.floor && (
                  <>
                    <span>·</span>
                    <span>{property.floor}</span>
                  </>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
              <span className="truncate">{property.location}</span>
            </div>
          </div>

          {/* Landlord Footer & Actions (Chat, Tym, Views) */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
            {/* Landlord info */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                {property.landlord.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-xs min-w-0">
                <p className="font-semibold text-foreground truncate max-w-[100px] sm:max-w-[120px]">
                  {property.landlord.name}
                </p>
                <p className="text-[11px] text-primary font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {property.timeAgo}
                </p>
              </div>
            </div>

            {/* Action buttons (View count, Chat, Favorite Heart) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Lượt xem bài viết */}
              <div
                className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium pr-0.5 select-none"
                title="Lượt xem bài đăng"
              >
                <Eye className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>{views}</span>
              </div>

              {/* Nút Chat nhanh */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = "/chat";
                }}
                title="Nhắn tin cho chủ nhà"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-primary flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Nút Tym (Yêu thích) */}
              <button
                type="button"
                onClick={handleFavoriteClick}
                title={isFavorite ? "Bỏ lưu tin" : "Lưu tin"}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-border flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                  isFavorite
                    ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/60 dark:border-rose-900"
                    : "bg-card hover:bg-muted text-muted-foreground hover:text-rose-500"
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform ${
                    isFavorite ? "fill-rose-500 stroke-rose-500 scale-110" : ""
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
