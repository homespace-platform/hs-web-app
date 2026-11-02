"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building, Loader2, MapPin } from "lucide-react";
import RentCollageCard from "@/components/rent/RentCollageCard";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";
import { rentHrefFromLocation } from "@/lib/rent-filter-state";
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
    const base = rentHrefFromLocation(cityId, wardId);
    if (!apiCategory) return base;
    const separator = base.includes("?") ? "&" : "?";
    return `${base}${separator}category=${encodeURIComponent(
      activeCategory,
    )}`;
  }, [activeCategory, apiCategory, cityId, wardId]);

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
    <section id="featured-listings" className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground tracking-tight mb-2">
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
          className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors group self-start md:self-auto"
        >
          <span>Xem tất cả tin đăng</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
        {PROPERTY_CATEGORIES.map((category) => {
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveCategory(category.id)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {!hydrated || isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Đang tải tin đăng mới nhất...</span>
        </div>
      ) : !cityId ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
          <MapPin className="w-8 h-8 text-primary" />
          <p className="text-sm font-semibold text-foreground">Chưa chọn tỉnh/thành phố</p>
          <p className="text-xs sm:text-sm max-w-md">
            Dùng bộ chọn khu vực trên header để chọn tỉnh. Có thể thu hẹp thêm theo phường/xã.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-destructive text-sm">
          {error}
        </div>
      ) : properties.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-10 text-center text-muted-foreground flex flex-col items-center gap-3">
          <Building className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm font-semibold text-foreground">
            Chưa có tin mới tại {areaLabel}
          </p>
          <p className="text-xs sm:text-sm max-w-md">
            Thử đổi loại nhà hoặc chọn phạm vi tỉnh/phường khác trên header.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 items-stretch">
          {properties.map((property) => (
            <RentCollageCard
              key={property.id}
              property={property}
              viewMode="grid"
              initialFavorited={favoriteSet.has(property.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
