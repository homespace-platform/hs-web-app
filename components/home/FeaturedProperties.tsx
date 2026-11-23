"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building, CircleAlert, MapPin } from "lucide-react";
import RentCollageCard from "@/components/rent/RentCollageCard";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hydrateLocation } from "@/features/location/locationSlice";
import type { ListingCategory } from "@/types/listing.type";
import type { RentPropertyItem } from "@/types/rent.type";

const PROPERTY_CATEGORIES = [
  { id: "all", label: "Tất cả", api: undefined as ListingCategory | undefined },
  { id: "house", label: "Nhà nguyên căn", api: "HOUSE" as ListingCategory },
  { id: "apartment", label: "Căn hộ chung cư", api: "APARTMENT" as ListingCategory },
  { id: "room", label: "Phòng trọ", api: "ROOM" as ListingCategory },
];

const PAGE_SIZE = 8;

export default function FeaturedProperties() {
  const dispatch = useAppDispatch();
  const { cityId, cityName, wardId, wardName, hydrated } = useAppSelector(
    (state) => state.location,
  );
  const favoriteIds = useAppSelector((state) => state.favorite.ids);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const [activeCategory, setActiveCategory] = useState("all");
  const [properties, setProperties] = useState<RentPropertyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    dispatch(hydrateLocation());
  }, [dispatch]);

  const apiCategory = useMemo(
    () => PROPERTY_CATEGORIES.find((cat) => cat.id === activeCategory)?.api,
    [activeCategory],
  );

  const areaLabel = wardId && wardName
    ? wardName
    : cityName || "khu vực của bạn";

  const viewAllHref = useMemo(() => {
    // City/ward are already in the location store; /rent reads them from there.
    if (!apiCategory) return "/rent";
    return `/rent?category=${encodeURIComponent(activeCategory)}`;
  }, [activeCategory, apiCategory]);

  useEffect(() => {
    if (!hydrated) return;
    if (!cityId) {
      setProperties([]);
      setIsLoading(false);
      setError("");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError("");

    listingService
      .getPublicListings({
        page: 1,
        size: PAGE_SIZE,
        cityId,
        wardId: wardId || undefined,
        category: apiCategory,
        sort: "newest",
      })
      .then((data) => {
        if (cancelled) return;
        setProperties((data.result ?? []).map((item) => toRentProperty(item)));
      })
      .catch(() => {
        if (cancelled) return;
        setProperties([]);
        setError("Không thể tải tin đăng quanh bạn. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiCategory, cityId, hydrated, wardId]);

  return (
    <section id="featured-listings" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="hs-reveal flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            Gợi ý cho bạn
          </p>
          <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-balance text-foreground mb-3">
            Nhà cho thuê quanh bạn
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            {cityId
              ? `Tin mới nhất tại ${areaLabel}${wardId ? "" : " (toàn tỉnh/thành)"}, xác thực On-chain và thẩm định bởi AI.`
              : "Chọn tỉnh/thành trên thanh điều hướng để xem tin mới nhất quanh bạn."}
          </p>
        </div>

        <Link
          href={viewAllHref}
          className="group inline-flex items-center gap-1.5 self-start md:self-auto rounded-lg text-sm font-semibold text-primary hover:text-primary/80 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span>Xem tất cả tin đăng</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div
        role="group"
        aria-label="Loại nhà"
        className="flex items-center gap-2 overflow-x-auto p-1 -m-1 mb-7 no-scrollbar [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-16px),transparent)] sm:[mask-image:none]"
      >
        {PROPERTY_CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(category.id)}
              className={`min-h-10 px-4 rounded-full border text-sm font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                isActive
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {!hydrated || isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6"
          role="status"
          aria-live="polite"
        >
          <span className="sr-only">Đang tải</span>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="rounded-3xl border border-border bg-card overflow-hidden animate-pulse motion-reduce:animate-none"
            >
              <div className="aspect-[4/3] bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 rounded-full bg-muted" />
                <div className="h-4 w-1/2 rounded-full bg-muted" />
                <div className="h-3 w-2/3 rounded-full bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : !cityId ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center flex flex-col items-center gap-3">
          <div className="grid place-items-center size-14 rounded-full bg-primary/10 text-primary">
            <MapPin className="w-6 h-6" />
          </div>
          <p className="font-heading text-base font-semibold text-foreground">Chưa chọn tỉnh/thành phố</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Dùng bộ chọn khu vực trên header để chọn tỉnh. Có thể thu hẹp thêm theo phường/xã.
          </p>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-3xl border border-border bg-card p-10 text-center flex flex-col items-center gap-3">
          <div className="grid place-items-center size-14 rounded-full bg-destructive/10 text-destructive">
            <CircleAlert className="w-6 h-6" />
          </div>
          <p className="font-heading text-base font-semibold text-destructive">Không thể tải tin đăng</p>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center flex flex-col items-center gap-3">
          <div className="grid place-items-center size-14 rounded-full bg-muted text-muted-foreground">
            <Building className="w-6 h-6" />
          </div>
          <p className="font-heading text-base font-semibold text-foreground">
            Chưa có tin mới tại {areaLabel}
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            Thử đổi loại nhà hoặc chọn phạm vi tỉnh/phường khác trên header.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">
          {properties.map((property) => (
            <div key={property.id} className="hs-reveal flex flex-col">
              <RentCollageCard
                property={property}
                viewMode="grid"
                initialFavorited={favoriteSet.has(property.id)}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
