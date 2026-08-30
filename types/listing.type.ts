export type ListingCategory = "APARTMENT" | "HOUSE" | "ROOM" | "STUDIO" | "COMMERCIAL";

export type ListingMediaType = "IMAGE" | "VIDEO";

export type ListingAddress = {
  id?: string;
  listingId?: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  streetLine: string;
  fullAddress?: string;
};

export type CreateListingRequest = {
  title: string;
  description?: string;
  category: ListingCategory;
  priceMonthly?: number;
  depositAmount?: number;
  areaM2?: number;
  bedrooms?: number;
  bathrooms?: number;
  address: ListingAddress;
  details?: Record<string, unknown>;
  imageUrls?: string[];
  videoUrls?: string[];
};

export type CreateListingMediaUploadRequest = {
  fileName: string;
  contentType: string;
  size: number;
  mediaType: ListingMediaType;
};

export type CreateListingMediaUploadResponse = {
  uploadUrl: string;
  method: "PUT";
  objectKey: string;
  publicUrl: string;
  expiresAt: string;
};

export type CompleteListingMediaUploadRequest = {
  objectKey: string;
};

export type CompleteListingMediaUploadResponse = {
  objectKey: string;
  publicUrl: string;
  contentType: string;
  sizeBytes: number;
};

export type ListingOwner = {
  id: string;
  displayName: string;
  phone?: string;
  avatarUrl?: string;
};

export type ListingResponse = CreateListingRequest & {
  id: string;
  ownerId: string;
  owner?: ListingOwner | null;
  status: "DRAFT" | "PUBLISHED" | "RENTED" | "ARCHIVED";
  imageUrls: string[];
  videoUrls: string[];
  createdAt: string;
  updatedAt: string;
};
