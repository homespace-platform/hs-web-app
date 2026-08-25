export type ListingCategory = "ROOM" | "STUDIO" | "COMMERCIAL";

export type CreateListingRequest = {
  title: string;
  description?: string;
  category: ListingCategory;
  priceMonthly?: number;
  areaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  provinceCode?: string;
  wardCode?: string;
  address?: string;
  details?: Record<string, unknown>;
};

export type ListingImage = {
  id: string;
  storageId: string;
  sortOrder: number;
  cover: boolean;
};

export type ListingResponse = CreateListingRequest & {
  id: string;
  ownerId: string;
  status: "DRAFT" | "PUBLISHED" | "RENTED" | "ARCHIVED";
  images: ListingImage[];
  createdAt: string;
  updatedAt: string;
};
