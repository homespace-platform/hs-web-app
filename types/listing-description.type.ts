/**
 * Platform-neutral contract of POST /api/listing-description (web and mobile).
 * Enum codes are the same as in the create-listing payload. Numbers may be sent as numbers or numeric strings.
 * Never send phone numbers or other personal data.
 */
type Num = number | string | null;
type PrivateOrShared = "PRIVATE" | "SHARED";
type Direction = "EAST" | "WEST" | "SOUTH" | "NORTH" | "SOUTH_EAST" | "NORTH_EAST" | "SOUTH_WEST" | "NORTH_WEST";

export interface ListingDescriptionRequest {
  category: "ROOM" | "APARTMENT" | "HOUSE";
  areaM2: Num;
  price: Num;
  priceUnit: "MONTH" | "ROOM_MONTH" | "PERSON_MONTH" | "M2_MONTH";
  negotiable?: boolean | null;
  depositType: "NONE" | "FIXED_AMOUNT" | "MONTH_COUNT";
  depositAmount?: Num;
  depositMonths?: Num;
  minimumLeaseMonths: Num;
  availableFrom?: string | null;
  street?: string | null;
  ward?: string | null;
  city?: string | null;
  furnishingStatus: "UNFURNISHED" | "BASIC" | "PARTIALLY_FURNISHED" | "FULLY_FURNISHED" | "LUXURY";
  furnishings?: { name: string; quantity?: Num }[] | null;
  /** Display names, not catalog codes. */
  amenities?: string[] | null;
  charges?: { type: string; method: string; amount?: Num; includedInRent?: boolean | null; name?: string | null }[] | null;
  maxOccupants?: Num;
  maxVehicles?: Num;
  /** APARTMENT: building floors. HOUSE: floors of the house (required). */
  totalFloors?: Num;
  /** APARTMENT: floor of the unit (required). ROOM: floor of the room. */
  floorNumber?: Num;
  bedrooms?: Num;
  bathrooms?: Num;
  livingRooms?: Num;
  kitchens?: Num;
  // APARTMENT
  projectName?: string | null;
  buildingBlock?: string | null;
  doorDirection?: Direction | null;
  balconyDirection?: Direction | null;
  view?: string | null;
  // HOUSE
  landAreaM2?: Num;
  frontageWidthM?: Num;
  lengthM?: Num;
  roadWidthM?: Num;
  frontageCount?: Num;
  hasRooftop?: boolean | null;
  hasGarage?: boolean | null;
  /** HOUSE and ROOM. */
  accessType?: PrivateOrShared | null;
  // ROOM
  roomCode?: string | null;
  restroomType?: PrivateOrShared | null;
  kitchenType?: PrivateOrShared | "NONE" | null;
  hasWindow?: boolean | null;
  balconyType?: PrivateOrShared | "NONE" | null;
  hasMezzanine?: boolean | null;
  accessHoursType?: "FLEXIBLE" | "CURFEW" | null;
  electricMeterType?: PrivateOrShared | null;
  waterMeterType?: PrivateOrShared | null;
  parkingPolicy?: "FREE" | "PAID" | "NONE" | null;
  previousTemplateId?: string | null;
}

export interface ListingDescriptionResponse {
  description: string;
  templateId: string;
}
