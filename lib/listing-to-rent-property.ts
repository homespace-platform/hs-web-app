import type { RentPropertyItem } from "@/data/mock-rent-data";
import type { ListingResponse } from "@/types/listing.type";
import { getListingDisplayImages } from "@/lib/listing-images";

const API_PLACEHOLDER_IMAGE = "/area/hcm-1.jpg";

export function toRentProperty(listing: ListingResponse): RentPropertyItem {
  const details = {
    ...(listing.details ?? {}),
    ...(listing.depositAmount != null ? { depositAmount: listing.depositAmount } : {}),
  };
  const address = listing.address;
  const provinceName = address?.provinceName ?? "";
  const wardName = address?.wardName ?? "";
  const streetLine = address?.streetLine ?? "";
  const category: Record<string, "apartment" | "house" | "room" | "studio" | "commercial"> = {
    APARTMENT: "apartment",
    HOUSE: "house",
    ROOM: "room",
    STUDIO: "studio",
    OFFICE: "studio",
    COMMERCIAL: "commercial",
    COMMERCIAL_SPACE: "commercial",
  };
  const propertyCategory = category[listing.category] ?? "room";
  const categoryLabel = {
    apartment: "Căn hộ / Chung cư",
    house: "Nhà ở",
    commercial: "Mặt bằng kinh doanh",
    studio: "Văn phòng / Studio",
    room: "Nhà trọ",
  }[propertyCategory];
  const imageUrls = getListingDisplayImages(listing, API_PLACEHOLDER_IMAGE);

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
    priceMillion: Number(listing.priceMonthly ?? 0) / 1_000_000,
    beds: listing.bedrooms ?? 0,
    baths: listing.bathrooms ?? 0,
    areaM2: Number(listing.areaM2 ?? 0),
    images: imageUrls,
    isVerified: listing.status === "PUBLISHED",
    hasVideo: (listing.videoUrls?.length ?? 0) > 0,
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
