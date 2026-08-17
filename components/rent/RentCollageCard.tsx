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

  // 1. Collage View (Matching User's Reference Screenshot)
  if (viewMode === "collage") {
    return (
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-2xs hover:shadow-lg hover:border-primary/40 transition-all duration-300 group">
        <Link href={`/#property-${property.id}`} className="block p-4 sm:p-5">
          {/* Top Project / Specs Micro-header */}
          <div className="text-xs text-muted-foreground font-medium truncate mb-2.5 flex items-center gap-1.5">
            <span className="text-primary font-semibold">{property.categoryLabel}</span>
            <span>·</span>
            <span>{property.project}</span>
            {property.floor && (
              <>
                <span>·</span>
                <span>{property.floor}</span>
              </>
            )}
            <span>·</span>
            <span>{property.beds}PN</span>
            <span>·</span>
            <span>{property.areaM2}m²</span>
          </div>

          {/* Multi-Image Gallery Collage (Exact match from reference image) */}
          <div className="grid grid-cols-12 gap-1.5 sm:gap-2 h-56 sm:h-64 rounded-xl overflow-hidden relative mb-4 bg-muted">
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

            </div>

            {/* Sub Photo 1 (5 cols top half or stacked) */}
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
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white text-[11px] font-semibold backdrop-blur-md flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  <span>{property.photosCount}</span>
                </div>
                {property.hasVideo && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-rose-600/90 text-white text-[10px] font-bold backdrop-blur-md flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    <span>Video</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-heading font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2">
            {property.title}
          </h3>

          {/* Specs line: Beds · Category */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 font-medium">
            <span>{property.beds} PN</span>
            <span>·</span>
            <span>{property.categoryLabel}</span>
          </div>

          {/* Price & Area Specs (Ref: 3,65 tỷ / 14,5 tr/tháng · 185k/m² · 78 m²) */}
          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mb-2.5">
            <span className="font-heading font-extrabold text-lg sm:text-xl text-rose-600 dark:text-rose-500">
              {property.priceMillion >= 1
                ? `${property.priceMillion} triệu/tháng`
                : `${property.priceMillion * 1000}k/tháng`}
            </span>
            {property.pricePerM2 && (
              <span className="text-xs text-muted-foreground font-medium">
                {property.pricePerM2}
              </span>
            )}
            <span className="text-xs text-muted-foreground font-medium">
              {property.areaM2} m²
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{property.location}</span>
          </div>

          {/* Landlord Footer & Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            {/* Landlord info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                {property.landlord.name.charAt(0)}
              </div>
              <div className="text-xs min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {property.landlord.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {property.landlord.listingsCount} tin đăng · {property.timeAgo}
                </p>
              </div>
            </div>

            {/* Action buttons (Chat, Phone, Favorite Heart) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = "/chat";
                }}
                title="Nhắn tin cho chủ nhà"
                className="w-8 h-8 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-primary flex items-center justify-center transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleFavoriteClick}
                title={isFavorite ? "Bỏ lưu tin" : "Lưu tin"}
                className={`w-8 h-8 rounded-full border border-border flex items-center justify-center transition-all cursor-pointer ${
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

  // 2. Standard Grid Card View
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
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
            <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-bold backdrop-blur-md">
              {property.categoryLabel}
            </span>
          </div>

          <div className="absolute top-3 right-3 z-10">
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                isFavorite
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-black/40 text-white hover:bg-black/70"
              }`}
            >
              <Heart
                className={`w-4 h-4 ${
                  isFavorite ? "fill-white stroke-white" : ""
                }`}
              />
            </button>
          </div>

          <div className="absolute bottom-2.5 right-3 px-2 py-0.5 rounded-md bg-black/60 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-md">
            <Camera className="w-3 h-3" />
            <span>{property.photosCount}</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
          <div>
            <div className="text-xs text-primary font-semibold mb-1">
              {property.project}
            </div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
              {property.title}
            </h3>

            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 font-medium">
              <span className="flex items-center gap-1">
                <Bed className="w-3.5 h-3.5" /> {property.beds} PN
              </span>
              <span className="flex items-center gap-1">
                <Bath className="w-3.5 h-3.5" /> {property.baths} WC
              </span>
              <span className="flex items-center gap-1">
                <Maximize className="w-3.5 h-3.5" /> {property.areaM2} m²
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-border flex items-center justify-between">
            <span className="font-heading font-extrabold text-base sm:text-lg text-rose-600 dark:text-rose-500">
              {property.priceMillion} tr/tháng
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
              {property.district}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
