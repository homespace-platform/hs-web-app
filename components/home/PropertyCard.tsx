"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Bed, Bath, Square, ShieldCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PropertyItem } from "@/data/home-data";

interface PropertyCardProps {
  property: PropertyItem;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);

  return (
    <div className="group bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 flex flex-col h-full">
      {/* Image & Favorite Button Container */}
      <div className="relative h-52 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={property.imageUrl}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient overlay for better badge readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

        {/* Verified Status Tag on Image */}
        <div className="absolute top-3 left-3 z-10">
          {property.isVerified ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified On-Chain
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 backdrop-blur-md text-slate-200 text-[11px] font-semibold tracking-wider">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {property.statusText || "Đang xác thực"}
            </span>
          )}
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            setIsFavorited(!isFavorited);
          }}
          className={`absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-md transition-all ${
            isFavorited
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-110"
              : "bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:text-rose-500 hover:bg-white"
          }`}
          aria-label="Yêu thích"
        >
          <Heart
            className={`w-4 h-4 transition-transform ${
              isFavorited ? "fill-current" : ""
            }`}
          />
        </button>
      </div>

      {/* Property Details */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow justify-between">
        <div>
          {/* Title */}
          <Link href={`#property-${property.id}`}>
            <h3 className="font-heading font-bold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 mb-1.5">
              {property.title}
            </h3>
          </Link>

          {/* Location */}
          <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>{property.location}</span>
          </p>
        </div>

        {/* Specs & Pricing */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3.5 mt-auto flex items-center justify-between">
          <div>
            <span className="text-base sm:text-lg font-extrabold text-blue-600 dark:text-blue-400">
              {property.priceMillion}{" "}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              triệu/tháng
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
            <span className="flex items-center gap-1" title="Phòng ngủ">
              <Bed className="w-3.5 h-3.5 text-slate-400" />
              {property.beds}
            </span>
            <span className="flex items-center gap-1" title="Phòng tắm">
              <Bath className="w-3.5 h-3.5 text-slate-400" />
              {property.baths}
            </span>
            <span className="flex items-center gap-1" title="Diện tích">
              <Square className="w-3.5 h-3.5 text-slate-400" />
              {property.areaM2}m²
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
