import type { RentPropertyItem } from "@/data/mock-rent-data";
import type { ListingResponse } from "@/types/listing.type";

const API_PLACEHOLDER_IMAGE = "/area/hcm-1.jpg";

export function toRentProperty(listing: ListingResponse): RentPropertyItem {
  const details = {
    ...(listing.details ?? {}),
    ...(listing.depositAmount != null ? { depositAmount: listing.depositAmount } : {}),
  };
  const provinceName = readDetail(details, "provinceName", listing.provinceCode ?? "");
  const wardName = readDetail(details, "wardName", listing.wardCode ?? "");
  const category = {
    APARTMENT: "apartment",
    HOUSE: "house",
    ROOM: "room",
    STUDIO: "studio",
    COMMERCIAL: "commercial",
  } as const;
  const propertyCategory = category[listing.category] ?? "room";
  const categoryLabel = {
    apartment: "Căn hộ / Chung cư",
    house: "Nhà ở",
    commercial: "Mặt bằng kinh doanh",
    studio: "Văn phòng / Studio",
    room: "Nhà trọ",
  }[propertyCategory];

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description ?? undefined,
    location: [listing.address, wardName, provinceName].filter(Boolean).join(", "),
    district: wardName,
    ward: wardName,
    provinceCode: listing.provinceCode,
    provinceName,
    wardCode: listing.wardCode,
    city: provinceName,
    priceMillion: Number(listing.priceMonthly ?? 0) / 1_000_000,
    beds: listing.bedrooms ?? 0,
    baths: listing.bathrooms ?? 0,
    areaM2: Number(listing.areaM2 ?? 0),
    images: [API_PLACEHOLDER_IMAGE],
    isVerified: listing.status === "PUBLISHED",
    hasVideo: false,
    category: propertyCategory,
    categoryLabel,
    timeAgo: "Từ API",
    photosCount: listing.images?.length ?? 0,
    details,
    landlord: {
      name: readDetail(details, "landlordName", "Chủ nhà"),
      role: "Chính chủ",
      listingsCount: 1,
      phone: readDetail(details, "phone", "") || undefined,
    },
  };
}

function readDetail(details: Record<string, unknown>, key: string, fallback: string) {
  return typeof details[key] === "string" ? details[key] : fallback;
}
