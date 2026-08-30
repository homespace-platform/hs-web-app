import type {
  CreateListingRequest,
  ListingCategory,
  ListingSubtype,
  RentalMode,
  PriceUnit,
  DepositType,
  PaymentCycle,
  ListingChargeRequest,
  ListingMediaRequest,
  ApartmentDetailRequest,
  HouseDetailRequest,
  OfficeDetailRequest,
  CommercialDetailRequest,
  RoomDetailRequest,
  FurnishingStatus,
  PositionType,
  ParkingType,
} from "@/types/listing.type";

import type {
  BasicInfoData,
  ApartmentDetailsData,
  HouseDetailsData,
  OfficeDetailsData,
  CommercialDetailsData,
  RoomDetailsData,
  MonthlyExpensesData,
  PricingData,
} from "../types";

export interface BuildPayloadParams {
  basicInfo: BasicInfoData;
  apartmentDetails: ApartmentDetailsData;
  houseDetails: HouseDetailsData;
  officeDetails: OfficeDetailsData;
  commercialDetails: CommercialDetailsData;
  roomDetails: RoomDetailsData;
  selectedAmenities: string[];
  monthlyExpenses: MonthlyExpensesData;
  pricing: PricingData;
  addressMode: "saved" | "new";
  savedAddressId?: string | null;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  streetLine: string;
  fullAddress: string;
  uploadedMediaList: { storageObjectId: string; mediaType: "IMAGE" | "VIDEO" }[];
}

function resolveCategory(cat: string): ListingCategory {
  switch (cat) {
    case "apartment":
      return "APARTMENT";
    case "house":
      return "HOUSE";
    case "office":
      return "OFFICE";
    case "commercial":
      return "COMMERCIAL_SPACE";
    case "room":
      return "ROOM";
    default:
      return "APARTMENT";
  }
}

function resolveSubtype(cat: string, subtype: string): ListingSubtype {
  if (subtype === "other") {
    switch (cat) {
      case "apartment":
        return "APARTMENT_OTHER";
      case "house":
        return "HOUSE_OTHER";
      case "office":
        return "OFFICE_OTHER";
      case "commercial":
        return "COMMERCIAL_OTHER";
      case "room":
        return "ROOM_OTHER";
      default:
        return "APARTMENT_OTHER";
    }
  }

  const map: Record<string, ListingSubtype> = {
    // apartment
    standard: "APARTMENT_STANDARD",
    studio: "APARTMENT_STUDIO",
    duplex: "APARTMENT_DUPLEX",
    penthouse: "APARTMENT_PENTHOUSE",
    officetel: "APARTMENT_OFFICETEL",
    // house
    townhouse: "HOUSE_TOWNHOUSE",
    alley_house: "HOUSE_ALLEY",
    villa: "HOUSE_VILLA",
    grade4: "HOUSE_GRADE_4",
    // office
    traditional_office: "OFFICE_TRADITIONAL",
    serviced_office: "OFFICE_SERVICED",
    coworking: "OFFICE_COWORKING",
    shared_space: "OFFICE_SHARED",
    // commercial
    shop: "COMMERCIAL_STORE",
    kiosk: "COMMERCIAL_KIOSK",
    showroom: "COMMERCIAL_SHOWROOM",
    shophouse: "COMMERCIAL_SHOPHOUSE",
    mall_space: "COMMERCIAL_MALL",
    // room
    boarding_room: "ROOM_BOARDING",
    house_room: "ROOM_IN_HOUSE",
    serviced_apartment: "ROOM_SERVICED_APARTMENT",
    dormitory: "ROOM_DORMITORY",
  };

  return map[subtype] || "APARTMENT_STANDARD";
}

function resolvePriceUnit(unit: string): PriceUnit {
  switch (unit) {
    case "VND_M2_MONTH":
      return "M2_MONTH";
    case "VND_ROOM_MONTH":
      return "ROOM_MONTH";
    case "VND_PERSON_MONTH":
      return "PERSON_MONTH";
    case "VND_SEAT_MONTH":
      return "SEAT_MONTH";
    case "VND_MONTH":
    default:
      return "MONTH";
  }
}

function resolveDepositType(type: string): DepositType {
  switch (type) {
    case "AMOUNT":
      return "FIXED_AMOUNT";
    case "MONTHS":
      return "MONTH_COUNT";
    case "NEGOTIATE":
      return "NEGOTIABLE";
    case "NONE":
    default:
      return "NONE";
  }
}

function resolvePaymentCycle(cycle: string): PaymentCycle {
  switch (cycle) {
    case "TWO_MONTHS":
      return "EVERY_2_MONTHS";
    case "QUARTERLY":
      return "QUARTERLY";
    case "HALF_YEAR":
      return "EVERY_6_MONTHS";
    case "NEGOTIATE":
      return "NEGOTIABLE";
    case "MONTHLY":
    default:
      return "MONTHLY";
  }
}

function resolveFurnishing(f: string): FurnishingStatus {
  switch (f) {
    case "FULL":
      return "FULLY_FURNISHED";
    case "BASIC":
      return "BASIC";
    case "EMPTY":
    default:
      return "UNFURNISHED";
  }
}

export function buildCreateListingPayload(params: BuildPayloadParams): CreateListingRequest {
  const {
    basicInfo,
    apartmentDetails,
    houseDetails,
    officeDetails,
    commercialDetails,
    roomDetails,
    selectedAmenities,
    monthlyExpenses,
    pricing,
    addressMode,
    savedAddressId,
    provinceCode,
    provinceName,
    wardCode,
    wardName,
    streetLine,
    fullAddress,
    uploadedMediaList,
  } = params;

  const category = resolveCategory(basicInfo.category);
  const subtype = resolveSubtype(basicInfo.category, basicInfo.subtype);

  const rentalMode: RentalMode =
    basicInfo.category === "house" && basicInfo.rentalType === "PARTIAL"
      ? "PARTIAL"
      : "WHOLE_UNIT";

  // Calculate total main area
  let areaM2 = 30;
  if (basicInfo.category === "apartment") {
    areaM2 = Number(apartmentDetails.areaM2) || 30;
  } else if (basicInfo.category === "house") {
    areaM2 = Number(houseDetails.totalUsableAreaM2) || 50;
  } else if (basicInfo.category === "office") {
    areaM2 = Number(officeDetails.rentalAreaM2) || 40;
  } else if (basicInfo.category === "commercial") {
    areaM2 = Number(commercialDetails.areaM2) || 40;
  } else if (basicInfo.category === "room") {
    areaM2 = Number(roomDetails.areaM2) || 20;
  }

  // Build Pricing
  const depType = resolveDepositType(pricing.depositType);
  const priceAmount = Number(pricing.priceMonthly) || 0;
  const depositAmount =
    depType === "FIXED_AMOUNT" && pricing.depositAmount ? Number(pricing.depositAmount) : null;
  const depositMonths =
    depType === "MONTH_COUNT" && pricing.depositMonths ? Number(pricing.depositMonths) : null;

  const pricingPayload = {
    amount: priceAmount,
    currency: "VND",
    unit: resolvePriceUnit(pricing.priceUnit),
    negotiable: Boolean(pricing.isNegotiable),
    depositType: depType,
    depositAmount,
    depositMonths,
    paymentCycle: resolvePaymentCycle(pricing.paymentCycle),
    minimumLeaseMonths: Number(pricing.minimumLeaseMonths) || 1,
    managementFeeIncluded: monthlyExpenses.managementFeeType === "INCLUDED",
    vatIncluded: Boolean(pricing.includeVat),
  };

  // Build Category Specific Details
  let apartmentDetail: ApartmentDetailRequest | null = null;
  let houseDetail: HouseDetailRequest | null = null;
  let officeDetail: OfficeDetailRequest | null = null;
  let commercialDetail: CommercialDetailRequest | null = null;
  let roomDetail: RoomDetailRequest | null = null;

  if (category === "APARTMENT") {
    apartmentDetail = {
      projectName: apartmentDetails.projectName.trim(),
      buildingBlock: apartmentDetails.buildingBlock?.trim() || null,
      unitCode: apartmentDetails.unitNumber?.trim() || null,
      floorNumber: Number(apartmentDetails.floor) || 0,
      buildingTotalFloors: apartmentDetails.totalFloors ? Number(apartmentDetails.totalFloors) : null,
      bedroomCount: Number(apartmentDetails.bedrooms) || 0,
      bathroomCount: Number(apartmentDetails.bathrooms) || 1,
      livingRoomCount: apartmentDetails.livingRooms ? Number(apartmentDetails.livingRooms) : null,
      kitchenCount: apartmentDetails.kitchens ? Number(apartmentDetails.kitchens) : null,
      furnishingStatus: resolveFurnishing(apartmentDetails.furnishing),
      mainDoorDirection: apartmentDetails.doorOrientation || null,
      balconyDirection: apartmentDetails.balconyOrientation || null,
      viewDescription: apartmentDetails.view?.trim() || null,
      maxOccupants: apartmentDetails.maxOccupants ? Number(apartmentDetails.maxOccupants) : null,
      legalStatus: apartmentDetails.legalStatus || null,
    };
  } else if (category === "HOUSE") {
    const isPartial = rentalMode === "PARTIAL";
    houseDetail = {
      landAreaM2: houseDetails.landAreaM2 ? Number(houseDetails.landAreaM2) : null,
      frontageWidthM: houseDetails.facadeWidthM ? Number(houseDetails.facadeWidthM) : null,
      lengthM: houseDetails.lengthM ? Number(houseDetails.lengthM) : null,
      accessRoadWidthM: houseDetails.streetWidthM ? Number(houseDetails.streetWidthM) : null,
      frontageCount: houseDetails.frontageCount ? Number(houseDetails.frontageCount) : 1,
      totalFloors: Number(houseDetails.totalFloors) || 1,
      bedroomCount: Number(houseDetails.bedrooms) || 1,
      bathroomCount: Number(houseDetails.bathrooms) || 1,
      livingRoomCount: houseDetails.livingRooms ? Number(houseDetails.livingRooms) : null,
      kitchenCount: houseDetails.kitchens ? Number(houseDetails.kitchens) : null,
      hasRooftop: Boolean(houseDetails.hasRooftopTerrace),
      hasGarage: Boolean(houseDetails.hasGarage),
      accessType: houseDetails.privateEntrance || "PRIVATE",
      maxOccupants: houseDetails.maxOccupants ? Number(houseDetails.maxOccupants) : null,
      maxVehicles: houseDetails.maxVehicles ? Number(houseDetails.maxVehicles) : null,
      furnishingStatus: resolveFurnishing(houseDetails.furnishing),
      legalStatus: houseDetails.legalStatus || null,
      rentalScopeDescription: isPartial ? houseDetails.rentalScope?.trim() || null : null,
      rentedFloorFrom: isPartial && houseDetails.rentalFloor ? Number(houseDetails.rentalFloor) : null,
      rentedFloorTo: isPartial && houseDetails.rentalFloor ? Number(houseDetails.rentalFloor) : null,
    };
  } else if (category === "OFFICE") {
    const is24_7 = officeDetails.operatingHours?.includes("24/7");
    officeDetail = {
      buildingName: officeDetails.buildingName?.trim() || null,
      officeGrade: officeDetails.officeGrade || "GRADE_B",
      floorNumber: Number(officeDetails.rentalFloor) || 1,
      handoverStatus: officeDetails.handoverCondition || "BASIC",
      expectedSeats: officeDetails.seatsCount ? Number(officeDetails.seatsCount) : null,
      minimumDivisibleAreaM2: officeDetails.isSubdivisible ? Number(officeDetails.rentalAreaM2) : null,
      restroomCount: officeDetails.toiletsCount ? Number(officeDetails.toiletsCount) : null,
      restroomType: officeDetails.toiletType || "SHARED",
      pantryType: officeDetails.pantry || "SHARED",
      carParkingCapacity: officeDetails.carParkingSlots ? Number(officeDetails.carParkingSlots) || 0 : null,
      motorbikeParkingCapacity: officeDetails.motorbikeParkingSlots ? Number(officeDetails.motorbikeParkingSlots) || 0 : null,
      operatingMode: is24_7 ? "ALWAYS_OPEN" : "CUSTOM_SCHEDULE",
      operatingHours: is24_7
        ? []
        : [
            { dayOfWeek: "MONDAY", openTime: "07:30", closeTime: "18:30" },
            { dayOfWeek: "TUESDAY", openTime: "07:30", closeTime: "18:30" },
            { dayOfWeek: "WEDNESDAY", openTime: "07:30", closeTime: "18:30" },
            { dayOfWeek: "THURSDAY", openTime: "07:30", closeTime: "18:30" },
            { dayOfWeek: "FRIDAY", openTime: "07:30", closeTime: "18:30" },
            ...(officeDetails.operatingHours?.includes("Thứ 7") ||
            officeDetails.operatingHours?.includes("Cả tuần")
              ? [{ dayOfWeek: "SATURDAY" as const, openTime: "07:30", closeTime: "18:30" }]
              : []),
            ...(officeDetails.operatingHours?.includes("CN") ||
            officeDetails.operatingHours?.includes("Chủ nhật") ||
            officeDetails.operatingHours?.includes("Cả tuần")
              ? [{ dayOfWeek: "SUNDAY" as const, openTime: "07:30", closeTime: "18:30" }]
              : []),
          ],
    };
  } else if (category === "COMMERCIAL_SPACE") {
    let positionType: PositionType = "GROUND_FLOOR";
    if (commercialDetails.spacePosition === "UPPER_FLOOR") positionType = "UPPER_FLOOR";
    else if (commercialDetails.spacePosition === "MALL") positionType = "SHOPPING_MALL";
    else if (commercialDetails.spacePosition === "OTHER") positionType = "OTHER";

    let parkingType: ParkingType = "MOTORBIKE_AND_CAR";
    if (commercialDetails.parkingOption === "MOTORBIKE_ONLY") parkingType = "MOTORBIKE";
    else if (commercialDetails.parkingOption === "NONE") parkingType = "NONE";

    commercialDetail = {
      positionType,
      frontageWidthM: commercialDetails.facadeWidthM ? Number(commercialDetails.facadeWidthM) : null,
      lengthM: commercialDetails.lengthM ? Number(commercialDetails.lengthM) : null,
      roadWidthM: commercialDetails.streetWidthM ? Number(commercialDetails.streetWidthM) : null,
      frontageCount: commercialDetails.frontageCount ? Number(commercialDetails.frontageCount) : 1,
      rentedFloorCount: commercialDetails.rentalFloorsCount ? Number(commercialDetails.rentalFloorsCount) : 1,
      hasMezzanine: Boolean(commercialDetails.hasLoft),
      restroomCount: commercialDetails.toiletsCount ? Number(commercialDetails.toiletsCount) : null,
      accessType: commercialDetails.privateEntrance || "PRIVATE",
      parkingType,
      handoverStatus: commercialDetails.handoverCondition || "BASIC",
      hasThreePhasePower: Boolean(commercialDetails.hasThreePhasePower),
      hasStandardFireSafety: Boolean(commercialDetails.hasFireSafety),
      operatingHoursDescription: commercialDetails.operatingHours?.trim() || null,
      restrictedBusinesses: commercialDetails.restrictedIndustries?.trim() || null,
      loadingAreaDescription: commercialDetails.loadingArea?.trim() || null,
    };
  } else if (category === "ROOM") {
    roomDetail = {
      roomCode: roomDetails.roomCode?.trim() || null,
      floorNumber: roomDetails.roomFloor ? Number(roomDetails.roomFloor) : null,
      restroomType: roomDetails.toiletType === "SHARED" ? "SHARED" : "PRIVATE",
      kitchenType:
        roomDetails.kitchenType === "SHARED"
          ? "SHARED"
          : roomDetails.kitchenType === "NONE"
          ? "NONE"
          : "PRIVATE",
      hasWindow: roomDetails.hasWindow === "YES",
      hasBalcony: roomDetails.hasBalcony === "PRIVATE" || roomDetails.hasBalcony === "SHARED",
      hasMezzanine: Boolean(roomDetails.hasLoft),
      furnishingStatus: resolveFurnishing(roomDetails.furnishing),
      accessType: roomDetails.entranceType === "SHARED" ? "SHARED" : "PRIVATE",
      accessHoursType: roomDetails.curfewType === "CURFEW" ? "CURFEW" : "FLEXIBLE",
      electricMeterType: roomDetails.electricityMeter === "SHARED" ? "SHARED" : "PRIVATE",
      waterMeterType: roomDetails.waterMeter === "SHARED" ? "SHARED" : "PRIVATE",
      maxOccupants: Number(roomDetails.maxOccupants) || 1,
      maxVehicles: roomDetails.maxVehicles ? Number(roomDetails.maxVehicles) : null,
      parkingPolicy:
        roomDetails.parkingPolicy === "PAID"
          ? "PAID"
          : roomDetails.parkingPolicy === "NONE"
          ? "NONE"
          : "FREE",
    };
  }

  // Build Charges
  const charges: ListingChargeRequest[] = [
    {
      chargeType: "ELECTRICITY",
      billingMethod:
        monthlyExpenses.electricityType === "KWH"
          ? "PER_KWH"
          : monthlyExpenses.electricityType === "STATE_PRICE"
          ? "STATE_WATER_RATE"
          : monthlyExpenses.electricityType === "INCLUDED"
          ? "INCLUDED"
          : "NEGOTIABLE",
      amount:
        monthlyExpenses.electricityType === "KWH" && monthlyExpenses.electricityPrice
          ? Number(monthlyExpenses.electricityPrice)
          : null,
      unit: "kWh",
      includedInRent: monthlyExpenses.electricityType === "INCLUDED",
      sortOrder: 1,
    },
    {
      chargeType: "WATER",
      billingMethod:
        monthlyExpenses.waterType === "M3"
          ? "PER_M3"
          : monthlyExpenses.waterType === "PER_PERSON"
          ? "PER_PERSON_MONTH"
          : monthlyExpenses.waterType === "FLAT_ROOM"
          ? "PER_MONTH"
          : "INCLUDED",
      amount:
        (monthlyExpenses.waterType === "M3" ||
          monthlyExpenses.waterType === "PER_PERSON" ||
          monthlyExpenses.waterType === "FLAT_ROOM") &&
        monthlyExpenses.waterPrice
          ? Number(monthlyExpenses.waterPrice)
          : null,
      unit: monthlyExpenses.waterType === "M3" ? "m³" : "người",
      includedInRent: monthlyExpenses.waterType === "INCLUDED",
      sortOrder: 2,
    },
    {
      chargeType: "MANAGEMENT",
      billingMethod:
        monthlyExpenses.managementFeeType === "MONTHLY"
          ? "PER_MONTH"
          : monthlyExpenses.managementFeeType === "PER_M2"
          ? "PER_M2_MONTH"
          : monthlyExpenses.managementFeeType === "INCLUDED"
          ? "INCLUDED"
          : "NOT_APPLICABLE",
      amount:
        (monthlyExpenses.managementFeeType === "MONTHLY" ||
          monthlyExpenses.managementFeeType === "PER_M2") &&
        monthlyExpenses.managementFee
          ? Number(monthlyExpenses.managementFee)
          : null,
      includedInRent: monthlyExpenses.managementFeeType === "INCLUDED",
      sortOrder: 3,
    },
    {
      chargeType: "INTERNET",
      billingMethod:
        monthlyExpenses.internetType === "MONTHLY"
          ? "PER_MONTH"
          : monthlyExpenses.internetType === "INCLUDED"
          ? "INCLUDED"
          : "NOT_APPLICABLE",
      amount:
        monthlyExpenses.internetType === "MONTHLY" && monthlyExpenses.internetFee
          ? Number(monthlyExpenses.internetFee)
          : null,
      includedInRent: monthlyExpenses.internetType === "INCLUDED",
      sortOrder: 4,
    },
    {
      chargeType: "SERVICE_OR_GARBAGE",
      billingMethod: monthlyExpenses.garbageFeeType === "MONTHLY" ? "PER_MONTH" : "INCLUDED",
      amount:
        monthlyExpenses.garbageFeeType === "MONTHLY" && monthlyExpenses.garbageFee
          ? Number(monthlyExpenses.garbageFee)
          : null,
      includedInRent: monthlyExpenses.garbageFeeType === "INCLUDED",
      sortOrder: 5,
    },
    {
      chargeType: "MOTORBIKE_PARKING",
      billingMethod:
        monthlyExpenses.motorbikeParkingType === "PER_VEHICLE"
          ? "PER_VEHICLE_MONTH"
          : monthlyExpenses.motorbikeParkingType === "INCLUDED"
          ? "INCLUDED"
          : "NOT_APPLICABLE",
      amount:
        monthlyExpenses.motorbikeParkingType === "PER_VEHICLE" &&
        monthlyExpenses.motorbikeParkingFee
          ? Number(monthlyExpenses.motorbikeParkingFee)
          : null,
      includedInRent: monthlyExpenses.motorbikeParkingType === "INCLUDED",
      sortOrder: 6,
    },
    {
      chargeType: "CAR_PARKING",
      billingMethod:
        monthlyExpenses.carParkingType === "PER_VEHICLE"
          ? "PER_VEHICLE_MONTH"
          : monthlyExpenses.carParkingType === "INCLUDED"
          ? "INCLUDED"
          : "NOT_APPLICABLE",
      amount:
        monthlyExpenses.carParkingType === "PER_VEHICLE" && monthlyExpenses.carParkingFee
          ? Number(monthlyExpenses.carParkingFee)
          : null,
      includedInRent: monthlyExpenses.carParkingType === "INCLUDED",
      sortOrder: 7,
    },
    ...(category === "OFFICE" && monthlyExpenses.overtimeAcFee
      ? [
          {
            chargeType: "OVERTIME_AIR_CONDITIONING" as const,
            billingMethod: "PER_HOUR" as const,
            amount: Number(monthlyExpenses.overtimeAcFee),
            includedInRent: false,
            sortOrder: 8,
          },
        ]
      : []),
    ...monthlyExpenses.customFees.map((fee, idx) => ({
      chargeType: "OTHER" as const,
      billingMethod: "PER_MONTH" as const,
      amount: Number(fee.amount) || 0,
      customName: fee.name || "Phí khác",
      includedInRent: false,
      sortOrder: 9 + idx,
    })),
  ];

  // Build Media
  const media: ListingMediaRequest[] = uploadedMediaList.map((item, idx) => ({
    storageObjectId: item.storageObjectId,
    mediaType: item.mediaType,
    sortOrder: idx,
    cover: idx === 0,
  }));

  // Build Address Source
  const addressSource =
    addressMode === "saved" && savedAddressId
      ? {
          type: "SAVED" as const,
          savedAddressId,
        }
      : {
          type: "NEW" as const,
          address: {
            provinceCode: provinceCode || "79",
            provinceName: provinceName || "Hồ Chí Minh",
            wardCode: wardCode || "default",
            wardName: wardName || "",
            streetLine: streetLine.trim() || "Chưa cập nhật",
            fullAddress: fullAddress || streetLine.trim(),
          },
        };

  return {
    title: basicInfo.title.trim(),
    description: basicInfo.description.trim(),
    category,
    subtype,
    rentalMode,
    availableFrom: basicInfo.availableDate || new Date().toISOString().split("T")[0],
    areaM2,
    pricing: pricingPayload,
    apartmentDetail,
    houseDetail,
    officeDetail,
    commercialDetail,
    roomDetail,
    amenityCodes: selectedAmenities,
    customAmenities: [],
    furnishingCodes: category === "ROOM" ? roomDetails.selectedFurniture : [],
    charges,
    addressSource,
    media,
  };
}
