import type { RentPropertyItem } from "@/types/rent.type";
import type {
  ListingDetailResponse,
  ListingMediaResponse,
  ListingResponse,
  PublicListingSummaryResponse,
} from "@/types/listing.type";

const API_PLACEHOLDER_IMAGE = "/area/hcm-1.jpg";

function isPublicListing(
  listing: ListingDetailResponse | ListingResponse | PublicListingSummaryResponse,
): listing is PublicListingSummaryResponse {
  return !("ownerId" in listing);
}

export function toRentProperty(
  listing: ListingDetailResponse | ListingResponse | PublicListingSummaryResponse,
): RentPropertyItem {
  // Check if it's PublicListingSummaryResponse
  if (isPublicListing(listing)) {
    const pub = listing as PublicListingSummaryResponse;
    const categoryMap: Record<string, "apartment" | "house" | "office" | "commercial" | "room"> = {
      APARTMENT: "apartment",
      HOUSE: "house",
      OFFICE: "office",
      COMMERCIAL_SPACE: "commercial",
      ROOM: "room",
    };
    const propertyCategory = categoryMap[pub.category] ?? "apartment";
    const categoryLabelMap = {
      apartment: "Căn hộ / Chung cư",
      house: "Nhà ở",
      office: "Văn phòng",
      commercial: "Mặt bằng kinh doanh",
      room: "Nhà trọ / Căn hộ dịch vụ",
    };

    const imageUrls = pub.coverImageUrl ? [pub.coverImageUrl] : [API_PLACEHOLDER_IMAGE];
    const rawPrice = Number(pub.priceAmount ?? 0);

    return {
      id: pub.id,
      title: pub.title,
      description: undefined,
      location: pub.fullAddress || [pub.wardName, pub.provinceName].filter(Boolean).join(", "),
      district: pub.wardName || "",
      ward: pub.wardName || "",
      provinceCode: pub.provinceCode || undefined,
      provinceName: pub.provinceName || undefined,
      wardCode: pub.wardCode || undefined,
      city: pub.provinceName || "",
      priceMillion: rawPrice / 1_000_000,
      beds: pub.bedroomCount ?? 0,
      baths: 0,
      areaM2: Number(pub.areaM2 ?? 0),
      images: imageUrls,
      isVerified: true,
      hasVideo: pub.hasVideo ?? false,
      category: propertyCategory,
      categoryLabel: categoryLabelMap[propertyCategory] ?? "Nhà cho thuê",
      timeAgo: pub.publishedAt ? formatTimeAgo(pub.publishedAt) : "Mới đăng",
      photosCount: imageUrls.length,
      details: {
        subtype: pub.subtype,
        currency: pub.currency,
        priceUnit: pub.priceUnit,
        negotiable: pub.negotiable,
        availableFrom: pub.availableFrom,
      },
      landlord: {
        name: "Chính chủ",
        role: "Chủ nhà",
        listingsCount: 1,
      },
    };
  }

  const isDetail = "pricing" in listing;
  const detail = isDetail ? (listing as ListingDetailResponse) : null;
  const summary = !isDetail ? (listing as ListingResponse) : null;

  const details: Record<string, unknown> = {
    ...(summary?.details ?? {}),
    ...(detail?.apartmentDetail ?? {}),
    ...(detail?.houseDetail ?? {}),
    ...(detail?.officeDetail ?? {}),
    ...(detail?.commercialDetail ?? {}),
    ...(detail?.roomDetail ?? {}),
    subtype: detail?.subtype ?? (listing as any).subtype,
    pricing: detail?.pricing,
    charges: detail?.charges ?? [],
    amenities: (detail?.amenities ?? []).map((a: any) => a.name || a.code),
    customAmenities: detail?.customAmenities ?? [],
    furnishings: (detail?.furnishings ?? []).map((f: any) => f.name || f.code),
    viewingDays: detail?.viewingDays ?? [],
    viewingSlots: detail?.viewingSlots ?? [],
    availableFrom: detail?.availableFrom,
    rentalMode: detail?.rentalMode,
    depositAmount: detail?.pricing?.depositAmount ?? summary?.depositAmount,
  };

  const address = listing.address;
  const provinceName = address?.provinceName ?? "";
  const wardName = address?.wardName ?? "";
  const streetLine = address?.streetLine ?? "";
  const categoryMap: Record<string, "apartment" | "house" | "room" | "studio" | "commercial" | "office"> = {
    APARTMENT: "apartment",
    HOUSE: "house",
    ROOM: "room",
    STUDIO: "apartment",
    OFFICE: "office",
    COMMERCIAL: "commercial",
    COMMERCIAL_SPACE: "commercial",
  };
  const propertyCategory = categoryMap[listing.category] ?? "room";
  const categoryLabel = {
    apartment: "Căn hộ / Chung cư",
    house: "Nhà ở",
    commercial: "Mặt bằng kinh doanh",
    office: "Văn phòng",
    studio: "Căn hộ Studio",
    room: "Nhà trọ / Căn hộ dịch vụ",
    villa: "Biệt thự",
  }[propertyCategory];

  const mediaImages: string[] = detail?.media
    ? detail.media
        .filter((m: ListingMediaResponse) => m.mediaType === "IMAGE" && Boolean(m.url))
        .map((m: ListingMediaResponse) => m.url as string)
    : [];
  const imageUrls: string[] = mediaImages.length > 0 ? mediaImages : [API_PLACEHOLDER_IMAGE];

  const rawPrice =
    detail?.pricing?.amount != null
      ? Number(detail.pricing.amount)
      : summary?.priceAmount != null
      ? Number(summary.priceAmount)
      : Number(summary?.priceMonthly ?? 0);

  const rawBeds =
    detail?.apartmentDetail?.bedroomCount ??
    detail?.houseDetail?.bedroomCount ??
    summary?.bedrooms ??
    0;

  const rawBaths =
    detail?.apartmentDetail?.bathroomCount ??
    detail?.houseDetail?.bathroomCount ??
    detail?.officeDetail?.restroomCount ??
    detail?.commercialDetail?.restroomCount ??
    summary?.bathrooms ??
    0;

  const hasVideo =
    (summary?.videoUrls?.length ?? 0) > 0 ||
    Boolean(detail?.media?.some((m: ListingMediaResponse) => m.mediaType === "VIDEO"));

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description ?? undefined,
    location: address?.fullAddress ?? [streetLine, wardName, provinceName].filter(Boolean).join(", "),
    district: wardName,
    ward: wardName,
    provinceCode: address?.provinceCode,
    provinceName,
    wardCode: address?.wardCode,
    city: provinceName,
    priceMillion: rawPrice / 1_000_000,
    beds: rawBeds,
    baths: rawBaths,
    areaM2: Number(listing.areaM2 ?? 0),
    images: imageUrls,
    isVerified: listing.status === "PUBLISHED",
    hasVideo,
    category: propertyCategory,
    categoryLabel,
    timeAgo: "Từ API",
    photosCount: imageUrls.length,
    details,
    landlord: {
      name: listing.owner?.displayName ?? "Chủ nhà",
      role: "Chính chủ",
      listingsCount: 1,
      phone: listing.owner?.phone || undefined,
      avatar: listing.owner?.avatarUrl || undefined,
    },
  };
}

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Vừa xong";
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 30) return `${diffDays} ngày trước`;
    return new Date(isoString).toLocaleDateString("vi-VN");
  } catch {
    return "Mới đăng";
  }
}
