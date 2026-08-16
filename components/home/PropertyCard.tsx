"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Bed, Bath, Square, ShieldCheck, Clock } from "lucide-react";
import { PropertyItem } from "@/data/home-data";

interface PropertyCardProps {
  property: PropertyItem;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);

  return (
    <div className="group bg-card text-card-foreground rounded-2xl overflow-hidden border border-border shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col h-full">
      {/* Image & Favorite Button Container */}
      <div className="relative h-52 w-full overflow-hidden bg-muted">
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
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-verified/95 backdrop-blur-md text-white text-[11px] font-bold uppercase tracking-wider shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified On-Chain
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-200 text-[11px] font-semibold tracking-wider">
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
          className={`absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer ${
            isFavorited
              ? "bg-rose-500 text-white shadow-md shadow-rose-500/30 scale-110"
              : "bg-background/80 text-foreground hover:text-rose-500 hover:bg-background"
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
            <h3 className="font-heading font-bold text-base sm:text-lg text-card-foreground group-hover:text-primary transition-colors line-clamp-1 mb-1.5">
              {property.title}
            </h3>
          </Link>

          {/* Location */}
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{property.location}</span>
          </p>
        </div>

        {/* Specs & Pricing */}
        <div className="border-t border-border pt-3.5 mt-auto flex items-center justify-between">
          <div>
            <span className="text-base sm:text-lg font-extrabold text-primary">
              {property.priceMillion}{" "}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              triệu/tháng
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1" title="Phòng ngủ">
              <Bed className="w-3.5 h-3.5 text-muted-foreground/70" />
              {property.beds}
            </span>
            <span className="flex items-center gap-1" title="Phòng tắm">
              <Bath className="w-3.5 h-3.5 text-muted-foreground/70" />
              {property.baths}
            </span>
            <span className="flex items-center gap-1" title="Diện tích">
              <Square className="w-3.5 h-3.5 text-muted-foreground/70" />
              {property.areaM2}m²
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
