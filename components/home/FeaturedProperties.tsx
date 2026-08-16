"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import PropertyCard from "./PropertyCard";
import { FEATURED_PROPERTIES, PROPERTY_CATEGORIES } from "@/data/home-data";
import { Button } from "@/components/ui/button";

export default function FeaturedProperties() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredProperties = FEATURED_PROPERTIES.filter((item) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "verified") return item.isVerified;
    return item.category === activeCategory;
  });

  return (
    <section id="featured-listings" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      {/* Section Title & View All */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
            <h2 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 dark:text-white">
              Nhà đất quanh đây
            </h2>
          </div>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
            Khám phá các lựa chọn bất động sản tốt nhất tại khu vực của bạn, được
            xác thực On-chain và thẩm định bởi AI.
          </p>
        </div>

        <Link
          href="#all-listings"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group self-start md:self-auto"
        >
          <span>Xem tất cả tin đăng</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-8 no-scrollbar">
        {PROPERTY_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredProperties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {filteredProperties.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <p className="text-sm text-slate-500">Chưa có tin đăng phù hợp trong danh mục này.</p>
        </div>
      )}

      {/* Mobile Show More Button */}
      <div className="mt-8 text-center sm:hidden">
        <Button variant="outline" className="w-full justify-center text-blue-600 font-semibold">
          Xem thêm 24+ gợi ý khác
        </Button>
      </div>
    </section>
  );
}
