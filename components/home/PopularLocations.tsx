"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface AreaItem {
  id: string;
  name: string;
  slug: string;
  image: string;
  listingCount: string;
}

const FEATURED_MAIN_AREA: AreaItem = {
  id: "hcm",
  name: "Tp Hồ Chí Minh",
  slug: "ho-chi-minh",
  image: "/area/hcm-1.jpg",
  listingCount: "0 tin đăng",
};

const SUB_AREAS: AreaItem[] = [
  {
    id: "hn",
    name: "Hà Nội",
    slug: "ha-noi",
    image: "/area/ha-noi-1.jpg",
    listingCount: "0 tin đăng",
  },
  {
    id: "dn",
    name: "Đà Nẵng",
    slug: "da-nang",
    image: "/area/da-nang-1.jpg",
    listingCount: "0 tin đăng",
  },
  {
    id: "ct",
    name: "Cần Thơ",
    slug: "can-tho",
    image: "/area/can-tho-1.jpg",
    listingCount: "0 tin đăng",
  },
  {
    id: "bd",
    name: "Bình Dương",
    slug: "binh-duong",
    image: "/area/binh-duong-1.jpg",
    listingCount: "0 tin đăng",
  },
];

const CATEGORIES = [
  { id: "apartment", label: "Căn hộ/Chung cư" },
  { id: "house", label: "Nhà ở" },
  { id: "commercial", label: "Văn phòng, Mặt bằng kinh doanh" },
  { id: "studio", label: "Studio" },
  { id: "room", label: "Phòng trọ" }
];

export default function PopularLocations() {
  const [activeCategory, setActiveCategory] = useState("apartment");

  return (
    <section
      id="popular-locations"
      className="py-12 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      {/* 1. Header with Title */}
      <div className="mb-6">
        <h2 className="font-heading font-bold text-2xl sm:text-3xl text-slate-900 dark:text-white tracking-tight">
          Bất động sản theo khu vực
        </h2>
      </div>

      {/* 2. Category Sub-Tabs with Underline Indicator */}
      <div className="flex items-center gap-6 sm:gap-8 border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`pb-3 text-sm sm:text-base font-semibold whitespace-nowrap transition-all relative cursor-pointer ${isActive
                ? "text-slate-900 dark:text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
            >
              <span>{cat.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Featured Area Grid Layout (1 Large Left, 4 Smaller 2x2 Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
        {/* Left: Large TP. Hồ Chí Minh Card */}
        <Link
          href={`#city-${FEATURED_MAIN_AREA.slug}`}
          className="group relative rounded-2xl sm:rounded-3xl overflow-hidden h-[260px] sm:h-[360px] lg:h-[420px] shadow-sm hover:shadow-xl transition-all duration-300 block bg-slate-800"
        >
          <Image
            src={FEATURED_MAIN_AREA.image}
            alt={FEATURED_MAIN_AREA.name}
            fill
            unoptimized
            className="object-cover object-center w-full h-full group-hover:scale-105 transition-transform duration-500 select-none"
          />

          {/* Hover Dark Background Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:bg-black/30 transition-colors duration-300" />

          {/* Bottom Dark Banner with Text */}
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 z-10 transition-all duration-300 bg-gradient-to-t from-black/90 via-black/60 to-transparent group-hover:bg-black/70 group-hover:backdrop-blur-2xs">
            <h3 className="font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
              {FEATURED_MAIN_AREA.name}
            </h3>
            <p className="text-sm sm:text-base text-slate-200 font-medium mt-0.5">
              {FEATURED_MAIN_AREA.listingCount}
            </p>
          </div>
        </Link>

        {/* Right: 4 Sub-Areas (2x2 Grid) */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 h-full">
          {SUB_AREAS.map((area) => (
            <Link
              key={area.id}
              href={`#city-${area.slug}`}
              className="group relative rounded-2xl sm:rounded-3xl overflow-hidden h-[130px] sm:h-[175px] lg:h-[202px] shadow-sm hover:shadow-xl transition-all duration-300 block bg-slate-800"
            >
              <Image
                src={area.image}
                alt={area.name}
                fill
                unoptimized
                className="object-cover object-center w-full h-full group-hover:scale-105 transition-transform duration-500 select-none"
              />

              {/* Hover Dark Background Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:bg-black/30 transition-colors duration-300" />

              {/* Bottom Dark Banner with Text */}
              <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 z-10 transition-all duration-300 bg-gradient-to-t from-black/90 via-black/60 to-transparent group-hover:bg-black/70 group-hover:backdrop-blur-2xs">
                <h3 className="font-heading font-bold text-sm sm:text-base lg:text-lg text-white tracking-tight">
                  {area.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 font-medium mt-0.5">
                  {area.listingCount}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
