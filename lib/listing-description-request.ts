import type { CreateListingRequest } from "@/types/listing.type";
import type { ListingDescriptionRequest, ListingDescriptionResponse } from "@/types/listing-description.type";

type Address = { street?: string | null; ward?: string | null; city?: string | null } | null | undefined;
type Facts = ListingDescriptionRequest;

/** Web adapter: create-listing payload (what will be published) -> flat facts. Title, media and address note stay out. */
export function toDescriptionRequest(
  payload: CreateListingRequest,
  address: Address,
  amenityLabels: Record<string, string>,
): ListingDescriptionRequest {
  const { pricing, apartmentDetail: apartment, houseDetail: house, roomDetail: room } = payload;
  return {
    category: payload.category as Facts["category"],
    areaM2: payload.areaM2,
    price: pricing.amount,
    priceUnit: pricing.unit as Facts["priceUnit"],
    negotiable: pricing.negotiable,
    depositType: pricing.depositType as Facts["depositType"],
    depositAmount: pricing.depositAmount,
    depositMonths: pricing.depositMonths,
    minimumLeaseMonths: pricing.minimumLeaseMonths,
    availableFrom: payload.availableFrom,
    street: address?.street,
    ward: address?.ward,
    city: address?.city,
    furnishingStatus: (apartment ?? house ?? room)!.furnishingStatus as Facts["furnishingStatus"],
    furnishings: (payload.furnishings ?? []).map((f) => ({ name: f.assetName, quantity: f.quantity })),
    amenities: [...(payload.amenityCodes ?? []).map((code) => amenityLabels[code] ?? code), ...(payload.customAmenities ?? [])],
    charges: (payload.charges ?? []).map((c) => ({
      type: c.chargeType, method: c.billingMethod, amount: c.amount, includedInRent: c.includedInRent, name: c.customName,
    })),
    ...(apartment && {
      projectName: apartment.projectName, buildingBlock: apartment.buildingBlock,
      floorNumber: apartment.floorNumber, totalFloors: apartment.buildingTotalFloors,
      bedrooms: apartment.bedroomCount, bathrooms: apartment.bathroomCount,
      livingRooms: apartment.livingRoomCount, kitchens: apartment.kitchenCount,
      doorDirection: apartment.mainDoorDirection as Facts["doorDirection"],
      balconyDirection: apartment.balconyDirection as Facts["balconyDirection"],
      view: apartment.viewDescription, maxOccupants: apartment.maxOccupants,
    }),
    ...(house && {
      totalFloors: house.totalFloors, bedrooms: house.bedroomCount, bathrooms: house.bathroomCount,
      livingRooms: house.livingRoomCount, kitchens: house.kitchenCount,
      landAreaM2: house.landAreaM2, frontageWidthM: house.frontageWidthM, lengthM: house.lengthM,
      roadWidthM: house.accessRoadWidthM, frontageCount: house.frontageCount,
      hasRooftop: house.hasRooftop, hasGarage: house.hasGarage,
      accessType: house.accessType as Facts["accessType"],
      maxOccupants: house.maxOccupants, maxVehicles: house.maxVehicles,
    }),
    ...(room && {
      roomCode: room.roomCode, floorNumber: room.floorNumber,
      restroomType: room.restroomType as Facts["restroomType"],
      kitchenType: room.kitchenType as Facts["kitchenType"],
      hasWindow: room.hasWindow, balconyType: room.balconyType as Facts["balconyType"],
      hasMezzanine: room.hasMezzanine, accessType: room.accessType as Facts["accessType"],
      accessHoursType: room.accessHoursType as Facts["accessHoursType"],
      electricMeterType: room.electricMeterType as Facts["electricMeterType"],
      waterMeterType: room.waterMeterType as Facts["waterMeterType"],
      parkingPolicy: room.parkingPolicy as Facts["parkingPolicy"],
      maxOccupants: room.maxOccupants, maxVehicles: room.maxVehicles,
    }),
  };
}

export async function fetchListingDescription(
  body: ListingDescriptionRequest,
  signal: AbortSignal,
): Promise<ListingDescriptionResponse> {
  // No AbortSignal.any: Safari before 17.4 lacks it.
  const request = new AbortController();
  const abort = () => request.abort();
  signal.addEventListener("abort", abort);
  const timer = setTimeout(abort, 20_000);
  try {
    const response = await fetch("/api/listing-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: request.signal,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.description) {
      throw new Error(result?.message || "Không tạo được mô tả. Vui lòng thử lại.");
    }
    return result;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}
