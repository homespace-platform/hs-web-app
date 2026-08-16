"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MapPin, Image as ImageIcon } from "lucide-react";
import { PropertyItem } from "@/data/home-data";

interface PropertyCardProps {
  property: PropertyItem;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);

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

        {/* Favorite Heart Button at Top-Right */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsFavorited(!isFavorited);
          }}
          className="absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full transition-transform hover:scale-110 cursor-pointer"
          aria-label="Yêu thích"
        >
          <Heart
            className={`w-5 h-5 drop-shadow-md transition-colors ${
              isFavorited
                ? "fill-rose-500 text-rose-500 stroke-rose-500"
                : "text-white fill-black/20 stroke-white stroke-[2.2]"
            }`}
          />
        </button>

        {/* Bottom Dark Gradient Info Bar (Time Ago & Photos Count) */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex items-center justify-between text-white text-[11px] font-semibold select-none pointer-events-none">
          <span>{property.timeAgo || "43 giây trước"}</span>
          <div className="flex items-center gap-1">
            <span>{property.photosCount || 12}</span>
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
