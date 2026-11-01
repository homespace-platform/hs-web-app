"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import listingService from "@/services/listing.service";
import type { ListingCategory } from "@/types/listing.type";

interface AreaItem {
  id: string;
  cityId: string;
  name: string;
  image: string;
}

const FEATURED_MAIN_AREA: AreaItem = {
  id: "hcm",
  cityId: "12",
  name: "Tp Hồ Chí Minh",
  image: "/area/hcm-1.jpg",
};

const SUB_AREAS: AreaItem[] = [
  { id: "hn", cityId: "11", name: "Hà Nội", image: "/area/ha-noi-1.jpg" },
  { id: "dn", cityId: "13", name: "Đà Nẵng", image: "/area/da-nang-1.jpg" },
  { id: "ct", cityId: "15", name: "Cần Thơ", image: "/area/can-tho-1.jpg" },
  { id: "hp", cityId: "14", name: "Hải Phòng", image: "/area/hai-phong-1.jpg" },
];

const CATEGORIES = [
  { id: "house", label: "Nhà nguyên căn", api: "HOUSE" as ListingCategory },
  { id: "apartment", label: "Căn hộ chung cư", api: "APARTMENT" as ListingCategory },
  { id: "room", label: "Phòng trọ", api: "ROOM" as ListingCategory },
];

function formatListingCount(count: number): string {
  return `${count.toLocaleString("vi-VN")} tin đăng`;
}

export default function PopularLocations() {
  const [activeCategory, setActiveCategory] = useState("apartment");
  const [countsByCity, setCountsByCity] = useState<Record<string, number>>({});

  const apiCategory = useMemo(
    () => CATEGORIES.find((cat) => cat.id === activeCategory)?.api,
    [activeCategory],
  );

  useEffect(() => {
    let cancelled = false;
    listingService
      .getCityListingCounts(apiCategory)
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const row of rows) next[row.cityId] = Number(row.count) || 0;
        setCountsByCity(next);
      })
      .catch(() => {
        if (!cancelled) setCountsByCity({});
      });
    return () => {
      cancelled = true;
    };
  }, [apiCategory]);

  const rentHref = (cityId: string) =>
    `/rent?cityId=${encodeURIComponent(cityId)}&category=${encodeURIComponent(activeCategory)}`;

  return (
    <section
      id="popular-locations"
      className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      <div className="mb-6">
        <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground tracking-tight">
          Nhà cho thuê theo khu vực
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-2xl">
          Khám phá không gian sống lý tưởng tại các trung tâm đô thị sôi động nhất cả nước.
        </p>
      </div>

      <div className="flex items-center gap-6 sm:gap-8 border-b border-border mb-6 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`pb-3 text-sm sm:text-base font-semibold whitespace-nowrap transition-all relative cursor-pointer ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{cat.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-4">
        <Link
          href={rentHref(FEATURED_MAIN_AREA.cityId)}
          className="group relative rounded-2xl sm:rounded-3xl overflow-hidden h-[260px] sm:h-[360px] lg:h-[420px] shadow-sm hover:shadow-xl transition-all duration-300 block bg-slate-800"
        >
          <Image
            src={FEATURED_MAIN_AREA.image}
            alt={FEATURED_MAIN_AREA.name}
            fill
            unoptimized
            className="object-cover object-center w-full h-full group-hover:scale-105 transition-transform duration-500 select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:bg-black/30 transition-colors duration-300" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 z-10 transition-all duration-300 bg-gradient-to-t from-black/90 via-black/60 to-transparent group-hover:bg-black/70 group-hover:backdrop-blur-2xs">
            <h3 className="font-heading font-bold text-xl sm:text-2xl text-white tracking-tight">
              {FEATURED_MAIN_AREA.name}
            </h3>
            <p className="text-sm sm:text-base text-slate-200 font-medium mt-0.5">
              {formatListingCount(countsByCity[FEATURED_MAIN_AREA.cityId] ?? 0)}
            </p>
          </div>
        </Link>

        <div className="grid grid-cols-2 gap-3.5 sm:gap-4 h-full">
          {SUB_AREAS.map((area) => (
            <Link
              key={area.id}
              href={rentHref(area.cityId)}
              className="group relative rounded-2xl sm:rounded-3xl overflow-hidden h-[130px] sm:h-[175px] lg:h-[202px] shadow-sm hover:shadow-xl transition-all duration-300 block bg-slate-800"
            >
              <Image
                src={area.image}
                alt={area.name}
                fill
                unoptimized
                className="object-cover object-center w-full h-full group-hover:scale-105 transition-transform duration-500 select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:bg-black/30 transition-colors duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 z-10 transition-all duration-300 bg-gradient-to-t from-black/90 via-black/60 to-transparent group-hover:bg-black/70 group-hover:backdrop-blur-2xs">
                <h3 className="font-heading font-bold text-sm sm:text-base lg:text-lg text-white tracking-tight">
                  {area.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-200 font-medium mt-0.5">
                  {formatListingCount(countsByCity[area.cityId] ?? 0)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
