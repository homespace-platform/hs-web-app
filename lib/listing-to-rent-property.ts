import type { RentMediaItem, RentPropertyItem } from "@/types/rent.type";
import { getSafeVideoStreamUrl } from "@/lib/video-stream-url";
import type {
  ListingDetailResponse,
  ListingMediaResponse,
  ListingResponse,
  PublicListingSummaryResponse,
} from "@/types/listing.type";

function isPublicListing(
  listing: ListingDetailResponse | ListingResponse | PublicListingSummaryResponse,
): listing is PublicListingSummaryResponse {
  return "priceUnit" in listing && "fullAddress" in listing;
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

    const imageUrls: string[] =
      Array.isArray(pub.imageUrls) && pub.imageUrls.length > 0
        ? pub.imageUrls
        : pub.coverImageUrl
        ? [pub.coverImageUrl]
        : [];
    const rawPrice = Number(pub.priceAmount ?? 0);
    const rawBeds =
      propertyCategory === "room" || propertyCategory === "office" || propertyCategory === "commercial"
        ? 0
        : pub.bedroomCount ?? 0;
    const rawBaths = pub.bathroomCount ?? 0;

    return {
      id: pub.id,
      ownerId: pub.ownerId || undefined,
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
      beds: rawBeds,
      baths: rawBaths,
      areaM2: Number(pub.areaM2 ?? 0),
      images: imageUrls,
      isVerified: true,
      hasVideo: pub.hasVideo ?? false,
      category: propertyCategory,
      categoryLabel: categoryLabelMap[propertyCategory] ?? "Nhà cho thuê",
      timeAgo: pub.publishedAt ? formatTimeAgo(pub.publishedAt) : "Mới đăng",
      photosCount: imageUrls.length,
      viewCount: pub.viewCount ?? (pub as any).viewsCount ?? 0,
      viewsCount: pub.viewCount ?? (pub as any).viewsCount ?? 0,
      details: {
        subtype: pub.subtype,
        currency: pub.currency,
        priceUnit: pub.priceUnit,
        negotiable: pub.negotiable,
        availableFrom: pub.availableFrom,
        floorNumber: pub.floorNumber,
        totalFloors: pub.totalFloors,
        restroomType: pub.restroomType,
        hasMezzanine: pub.hasMezzanine,
        hasBalcony: pub.hasBalcony,
        hasWindow: pub.hasWindow,
        hasRooftop: pub.hasRooftop,
        hasGarage: pub.hasGarage,
        expectedSeats: pub.expectedSeats,
        officeGrade: pub.officeGrade,
        frontageWidthM: pub.frontageWidthM,
        positionType: pub.positionType,
        furnishingStatus: pub.furnishingStatus,
        ownerListingCount: pub.ownerListingCount,
        rawPrice,
      },
      mediaItems: imageUrls.map((img) => ({ type: "image" as const, url: img })),
      landlord: {
        id: pub.ownerId || undefined,
        name: pub.ownerName || "Chủ nhà",
        role: "Chính chủ",
        listingsCount: pub.ownerListingCount ?? 1,
        avatar: pub.ownerAvatarUrl || undefined,
        phone: (pub as any).ownerPhone || (pub as any).phone || undefined,
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
  const imageUrls: string[] = mediaImages;

  const mediaVideos = detail?.media
    ? detail.media
        .filter((m: ListingMediaResponse) => m.mediaType === "VIDEO" && Boolean(m.url))
        .map((m: ListingMediaResponse) => ({
          id: m.id,
          url: m.url as string,
          streamUrl: getSafeVideoStreamUrl(m.url as string),
        }))
    : [];

  // Video luôn được đặt ở CUỐI CÙNG theo yêu cầu người dùng
  const mediaItems: RentMediaItem[] = [
    ...imageUrls.map((img) => ({ type: "image" as const, url: img })),
    ...mediaVideos.map((vid) => ({
      id: vid.id,
      type: "video" as const,
      url: vid.url,
      streamUrl: vid.streamUrl,
    })),
  ];

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
    mediaVideos.length > 0 ||
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
    videos: mediaVideos,
    mediaItems,
    isVerified: listing.status === "PUBLISHED",
    hasVideo,
    category: propertyCategory,
    categoryLabel,
    timeAgo: (listing as any).publishedAt
      ? formatTimeAgo((listing as any).publishedAt)
      : (listing as any).createdAt
      ? formatTimeAgo((listing as any).createdAt)
      : "Vừa xong",
    photosCount: imageUrls.length,
    viewCount: (listing as any).viewCount ?? (listing as any).viewsCount ?? 0,
    viewsCount: (listing as any).viewCount ?? (listing as any).viewsCount ?? 0,
    ownerId: (listing as any).ownerId,
    details,
    landlord: {
      id: (listing as any).ownerId || listing.owner?.id,
      name: listing.owner?.displayName ?? "Chủ nhà",
      role: "Chính chủ",
      listingsCount: (listing as any).ownerListingCount ?? 1,
      phone: listing.owner?.phone || undefined,
      avatar: listing.owner?.avatarUrl || undefined,
    },
  };
}

export function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 0) return "Vừa xong";
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return "Vừa xong";
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) return `${diffDays} ngày trước`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks} tuần trước`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} tháng trước`;
    return new Date(isoString).toLocaleDateString("vi-VN");
  } catch {
    return "Mới đăng";
  }
}
