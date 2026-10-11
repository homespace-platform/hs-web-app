"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight, ImageOff, MapPin } from "lucide-react";
import type { ListingDetailResponse } from "@/types/listing.type";

const CATEGORY_LABELS: Record<string, string> = {
  ROOM: "Phòng trọ", HOUSE: "Nhà nguyên căn", APARTMENT: "Chung cư",
  OFFICE: "Văn phòng", COMMERCIAL_SPACE: "Mặt bằng",
};
const PRICE_UNITS: Record<string, string> = {
  MONTH: "tháng", ROOM_MONTH: "phòng/tháng", PERSON_MONTH: "người/tháng",
  M2_MONTH: "m²/tháng", SEAT_MONTH: "chỗ/tháng",
};

function formatPrice(listing: ListingDetailResponse): string {
  const pricing = listing.pricing;
  if (pricing?.amount == null || !Number.isFinite(Number(pricing.amount))) return "Chưa rõ giá thuê";
  const currency = pricing.currency === "VND" ? "đ" : pricing.currency || "";
  const unit = PRICE_UNITS[pricing.unit] || "chưa rõ đơn vị";
  return `${Number(pricing.amount).toLocaleString("vi-VN")} ${currency}/${unit}`;
}

export default function AiListingCompactCard({ listing, position }: {
  listing: ListingDetailResponse;
  position: number;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const cover = [...(listing.media || [])]
    .filter((item) => item.mediaType === "IMAGE" && item.url && /^(https?:\/\/|\/(?!\/))/.test(item.url))
    .sort((a, b) => Number(Boolean(b.cover)) - Number(Boolean(a.cover)) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))[0];
  const coverUrl = cover?.url;
  const detail = listing.category === "ROOM" ? listing.roomDetail
    : listing.category === "HOUSE" ? listing.houseDetail : listing.apartmentDetail;
  const occupants = detail?.maxOccupants;
  const bedrooms = listing.category === "HOUSE" ? listing.houseDetail?.bedroomCount
    : listing.category === "APARTMENT" ? listing.apartmentDetail?.bedroomCount : undefined;
  const facts: string[] = [];
  if (listing.areaM2 != null && Number.isFinite(Number(listing.areaM2)) && Number(listing.areaM2) > 0) {
    facts.push(`${Number(listing.areaM2).toLocaleString("vi-VN")} m²`);
  }
  if (bedrooms != null && bedrooms > 0) facts.push(`${bedrooms} phòng ngủ`);
  else if (listing.category === "APARTMENT" && bedrooms === 0) facts.push("Không phòng ngủ riêng");
  if (occupants != null && occupants > 0) facts.push(`Tối đa ${occupants} người`);
  const location = [listing.address?.wardName, listing.address?.provinceName].filter(Boolean).join(", ");

  return (
    <Link href={`/rent/${listing.id}`} target="_blank" rel="noopener noreferrer" prefetch={false}
      title={`${listing.title} — Mở chi tiết trong tab mới`}
      className="group flex min-w-0 items-start gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-28">
        {coverUrl && failedImage !== coverUrl
          ? <Image src={coverUrl} alt="" fill sizes="(max-width: 640px) 80px, 112px" unoptimized loading="lazy"
              className="object-cover" onError={() => setFailedImage(coverUrl)} />
          : <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground" role="img" aria-label="Chưa có ảnh bìa">
              <ImageOff className="size-5 opacity-60" aria-hidden="true" />
              <span className="text-[10px]">Chưa có ảnh</span>
            </div>}
        <span className="absolute left-1 top-1 flex size-6 items-center justify-center rounded-md bg-background/95 text-[11px] font-bold text-primary shadow-xs" aria-label={`Tin ${position}`}>
          {position}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="min-w-0 flex-1 line-clamp-2 text-xs font-semibold leading-5 text-foreground group-hover:text-primary sm:text-sm">
            {listing.title}
          </h3>
          <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
        </div>
        <p className="mt-1 text-sm font-bold leading-5 text-primary">{formatPrice(listing)}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">
          <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">{CATEGORY_LABELS[listing.category] || "Tin cho thuê"}</span>
          {facts.map((fact) => <span key={fact}>{fact}</span>)}
        </div>
        {location && <p className="mt-1.5 flex items-start gap-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">
          <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
          <span className="line-clamp-1" title={location}>{location}</span>
        </p>}
      </div>
    </Link>
  );
}
