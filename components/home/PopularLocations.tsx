"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import listingService from "@/services/listing.service";
import type { ListingCategory } from "@/types/listing.type";
import { useAppDispatch } from "@/store/hooks";
import { setGlobalCity } from "@/features/location/locationSlice";

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

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

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

  const dispatch = useAppDispatch();
  const rentHref = `/rent?category=${encodeURIComponent(activeCategory)}`;
  const selectCity = (area: AreaItem) => dispatch(setGlobalCity({ code: area.cityId, name: area.name }));

  const renderTile = (area: AreaItem, large: boolean) => (
    <Link
      key={area.id}
      href={rentHref}
      onClick={() => selectCity(area)}
      className={`hs-reveal group relative block overflow-hidden rounded-2xl sm:rounded-3xl bg-muted shadow-sm hover:shadow-md transition-shadow duration-200 active:scale-[0.98] ${FOCUS_RING} ${
        large
          ? "aspect-[4/3] sm:col-span-2 sm:aspect-[16/9] lg:aspect-auto lg:row-span-2"
          : "aspect-[4/3]"
      }`}
    >
      <Image
        src={area.image}
        alt=""
        fill
        unoptimized
        className="object-cover object-center select-none transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
        <h3
          className={`font-heading font-bold tracking-tight text-white ${
            large ? "text-xl sm:text-2xl" : "text-lg"
          }`}
        >
          {area.name}
        </h3>
        <p className="mt-0.5 text-sm font-medium text-white/80">
          {formatListingCount(countsByCity[area.cityId] ?? 0)}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white text-black opacity-0 -translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 group-focus-visible:translate-y-0"
      >
        <ArrowUpRight className="size-4" />
      </span>
    </Link>
  );

  return (
    <section
      id="popular-locations"
      className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      <div className="hs-reveal flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            Khu vực nổi bật
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-balance text-foreground mb-3">
            Nhà cho thuê theo khu vực
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Khám phá không gian sống lý tưởng tại các trung tâm đô thị sôi động nhất cả nước.
          </p>
        </div>
        <Link
          href={rentHref}
          className={`group inline-flex items-center gap-1.5 self-start md:self-auto rounded-lg text-sm font-semibold text-primary hover:text-primary/80 transition-colors duration-200 ${FOCUS_RING}`}
        >
          <span>Xem tất cả</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div
        role="group"
        aria-label="Loại nhà"
        className="flex items-center gap-2 overflow-x-auto p-1 -m-1 mb-7 no-scrollbar [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] sm:[mask-image:none]"
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(cat.id)}
              className={`min-h-10 px-4 rounded-full border text-sm font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 active:scale-[0.98] ${FOCUS_RING} ${
                isActive
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {renderTile(FEATURED_MAIN_AREA, true)}
        {SUB_AREAS.map((area) => renderTile(area, false))}
      </div>
    </section>
  );
}
