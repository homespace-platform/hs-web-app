"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Heart,
  Video,
  Camera,
  MessageCircle,
  Eye,
} from "lucide-react";
import type { RentPropertyItem } from "@/types/rent.type";
import { formatVietnamesePrice } from "@/lib/format-currency";
import { useAuth } from "@/features/auth/useAuth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleFavoriteItem } from "@/features/favorite/favoriteSlice";
import UserAvatar from "@/components/common/UserAvatar";
import { toast } from "sonner";

interface RentCollageCardProps {
  property: RentPropertyItem;
  viewMode?: "collage" | "grid";
  initialFavorited?: boolean;
  onFavoriteChange?: (listingId: string, isFavorited: boolean) => void;
}

export default function RentCollageCard({
  property,
  viewMode = "collage",
  initialFavorited = false,
  onFavoriteChange,
}: RentCollageCardProps) {
  const { authenticated, login } = useAuth();
  const dispatch = useAppDispatch();
  const isFavoritedInStore = useAppSelector((state) =>
    state.favorite.ids.includes(property.id)
  );
  const hasLoaded = useAppSelector(
    (state) => state.favorite.status === "succeeded"
  );
  const isFavorite = hasLoaded ? isFavoritedInStore : initialFavorited;
  const [isToggling, setIsToggling] = useState(false);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation?.();
    }

    if (!authenticated) {
      toast.error("Vui lòng đăng nhập để lưu tin yêu thích!");
      login();
      return;
    }

    if (isToggling) return;
    setIsToggling(true);

    try {
      const result = await dispatch(toggleFavoriteItem(property.id)).unwrap();
      if (result.isFavorite) {
        toast.success("Đã lưu vào danh sách yêu thích!");
      } else {
        toast.success("Đã bỏ lưu tin đăng!");
      }
      onFavoriteChange?.(property.id, result.isFavorite);
    } catch {
      toast.error("Không thể cập nhật yêu thích. Vui lòng thử lại!");
    } finally {
      setIsToggling(false);
    }
  };

  const heartButtonElement = (
    <button
      type="button"
      onClick={handleFavoriteClick}
      title={isFavorite ? "Bỏ lưu tin" : "Lưu tin này"}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md backdrop-blur-md active:scale-90 ${
        isFavorite
          ? "bg-white text-rose-500 shadow-rose-500/20"
          : "bg-black/40 hover:bg-black/60 text-white hover:text-rose-400"
      }`}
    >
      <Heart
        className={`w-4 h-4 transition-transform ${
          isFavorite ? "fill-rose-500 text-rose-500 scale-110" : ""
        }`}
      />
    </button>
  );

  const rawPrice =
    (property.details?.rawPrice as number) ?? property.priceMillion * 1_000_000;
  const formattedPrice = formatVietnamesePrice(rawPrice, "tháng");

  // 1. Collage View (Clean, Non-duplicated, Category-Exclusive Specs)
  if (viewMode === "collage") {
    return (
      <div className="bg-card rounded-2xl sm:rounded-3xl border border-border overflow-hidden shadow-2xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 group relative">
        {/* Nút Tim đặt ở ngoài thẻ Link để tránh kích hoạt điều hướng trang */}
        <div className="absolute top-[26px] right-[26px] sm:top-[30px] sm:right-[30px] z-30 pointer-events-auto">
          {heartButtonElement}
        </div>

        <Link href={`/rent/${property.id}`} className="block p-4 sm:p-5">
          {/* Image Gallery: adapts to 3+, 2, 1, or 0 images (NEVER duplicates images) */}
          {property.images.length >= 3 ? (
            <div className="grid grid-cols-12 gap-1.5 sm:gap-2 h-56 sm:h-64 rounded-2xl overflow-hidden relative mb-4 bg-muted">
              {/* Main Big Photo (7 cols) */}
              <div className="col-span-7 relative h-full overflow-hidden">
                <Image
                  src={property.images[0]}
                  alt={property.title}
                  fill
                  sizes="(max-width: 768px) 60vw, 40vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-md">
                  {property.categoryLabel}
                </div>
              </div>

              {/* Sub Photos (5 cols) */}
              <div className="col-span-5 grid grid-rows-2 gap-1.5 sm:gap-2 h-full">
                <div className="relative w-full h-full overflow-hidden">
                  <Image
                    src={property.images[1]}
                    alt={`${property.title} - ảnh 2`}
                    fill
                    sizes="(max-width: 768px) 40vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />
                </div>
                <div className="relative w-full h-full overflow-hidden">
                  <Image
                    src={property.images[2]}
                    alt={`${property.title} - ảnh 3`}
                    fill
                    sizes="(max-width: 768px) 40vw, 25vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    unoptimized
                  />

                  {property.hasVideo && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-rose-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                      <Video className="w-3 h-3" />
                      <span>Video</span>
                    </div>
                  )}

                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-xs">
                    <Camera className="w-3.5 h-3.5" />
                    <span>{property.photosCount}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : property.images.length === 2 ? (
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 h-56 sm:h-64 rounded-2xl overflow-hidden relative mb-4 bg-muted">
              <div className="relative w-full h-full overflow-hidden">
                <Image
                  src={property.images[0]}
                  alt={property.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-md">
                  {property.categoryLabel}
                </div>
              </div>
              <div className="relative w-full h-full overflow-hidden">
                <Image
                  src={property.images[1]}
                  alt={`${property.title} - ảnh 2`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-xs">
                  <Camera className="w-3.5 h-3.5" />
                  <span>2</span>
                </div>
              </div>
            </div>
          ) : property.images.length === 1 ? (
            <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden mb-4 bg-muted">
              <Image
                src={property.images[0]}
                alt={property.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                unoptimized
              />
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-md">
                {property.categoryLabel}
              </div>
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-xs">
                <Camera className="w-3.5 h-3.5" />
                <span>1</span>
              </div>
            </div>
          ) : (
            <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden mb-4 bg-muted flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border">
              <Camera className="w-8 h-8 opacity-40 mb-1" />
              <span className="text-xs">Chưa có hình ảnh</span>
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-md">
                {property.categoryLabel}
              </div>
            </div>
          )}

          {/* Title */}
          <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2">
            {property.title}
          </h3>

          {/* Price & Specs Row (Price on Left, Specs on Right) */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-2">
            <span className="font-heading font-bold text-base sm:text-lg text-rose-600 dark:text-rose-500 shrink-0">
              {formattedPrice}
            </span>

            {/* Category-Exclusive Quick Specs */}
            {renderCardSpecs(property)}
          </div>

          {/* Location */}
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground mb-3.5">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
            <span className="leading-relaxed break-words">{property.location}</span>
          </div>

          {/* Landlord Footer & Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            {/* Landlord info */}
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                src={property.landlord.avatar}
                name={property.landlord.name}
                sizeClassName="w-7 h-7 text-xs"
              />
              <div className="text-xs min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {property.landlord.name}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span>{property.landlord.listingsCount} tin đăng</span>
                  <span>·</span>
                  <span className="text-primary font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {property.timeAgo}
                  </span>
                </p>
              </div>
            </div>

            {/* Action buttons (Lượt xem, Chat) */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Lượt xem bài đăng (đặt bên trái nút chat) */}
              <div
                className="flex items-center gap-1 text-xs text-muted-foreground font-medium select-none"
                title={`${property.viewCount ?? property.viewsCount ?? 0} lượt xem`}
              >
                <Eye className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>{property.viewCount ?? property.viewsCount ?? 0}</span>
              </div>

              {/* Nút Chat */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = "/chat";
                }}
                title="Nhắn tin cho chủ nhà"
                className="w-8 h-8 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-primary flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // 2. Compact Grid View (Standard Single-Image Card)
  return (
    <div className="bg-card rounded-2xl sm:rounded-3xl border border-border overflow-hidden shadow-2xs hover:shadow-xl hover:border-primary/40 transition-all duration-300 group flex flex-col relative h-full">
      {/* Nút Tim đặt ở ngoài thẻ Link để tránh kích hoạt điều hướng trang */}
      <div className="absolute top-2.5 right-2.5 z-30 pointer-events-auto">
        {heartButtonElement}
      </div>

      <Link href={`/rent/${property.id}`} className="flex flex-col flex-1 h-full">
        {/* Single Main Image */}
        <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-muted shrink-0">
          {property.images[0] ? (
            <Image
              src={property.images[0]}
              alt={property.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground border border-dashed border-border">
              <Camera className="w-8 h-8 opacity-40 mb-1" />
              <span className="text-xs">Chưa có hình ảnh</span>
            </div>
          )}

          {/* Category Badge overlay */}
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-semibold backdrop-blur-md">
            {property.categoryLabel}
          </div>

          {/* Bottom-right badges (Video, Photo count) */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
            {property.hasVideo && (
              <div className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm">
                <Video className="w-3 h-3" />
                <span>Video</span>
              </div>
            )}
            <div className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-xs">
              <Camera className="w-3 h-3" />
              <span>{property.photosCount}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
          <div className="flex flex-col flex-1">
            {/* Title: Cố định min-height 2 dòng để tiêu đề 1 dòng không bị lệch */}
            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug mb-2 min-h-[2.5rem] sm:min-h-[2.75rem]">
              {property.title}
            </h3>

            {/* Price & Specs Row */}
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-2 min-h-[1.75rem]">
              <span className="font-heading font-bold text-base text-rose-600 dark:text-rose-500 shrink-0">
                {formattedPrice}
              </span>

              {/* Category-Exclusive Quick Specs */}
              {renderCardSpecs(property)}
            </div>

            {/* Location: Cố định min-height 2 dòng cho địa chỉ */}
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground min-h-[2.25rem]">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
              <span className="leading-relaxed break-words line-clamp-2">{property.location}</span>
            </div>
          </div>

          {/* Landlord Footer & Actions: Ghim chân thẻ cố định đều nhau */}
          <div className="pt-3 border-t border-border flex items-center justify-between gap-2 mt-auto">
            {/* Landlord info */}
            <div className="flex items-center gap-2 min-w-0">
              <UserAvatar
                src={property.landlord.avatar}
                name={property.landlord.name}
                sizeClassName="w-6 h-6 text-[11px]"
              />
              <div className="text-xs min-w-0">
                <p className="font-semibold text-foreground truncate max-w-[100px] sm:max-w-[120px]">
                  {property.landlord.name}
                </p>
                <p className="text-[11px] text-primary font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {property.timeAgo}
                </p>
              </div>
            </div>

            {/* Action buttons (Lượt xem, Chat) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Lượt xem bài đăng (đặt bên trái nút chat) */}
              <div
                className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground font-medium select-none"
                title={`${property.viewCount ?? property.viewsCount ?? 0} lượt xem`}
              >
                <Eye className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span>{property.viewCount ?? property.viewsCount ?? 0}</span>
              </div>

              {/* Nút Chat nhanh */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = "/chat";
                }}
                title="Nhắn tin cho chủ nhà"
                className="w-7 h-7 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-primary flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function renderCardSpecs(property: RentPropertyItem) {
  const cat = property.category;
  const d = property.details ?? {};

  // 1. Phòng trọ / CHDV: KHÔNG CÓ PHÒNG NGỦ
  if (cat === "room") {
    const restroomText =
      d.restroomType === "PRIVATE"
        ? "WC khép kín"
        : d.restroomType === "SHARED"
        ? "WC chung"
        : property.baths > 0
        ? `${property.baths} WC`
        : "WC riêng";

    return (
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground font-medium">
        <span>{property.areaM2} m²</span>
        <span>·</span>
        <span>{restroomText}</span>
        {Boolean(d.hasMezzanine) && (
          <>
            <span>·</span>
            <span>Gác lửng</span>
          </>
        )}
        {Boolean(d.hasBalcony) && (
          <>
            <span>·</span>
            <span>Ban công</span>
          </>
        )}
        {Boolean(d.hasWindow) && !d.hasBalcony && (
          <>
            <span>·</span>
            <span>Cửa sổ</span>
          </>
        )}
      </div>
    );
  }

  // 2. Văn phòng
  if (cat === "office") {
    return (
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground font-medium">
        <span>{property.areaM2} m²</span>
        {d.expectedSeats != null && (
          <>
            <span>·</span>
            <span>{String(d.expectedSeats)} chỗ</span>
          </>
        )}
        {Boolean(d.officeGrade) && (
          <>
            <span>·</span>
            <span>Hạng {String(d.officeGrade).replace("GRADE_", "")}</span>
          </>
        )}
        <span>·</span>
        <span>{property.baths || 1} WC</span>
      </div>
    );
  }

  // 3. Mặt bằng kinh doanh
  if (cat === "commercial") {
    const positionLabel =
      d.positionType === "GROUND_FLOOR"
        ? "Trệt"
        : d.positionType === "SHOPPING_MALL"
        ? "TTTM"
        : d.positionType === "UPPER_FLOOR"
        ? "Lầu"
        : null;

    return (
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground font-medium">
        <span>{property.areaM2} m²</span>
        {d.frontageWidthM != null && (
          <>
            <span>·</span>
            <span>MT {String(d.frontageWidthM)}m</span>
          </>
        )}
        {Boolean(positionLabel) && (
          <>
            <span>·</span>
            <span>{positionLabel}</span>
          </>
        )}
        <span>·</span>
        <span>{property.baths || 1} WC</span>
      </div>
    );
  }

  // 4. Căn hộ & Nhà ở
  const floorText =
    cat === "house" && d.totalFloors
      ? `${d.totalFloors} tầng`
      : cat === "apartment" && d.floorNumber
      ? `Tầng ${d.floorNumber}`
      : property.floor || null;

  const bedText =
    cat === "apartment" && property.beds === 0 ? "Studio" : `${property.beds} PN`;

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground font-medium">
      <span>{property.areaM2} m²</span>
      <span>·</span>
      <span>{bedText}</span>
      <span>·</span>
      <span>{property.baths} WC</span>
      {floorText && (
        <>
          <span>·</span>
          <span>{floorText}</span>
        </>
      )}
      {cat === "house" && Boolean(d.hasRooftop) && (
        <>
          <span>·</span>
          <span>Sân thượng</span>
        </>
      )}
    </div>
  );
}
