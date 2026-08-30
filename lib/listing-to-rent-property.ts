import type { RentPropertyItem } from "@/data/mock-rent-data";
import type { ListingDetailResponse, ListingMediaResponse, ListingResponse } from "@/types/listing.type";
import { getListingDisplayImages } from "@/lib/listing-images";

const API_PLACEHOLDER_IMAGE = "/area/hcm-1.jpg";

export function toRentProperty(listing: ListingDetailResponse | ListingResponse): RentPropertyItem {
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
    ...(summary?.depositAmount != null ? { depositAmount: summary.depositAmount } : {}),
  };

  const address = listing.address;
  const provinceName = address?.provinceName ?? "";
  const wardName = address?.wardName ?? "";
  const streetLine = address?.streetLine ?? "";
  const categoryMap: Record<string, "apartment" | "house" | "room" | "studio" | "commercial"> = {
    APARTMENT: "apartment",
    HOUSE: "house",
    ROOM: "room",
    STUDIO: "studio",
    OFFICE: "studio",
    COMMERCIAL: "commercial",
    COMMERCIAL_SPACE: "commercial",
  };
  const propertyCategory = categoryMap[listing.category] ?? "room";
  const categoryLabel = {
    apartment: "Căn hộ / Chung cư",
    house: "Nhà ở",
    commercial: "Mặt bằng kinh doanh",
    studio: "Văn phòng / Studio",
    room: "Nhà trọ",
  }[propertyCategory];

  const mediaImages = detail?.media
    ? detail.media
        .filter((m: ListingMediaResponse) => m.mediaType === "IMAGE" && m.url)
        .map((m: ListingMediaResponse) => m.url)
    : [];
  const imageUrls = mediaImages.length > 0 ? mediaImages : getListingDisplayImages(listing, API_PLACEHOLDER_IMAGE);

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
