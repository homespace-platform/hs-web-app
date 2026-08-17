"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, MapPin, Image as ImageIcon } from "lucide-react";
import { PropertyItem } from "@/data/home-data";
import { useAuth } from "@/components/auth/AuthProvider";

interface PropertyCardProps {
  property: PropertyItem;
  initialFavorited?: boolean;
  onFavoriteToggle?: (id: string, isFavorited: boolean) => void;
  onRemoveFavorite?: (id: string) => void;
}

export default function PropertyCard({
  property,
  initialFavorited = false,
  onFavoriteToggle,
  onRemoveFavorite,
}: PropertyCardProps) {
  const { authenticated } = useAuth();
  const [isFavorited, setIsFavorited] = useState(initialFavorited);

  // Sync with localStorage favorites if available (chỉ khi đã đăng nhập)
  useEffect(() => {
    if (!authenticated) {
      setIsFavorited(false);
      return;
    }
    try {
      const saved = localStorage.getItem("homespace_saved_favorites");
      if (saved) {
        const ids: string[] = JSON.parse(saved);
        if (ids.includes(property.id)) {
          setIsFavorited(true);
        }
      }
    } catch {
      // ignore
    }
  }, [property.id, authenticated]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!authenticated) return;

    const nextState = !isFavorited;
    setIsFavorited(nextState);

    // Save to localStorage
    try {
      const saved = localStorage.getItem("homespace_saved_favorites");
      let ids: string[] = saved ? JSON.parse(saved) : [];
      if (nextState) {
        if (!ids.includes(property.id)) ids.push(property.id);
      } else {
        ids = ids.filter((id) => id !== property.id);
      }
      localStorage.setItem("homespace_saved_favorites", JSON.stringify(ids));

      // Trigger custom event for cross-component sync
      window.dispatchEvent(
        new CustomEvent("favoritesUpdated", { detail: { ids } })
      );
    } catch {
      // ignore
    }

    if (onFavoriteToggle) {
      onFavoriteToggle(property.id, nextState);
    }

    if (!nextState && onRemoveFavorite) {
      onRemoveFavorite(property.id);
    }
  };

  return (
    <div className="group bg-transparent rounded-2xl transition-all duration-200 flex flex-col h-full">
      {/* 1. Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted shadow-xs">
        <img
          src={property.imageUrl}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {authenticated && (
          <button
            type="button"
            onClick={handleToggle}
            className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full transition-transform hover:scale-110 active:scale-95 cursor-pointer"
            aria-label={isFavorited ? "Bỏ yêu thích" : "Yêu thích"}
            title={isFavorited ? "Bỏ yêu thích" : "Lưu tin này"}
          >
            <Heart
              className={`w-5 h-5 drop-shadow-md transition-colors ${
                isFavorited
                  ? "fill-rose-500 text-rose-500 stroke-rose-500"
                  : "text-white fill-black/20 stroke-white stroke-[2.2]"
              }`}
            />
          </button>
        )}

        {/* Bottom Dark Gradient Info Bar (Time Ago & Photos Count) */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex items-center justify-between text-white text-[11px] font-semibold select-none pointer-events-none">
          <span>{property.timeAgo || "Vừa đăng"}</span>
          <div className="flex items-center gap-1">
            <span>{property.photosCount || 8}</span>
            <ImageIcon className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 2. Property Information Details */}
      <div className="pt-2.5 pb-1 flex flex-col flex-grow justify-between">
        <div>
          {/* Uppercase Title (2-line clamp) */}
          <Link href={`#property-${property.id}`}>
            <h3 className="font-heading font-bold text-sm sm:text-[15px] text-slate-800 dark:text-slate-100 uppercase line-clamp-2 leading-snug tracking-tight hover:text-primary transition-colors">
              {property.title}
            </h3>
          </Link>

          {/* Bedrooms & Category Specs */}
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-2">
            {property.beds > 0 && <span>{property.beds} PN</span>}
            <span>{property.propertyTypeLabel || "Chung cư"}</span>
          </div>
        </div>

        <div>
          {/* Price & Area Row */}
          <div className="mt-1.5 flex items-baseline gap-2.5">
            <span className="text-[#EF4444] dark:text-[#F87171] font-bold text-base sm:text-lg tracking-tight">
              {property.priceMillion} triệu/tháng
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm">
              {property.areaM2} m²
            </span>
          </div>

          {/* City / Location */}
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{property.city || property.location}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
