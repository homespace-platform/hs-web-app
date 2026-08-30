export type ListingCategory =
  | "APARTMENT"
  | "HOUSE"
  | "OFFICE"
  | "COMMERCIAL_SPACE"
  | "COMMERCIAL"
  | "STUDIO"
  | "ROOM";

export type ListingSubtype =
  | "APARTMENT_STANDARD"
  | "APARTMENT_STUDIO"
  | "APARTMENT_DUPLEX"
  | "APARTMENT_PENTHOUSE"
  | "APARTMENT_OFFICETEL"
  | "APARTMENT_OTHER"
  | "HOUSE_TOWNHOUSE"
  | "HOUSE_ALLEY"
  | "HOUSE_VILLA"
  | "HOUSE_GRADE_4"
  | "HOUSE_OTHER"
  | "OFFICE_TRADITIONAL"
  | "OFFICE_SERVICED"
  | "OFFICE_COWORKING"
  | "OFFICE_SHARED"
  | "OFFICE_OTHER"
  | "COMMERCIAL_STORE"
  | "COMMERCIAL_KIOSK"
  | "COMMERCIAL_SHOWROOM"
  | "COMMERCIAL_SHOPHOUSE"
  | "COMMERCIAL_MALL"
  | "COMMERCIAL_OTHER"
  | "ROOM_BOARDING"
  | "ROOM_IN_HOUSE"
  | "ROOM_SERVICED_APARTMENT"
  | "ROOM_DORMITORY"
  | "ROOM_OTHER";

export type RentalMode = "WHOLE_UNIT" | "PARTIAL";

export type FurnishingStatus =
  | "UNFURNISHED"
  | "BASIC"
  | "PARTIALLY_FURNISHED"
  | "FULLY_FURNISHED";

export type PriceUnit =
  | "MONTH"
  | "M2_MONTH"
  | "ROOM_MONTH"
  | "PERSON_MONTH"
  | "SEAT_MONTH";

export type DepositType = "NONE" | "FIXED_AMOUNT" | "MONTH_COUNT" | "NEGOTIABLE";

export type PaymentCycle =
  | "MONTHLY"
  | "EVERY_2_MONTHS"
  | "QUARTERLY"
  | "EVERY_6_MONTHS"
  | "NEGOTIABLE";

export type ListingMediaType = "IMAGE" | "VIDEO";

export type ChargeType =
  | "ELECTRICITY"
  | "WATER"
  | "MANAGEMENT"
  | "INTERNET"
  | "SERVICE_OR_GARBAGE"
  | "MOTORBIKE_PARKING"
  | "CAR_PARKING"
  | "OVERTIME_AIR_CONDITIONING"
  | "OTHER";

export type BillingMethod =
  | "PER_KWH"
  | "STATE_WATER_RATE"
  | "PER_M3"
  | "PER_PERSON_MONTH"
  | "PER_MONTH"
  | "PER_M2_MONTH"
  | "PER_VEHICLE_MONTH"
  | "PER_HOUR"
  | "FREE"
  | "INCLUDED"
  | "NOT_APPLICABLE"
  | "NEGOTIABLE"
  | "CUSTOM";

export type PositionType =
  | "GROUND_FLOOR"
  | "UPPER_FLOOR"
  | "SHOPPING_MALL"
  | "OTHER";

export type ParkingType = "NONE" | "MOTORBIKE" | "CAR" | "MOTORBIKE_AND_CAR";

export type RestroomType = "PRIVATE" | "SHARED";

export type KitchenType = "PRIVATE" | "SHARED" | "NONE";

export type AccessType = "PRIVATE" | "SHARED";

export type AccessHoursType = "FLEXIBLE" | "CURFEW";

export type MeterType = "PRIVATE" | "SHARED";

export type ParkingPolicy = "NONE" | "FREE" | "PAID";

export type OperatingMode = "ALWAYS_OPEN" | "CUSTOM_SCHEDULE";

export type OfficeOperatingHourRequest = {
  dayOfWeek:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
  openTime: string; // "HH:mm"
  closeTime: string; // "HH:mm"
};

export type ApartmentDetailRequest = {
  projectName: string;
  buildingBlock?: string | null;
  unitCode?: string | null;
  floorNumber: number;
  buildingTotalFloors?: number | null;
  bedroomCount: number;
  bathroomCount: number;
  livingRoomCount?: number | null;
  kitchenCount?: number | null;
  furnishingStatus: FurnishingStatus;
  mainDoorDirection?: string | null;
  balconyDirection?: string | null;
  viewDescription?: string | null;
  maxOccupants?: number | null;
  legalStatus?: string | null;
};

export type HouseDetailRequest = {
  landAreaM2?: number | null;
  frontageWidthM?: number | null;
  lengthM?: number | null;
  accessRoadWidthM?: number | null;
  frontageCount?: number | null;
  totalFloors: number;
  bedroomCount: number;
  bathroomCount: number;
  livingRoomCount?: number | null;
  kitchenCount?: number | null;
  hasRooftop?: boolean | null;
  hasGarage?: boolean | null;
  accessType?: string | null;
  maxOccupants?: number | null;
  maxVehicles?: number | null;
  furnishingStatus: FurnishingStatus;
  legalStatus?: string | null;
  rentalScopeDescription?: string | null;
  rentedFloorFrom?: number | null;
  rentedFloorTo?: number | null;
};

export type OfficeDetailRequest = {
  buildingName?: string | null;
  officeGrade?: string | null;
  floorNumber: number;
  handoverStatus: string;
  expectedSeats?: number | null;
  minimumDivisibleAreaM2?: number | null;
  restroomCount?: number | null;
  restroomType?: string | null;
  pantryType?: string | null;
  carParkingCapacity?: number | null;
  motorbikeParkingCapacity?: number | null;
  operatingMode?: OperatingMode | null;
  operatingHours?: OfficeOperatingHourRequest[] | null;
};

export type CommercialDetailRequest = {
  positionType: PositionType;
  frontageWidthM?: number | null;
  lengthM?: number | null;
  roadWidthM?: number | null;
  frontageCount?: number | null;
  rentedFloorCount?: number | null;
  hasMezzanine?: boolean | null;
  restroomCount?: number | null;
  accessType?: string | null;
  parkingType?: ParkingType | null;
  handoverStatus: string;
  hasThreePhasePower?: boolean | null;
  hasStandardFireSafety?: boolean | null;
  operatingHoursDescription?: string | null;
  restrictedBusinesses?: string | null;
  loadingAreaDescription?: string | null;
};

export type RoomDetailRequest = {
  roomCode?: string | null;
  floorNumber?: number | null;
  restroomType: RestroomType;
  kitchenType?: KitchenType | null;
  hasWindow?: boolean | null;
  hasBalcony?: boolean | null;
  hasMezzanine?: boolean | null;
  furnishingStatus: FurnishingStatus;
  accessType?: AccessType | null;
  accessHoursType?: AccessHoursType | null;
  electricMeterType?: MeterType | null;
  waterMeterType?: MeterType | null;
  maxOccupants: number;
  maxVehicles?: number | null;
  parkingPolicy?: ParkingPolicy | null;
};

export type ListingPricingRequest = {
  amount: number;
  currency?: string;
  unit: PriceUnit;
  negotiable: boolean;
  depositType: DepositType;
  depositAmount?: number | null;
  depositMonths?: number | null;
  paymentCycle: PaymentCycle;
  minimumLeaseMonths: number;
  managementFeeIncluded: boolean;
  vatIncluded?: boolean | null;
};

export type ListingChargeRequest = {
  chargeType: ChargeType;
  billingMethod: BillingMethod;
  amount?: number | null;
  currency?: string;
  unit?: string;
  includedInRent: boolean;
  customName?: string;
  description?: string;
  sortOrder: number;
};

export type ListingAddressRequest = {
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  streetLine: string;
  fullAddress?: string;
};

export type ListingAddressSourceRequest = {
  type: "SAVED" | "NEW";
  savedAddressId?: string | null;
  address?: ListingAddressRequest | null;
};

export type ListingMediaRequest = {
  storageObjectId: string;
  mediaType: ListingMediaType;
  sortOrder: number;
  cover: boolean;
};

export type CreateListingRequest = {
  id?: string | null;
  title: string;
  description: string;
  category: ListingCategory;
  subtype: ListingSubtype;
  rentalMode: RentalMode;
  availableFrom: string; // "YYYY-MM-DD"
  areaM2: number;
  pricing: ListingPricingRequest;
  apartmentDetail?: ApartmentDetailRequest | null;
  houseDetail?: HouseDetailRequest | null;
  officeDetail?: OfficeDetailRequest | null;
  commercialDetail?: CommercialDetailRequest | null;
  roomDetail?: RoomDetailRequest | null;
  amenityCodes?: string[];
  customAmenities?: string[];
  furnishingCodes?: string[];
  charges?: ListingChargeRequest[];
  addressSource: ListingAddressSourceRequest;
  media: ListingMediaRequest[];
  viewingDays?: string[];
  viewingSlots?: string[];
};

export type CreateListingResponse = {
  id: string;
  status: "DRAFT" | "PUBLISHED" | "RENTED" | "ARCHIVED";
  title: string;
  publishedAt: string;
};

export type MyListingSummaryResponse = {
  id: string;
  title: string;
  category: ListingCategory;
  subtype: ListingSubtype;
  status: "DRAFT" | "PUBLISHED" | "RENTED" | "ARCHIVED";
  availableFrom: string;
  areaM2: number;
  priceAmount: number;
  currency: string;
  priceUnit: PriceUnit;
  negotiable: boolean;
  coverImageUrl?: string | null;
  coverStorageObjectId?: string | null;
  mediaCount: number;
  fullAddress: string;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ListingOptionItemResponse = {
  code: string;
  name: string;
  icon?: string | null;
};

export type ListingMediaResponse = {
  id: string;
  storageObjectId: string;
  mediaType: ListingMediaType;
  sortOrder: number;
  cover: boolean;
  url: string;
  contentType: string;
  sizeBytes: number;
};

export type ListingAddressResponse = {
  id?: string;
  listingId?: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  streetLine: string;
  fullAddress?: string;
};

export type ListingDetailResponse = {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  category: ListingCategory;
  subtype: ListingSubtype;
  rentalMode: RentalMode;
  status: "DRAFT" | "PUBLISHED" | "RENTED" | "ARCHIVED";
  availableFrom: string;
  areaM2: number;
  pricing: ListingPricingRequest;
  apartmentDetail?: ApartmentDetailRequest | null;
  houseDetail?: HouseDetailRequest | null;
  officeDetail?: OfficeDetailRequest | null;
  commercialDetail?: CommercialDetailRequest | null;
  roomDetail?: RoomDetailRequest | null;
  amenities: ListingOptionItemResponse[];
  customAmenities: string[];
  furnishings: ListingOptionItemResponse[];
  charges: ListingChargeRequest[];
  address?: ListingAddressResponse | null;
  owner?: ListingOwner | null;
  media: ListingMediaResponse[];
  imageUrls?: string[];
  viewingDays?: string[];
  viewingSlots?: string[];
  active: boolean;
  publishedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type ListingOptionItem = {
  code: string;
  name: string;
  sortOrder: number;
};

export type ListingOptionsResponse = {
  category: Exclude<ListingCategory, "COMMERCIAL" | "STUDIO">;
  amenities: ListingOptionItem[];
  furnishings: ListingOptionItem[];
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

export type ListingResponse = CreateListingResponse & {
  ownerId: string;
  owner?: ListingOwner | null;
  category: ListingCategory;
  areaM2: number;
  priceAmount: number;
  description?: string;
  priceMonthly?: number;
  depositAmount?: number;
  bedrooms?: number;
  bathrooms?: number;
  address?: ListingAddressRequest;
  details?: Record<string, unknown>;
  imageUrls?: string[];
  videoUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
};
