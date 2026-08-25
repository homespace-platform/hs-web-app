import { MOCK_RENT_PROPERTIES, type RentPropertyItem } from "@/data/mock-rent-data";

const STORAGE_KEY = "homespace_mock_rent_properties";
export const MOCK_RENT_LISTINGS_UPDATED = "homespace:mock-rent-listings-updated";

type MockListingInput = Pick<
  RentPropertyItem,
  | "title"
  | "category"
  | "priceMillion"
  | "beds"
  | "baths"
  | "areaM2"
  | "description"
> & {
  address: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  imageUrls?: string[];
  landlordName?: string;
  phone?: string;
};

const DEFAULT_IMAGE: Record<MockListingInput["category"], string> = {
  apartment: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
  house: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  office: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
  commercial: "https://images.unsplash.com/photo-1559599101-f09722fb4948?auto=format&fit=crop&w=800&q=80",
  studio: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80",
  room: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
  villa: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
};

const CATEGORY_LABEL: Record<MockListingInput["category"], string> = {
  apartment: "Chung cư",
  house: "Nhà ở",
  office: "Văn phòng",
  commercial: "Mặt bằng / Shophouse",
  studio: "Studio",
  room: "Phòng trọ",
  villa: "Biệt thự / Villa",
};

function readCreatedListings(): RentPropertyItem[] {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function getMockRentListings() {
  return [...readCreatedListings(), ...MOCK_RENT_PROPERTIES];
}

export function addMockRentListing(input: MockListingInput) {
  const city = "TP. Hồ Chí Minh";
  const images = input.imageUrls?.filter(Boolean) ?? [];
  const property: RentPropertyItem = {
    id: `mock-${crypto.randomUUID()}`,
    title: input.title.trim(),
    location: [input.address, input.wardName, input.provinceName]
      .filter(Boolean)
      .join(", "),
    district: input.wardName.trim(),
    ward: input.wardName.trim(),
    provinceCode: input.provinceCode,
    provinceName: input.provinceName,
    wardCode: input.wardCode,
    city: input.provinceName || city,
    priceMillion: input.priceMillion,
    beds: input.beds,
    baths: input.baths,
    areaM2: input.areaM2,
    images: images.length ? images : [DEFAULT_IMAGE[input.category]],
    isVerified: false,
    hasVideo: false,
    category: input.category,
    categoryLabel: CATEGORY_LABEL[input.category],
    timeAgo: "Vừa đăng",
    photosCount: images.length || 1,
    description: input.description?.trim() || undefined,
    landlord: {
      name: input.landlordName?.trim() || "Bạn",
      role: "Chính chủ",
      listingsCount: 1,
      phone: input.phone?.trim() || undefined,
    },
  };

  const created = [property, ...readCreatedListings()];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
  window.dispatchEvent(new Event(MOCK_RENT_LISTINGS_UPDATED));
  return property;
}
