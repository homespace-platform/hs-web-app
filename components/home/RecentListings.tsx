"use client";

import { useState } from "react";
import Link from "next/link";
import { RECENT_PROPERTIES, PROPERTY_CATEGORIES } from "@/data/home-data";
import PropertyCard from "./PropertyCard";
import { ArrowRight, Clock } from "lucide-react";

export default function RecentListings() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredProperties = RECENT_PROPERTIES.filter((prop) => {
    if (activeCategory === "all") return true;
    return prop.category === activeCategory;
  });

  return (
    <section
      id="recent-listings"
      className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
              Tin cho thuê mới đăng
            </h2>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Các bất động sản cho thuê vừa được cập nhật trực tiếp theo thời gian thực tại khu vực đang chọn.
          </p>
        </div>

        <Link
          href="#all-recent-listings"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors group self-start md:self-auto"
        >
          <span>Xem tất cả tin mới đăng</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        {PROPERTY_CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-foreground text-background shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProperties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  );
}
