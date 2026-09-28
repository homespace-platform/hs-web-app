import type { ListingDetailResponse } from "@/types/listing.type";
import type { PropertyBranch } from "@/services/branch.service";
import type {
  PropertyCategoryKey,
  BasicInfoData,
  ApartmentDetailsData,
  HouseDetailsData,
  RoomDetailsData,
  FurnishingAssetRow,
  MonthlyExpensesData,
  PricingData,
  SelectedMediaImage,
  SelectedMediaVideo,
} from "../types";
import { furnishingStatusToFormValue } from "./buildListingPayload";

export interface MappedListingFormState {
  basicInfo: BasicInfoData;
  apartmentDetails: ApartmentDetailsData;
  houseDetails: HouseDetailsData;
  roomDetails: RoomDetailsData;
  furnishingAssets: FurnishingAssetRow[];
  selectedAmenities: string[];
  monthlyExpenses: MonthlyExpensesData;
  pricing: PricingData;
  addressMode: "saved" | "new";
  streetLine: string;
  provinceCode: string;
  provinceQuery: string;
  wardCode: string;
  wardQuery: string;
  selectedViewingDays: string[];
  selectedViewingSlots: string[];
  notice?: {
    type: "info" | "warning" | "error";
    message: string;
  };
}

export function buildExpensesFromBranch(branch: PropertyBranch, category: PropertyCategoryKey): MonthlyExpensesData {
  const isApartment = (branch.category ? branch.category.toLowerCase() : category) === "apartment";
  const expenses: MonthlyExpensesData = {
    electricityType: "KWH",
    electricityPrice: "3500",
    waterType: "M3",
    waterPrice: "25000",
    managementFeeType: "NONE",
    managementFee: "",
    internetType: "SELF_PAY",
    internetFee: "",
    garbageFeeType: "INCLUDED",
    garbageFee: "",
    motorbikeParkingType: "NONE",
    motorbikeParkingFee: "",
    carParkingType: "NONE",
    carParkingFee: "",
    customFees: [],
  };

  if (branch.defaultCharges && branch.defaultCharges.length > 0) {
    const elec = branch.defaultCharges.find((c) => c.chargeType === "ELECTRICITY");
    if (elec) {
      expenses.electricityPrice = elec.amount ? String(elec.amount) : "";
      if (elec.includedInRent || elec.billingMethod === "INCLUDED") expenses.electricityType = "INCLUDED";
      else expenses.electricityType = "KWH";
    }

    const water = branch.defaultCharges.find((c) => c.chargeType === "WATER");
    if (water) {
      expenses.waterPrice = water.amount ? String(water.amount) : "";
      if (water.billingMethod === "PER_PERSON_MONTH") expenses.waterType = "PER_PERSON";
      else if (water.billingMethod === "PER_MONTH") expenses.waterType = "FLAT_ROOM";
      else if (water.includedInRent || water.billingMethod === "INCLUDED") expenses.waterType = "INCLUDED";
      else expenses.waterType = "M3";
    }

    const mgmt = branch.defaultCharges.find((c) => c.chargeType === "MANAGEMENT");
    if (isApartment && mgmt) {
      expenses.managementFee = mgmt.amount ? String(mgmt.amount) : "";
      if (mgmt.includedInRent || mgmt.billingMethod === "INCLUDED") expenses.managementFeeType = "INCLUDED";
      else if (mgmt.billingMethod === "PER_M2_MONTH") expenses.managementFeeType = "PER_M2";
      else if (mgmt.billingMethod === "NOT_APPLICABLE" || mgmt.billingMethod === "FREE") expenses.managementFeeType = "NONE";
      else expenses.managementFeeType = "MONTHLY";
    } else {
      expenses.managementFeeType = "NONE";
      expenses.managementFee = "";
    }

    const net = branch.defaultCharges.find((c) => c.chargeType === "INTERNET");
    if (net) {
      expenses.internetFee = net.amount ? String(net.amount) : "";
      if (net.includedInRent || net.billingMethod === "INCLUDED") expenses.internetType = "INCLUDED";
      else if (net.billingMethod === "NOT_APPLICABLE") expenses.internetType = "SELF_PAY";
      else expenses.internetType = "MONTHLY";
    }

    const garb = branch.defaultCharges.find(
      (c) => c.chargeType === "SERVICE_OR_GARBAGE" || c.chargeType === "GARBAGE" || c.chargeType === "CLEANING"
    );
    if (garb) {
      expenses.garbageFee = garb.amount ? String(garb.amount) : "";
      if (garb.includedInRent || garb.billingMethod === "INCLUDED") expenses.garbageFeeType = "INCLUDED";
      else if (garb.billingMethod === "NOT_APPLICABLE") expenses.garbageFeeType = "NONE";
      else expenses.garbageFeeType = "MONTHLY";
    }

    const moto = branch.defaultCharges.find((c) => c.chargeType === "MOTORBIKE_PARKING");
    if (moto) {
      expenses.motorbikeParkingFee = moto.amount ? String(moto.amount) : "";
      if (moto.billingMethod === "FREE" || moto.includedInRent || moto.billingMethod === "INCLUDED")
        expenses.motorbikeParkingType = "INCLUDED";
      else if (moto.billingMethod === "NOT_APPLICABLE") expenses.motorbikeParkingType = "NONE";
      else expenses.motorbikeParkingType = "PER_VEHICLE";
    }

    const car = branch.defaultCharges.find((c) => c.chargeType === "CAR_PARKING");
    if (car) {
      expenses.carParkingFee = car.amount ? String(car.amount) : "";
      if (car.billingMethod === "FREE" || car.includedInRent || car.billingMethod === "INCLUDED")
        expenses.carParkingType = "INCLUDED";
      else if (car.billingMethod === "NOT_APPLICABLE") expenses.carParkingType = "NONE";
      else expenses.carParkingType = "PER_VEHICLE";
    }

    const customOthers = branch.defaultCharges
      .filter((c) => c.chargeType === "OTHER")
      .map((c, idx) => ({
        id: c.id || `branch-fee-${idx}`,
        name: c.customName || "Phí dịch vụ khác",
        amount: c.amount ? String(c.amount) : "",
        unit: c.unit || "tháng",
      }));
    expenses.customFees = customOthers;
  }

  return expenses;
}

export function buildExpensesFromListingCharges(
  charges: ListingDetailResponse["charges"],
  category: PropertyCategoryKey
): MonthlyExpensesData {
  if (!charges || charges.length === 0) {
    return {
      electricityType: "KWH",
      electricityPrice: "3500",
      waterType: "M3",
      waterPrice: "25000",
      managementFeeType: "NONE",
      managementFee: "",
      internetType: "SELF_PAY",
      internetFee: "",
      garbageFeeType: "INCLUDED",
      garbageFee: "",
      motorbikeParkingType: "NONE",
      motorbikeParkingFee: "",
      carParkingType: "NONE",
      carParkingFee: "",
      customFees: [],
    };
  }

  const elec = charges.find((c) => c.chargeType === "ELECTRICITY");
  const water = charges.find((c) => c.chargeType === "WATER");
  const mgmt = charges.find((c) => c.chargeType === "MANAGEMENT");
  const net = charges.find((c) => c.chargeType === "INTERNET");
  const garb = charges.find((c) => c.chargeType === "SERVICE_OR_GARBAGE" || (c.chargeType as string) === "GARBAGE");
  const moto = charges.find((c) => c.chargeType === "MOTORBIKE_PARKING");
  const car = charges.find((c) => c.chargeType === "CAR_PARKING");
  const customs = charges.filter((c) => c.chargeType === "OTHER");

  return {
    electricityType: elec?.includedInRent || elec?.billingMethod === "INCLUDED" ? "INCLUDED" : "KWH",
    electricityPrice: elec?.amount != null ? String(elec.amount) : "3500",
    waterType: water?.includedInRent
      ? "INCLUDED"
      : water?.billingMethod === "PER_PERSON_MONTH"
      ? "PER_PERSON"
      : water?.billingMethod === "PER_MONTH"
      ? "FLAT_ROOM"
      : "M3",
    waterPrice: water?.amount != null ? String(water.amount) : "25000",
    managementFeeType:
      category !== "apartment" || !mgmt || mgmt.billingMethod === "NOT_APPLICABLE" || mgmt.billingMethod === "FREE"
        ? "NONE"
        : mgmt.includedInRent || mgmt.billingMethod === "INCLUDED"
        ? "INCLUDED"
        : mgmt.billingMethod === "PER_M2_MONTH"
        ? "PER_M2"
        : mgmt.billingMethod === "PER_MONTH" || mgmt.amount != null
        ? "MONTHLY"
        : "NONE",
    managementFee: category === "apartment" && mgmt?.amount != null ? String(mgmt.amount) : "",
    internetType: net?.includedInRent ? "INCLUDED" : net?.amount != null ? "MONTHLY" : "SELF_PAY",
    internetFee: net?.amount != null ? String(net.amount) : "",
    garbageFeeType: garb?.includedInRent ? "INCLUDED" : "MONTHLY",
    garbageFee: garb?.amount != null ? String(garb.amount) : "",
    motorbikeParkingType: moto?.includedInRent ? "INCLUDED" : moto?.amount != null ? "PER_VEHICLE" : "NONE",
    motorbikeParkingFee: moto?.amount != null ? String(moto.amount) : "",
    carParkingType: car?.includedInRent ? "INCLUDED" : car?.amount != null ? "PER_VEHICLE" : "NONE",
    carParkingFee: car?.amount != null ? String(car.amount) : "",
    customFees: customs.map((c, i) => ({
      id: `custom-${i}`,
      name: c.customName || "",
      amount: c.amount != null ? String(c.amount) : "",
      unit: "tháng",
    })),
  };
}

export function mapListingDetailToFormState(
  detail: ListingDetailResponse,
  mode: "edit" | "duplicate",
  branches: PropertyBranch[],
  todayStr: string
): MappedListingFormState {
  // 1. Resolve Category
  let category: PropertyCategoryKey = "apartment";
  if (detail.category === "HOUSE") category = "house";
  else if (detail.category === "ROOM") category = "room";

  // 2. Media
  const images: SelectedMediaImage[] = (detail.media || [])
    .filter((m) => m.mediaType === "IMAGE")
    .map((m) => {
      if (mode === "duplicate") {
        return {
          name: m.id || "image",
          dataUrl: m.url || "/area/hcm-1.jpg",
          sourceMediaId: m.id, // Only source reference, NO storageObjectId!
        };
      }
      return {
        name: m.id || "image",
        dataUrl: m.url || "/area/hcm-1.jpg",
        storageObjectId: m.storageObjectId,
      };
    });

  const videos: SelectedMediaVideo[] = (detail.media || [])
    .filter((m) => m.mediaType === "VIDEO")
    .map((m) => {
      if (mode === "duplicate") {
        return {
          name: m.id || "video",
          url: m.url || undefined,
          sourceMediaId: m.id, // Only source reference, NO storageObjectId!
        };
      }
      return {
        name: m.id || "video",
        url: m.url || undefined,
        storageObjectId: m.storageObjectId,
      };
    });

  // 3. Title & Available Date
  const title = mode === "duplicate"
    ? (detail.title ? `${detail.title} (Bản sao)` : "")
    : (detail.title || "");

  const availableDate =
    detail.availableFrom && detail.availableFrom >= todayStr
      ? detail.availableFrom
      : todayStr;

  // 4. Branch resolution
  let effectiveBranchId = detail.branchId || "";
  let branchNotice: MappedListingFormState["notice"] = undefined;
  const branch = branches.find((b) => b.id === detail.branchId);

  if (detail.branchId && !branch && mode === "duplicate") {
    effectiveBranchId = "";
    branchNotice = {
      type: "warning",
      message: "Chi nhánh của tin gốc không còn tồn tại hoặc bạn không còn quyền sở hữu. Hệ thống đã chuyển sang đăng tin độc lập.",
    };
  } else if (branch) {
    if (branch.isComplete === false || (branch.missingCharges && branch.missingCharges.length > 0)) {
      branchNotice = {
        type: "warning",
        message: `Chi nhánh "${branch.name}" chưa hoàn chỉnh biểu phí (${branch.missingCharges?.join(", ")}). Vui lòng cập nhật biểu phí chi nhánh trước khi gửi duyệt.`,
      };
    }
  }

  const basicInfo: BasicInfoData = {
    branchId: effectiveBranchId,
    title,
    images,
    videos,
    category,
    availableDate,
    description: detail.description || "",
  };

  // 5. Details
  const apartmentDetails: ApartmentDetailsData = {
    projectName: detail.apartmentDetail?.projectName || "",
    buildingBlock: detail.apartmentDetail?.buildingBlock || "",
    unitNumber: mode === "duplicate" ? "" : (detail.apartmentDetail?.unitCode || ""),
    areaM2: String(detail.areaM2 || ""),
    bedrooms: String(detail.apartmentDetail?.bedroomCount ?? "2"),
    bathrooms: String(detail.apartmentDetail?.bathroomCount ?? "2"),
    livingRooms: String(detail.apartmentDetail?.livingRoomCount ?? "1"),
    kitchens: String(detail.apartmentDetail?.kitchenCount ?? "1"),
    floor: String(detail.apartmentDetail?.floorNumber ?? ""),
    totalFloors: String(detail.apartmentDetail?.buildingTotalFloors ?? ""),
    furnishing: furnishingStatusToFormValue(detail.apartmentDetail?.furnishingStatus),
    doorOrientation: detail.apartmentDetail?.mainDoorDirection || "",
    balconyOrientation: detail.apartmentDetail?.balconyDirection || "",
    view: detail.apartmentDetail?.viewDescription || "",
    maxOccupants: String(detail.apartmentDetail?.maxOccupants ?? "4"),
    legalStatus: detail.apartmentDetail?.legalStatus || "PINK_BOOK",
  };

  const houseDetails: HouseDetailsData = {
    landAreaM2: String(detail.houseDetail?.landAreaM2 ?? ""),
    totalUsableAreaM2: String(detail.areaM2 || ""),
    facadeWidthM: String(detail.houseDetail?.frontageWidthM ?? ""),
    lengthM: String(detail.houseDetail?.lengthM ?? ""),
    streetWidthM: String(detail.houseDetail?.accessRoadWidthM ?? ""),
    frontageCount: String(detail.houseDetail?.frontageCount ?? "1"),
    bedrooms: String(detail.houseDetail?.bedroomCount ?? "3"),
    bathrooms: String(detail.houseDetail?.bathroomCount ?? "3"),
    livingRooms: String(detail.houseDetail?.livingRoomCount ?? "1"),
    kitchens: String(detail.houseDetail?.kitchenCount ?? "1"),
    totalFloors: String(detail.houseDetail?.totalFloors ?? "2"),
    hasRooftopTerrace: Boolean(detail.houseDetail?.hasRooftop),
    privateEntrance: detail.houseDetail?.accessType || "PRIVATE",
    hasGarage: Boolean(detail.houseDetail?.hasGarage),
    maxOccupants: String(detail.houseDetail?.maxOccupants ?? "6"),
    maxVehicles: String(detail.houseDetail?.maxVehicles ?? "4"),
    furnishing: furnishingStatusToFormValue(detail.houseDetail?.furnishingStatus),
    legalStatus: detail.houseDetail?.legalStatus || "PINK_BOOK",
  };

  const roomDetails: RoomDetailsData = {
    roomCode: mode === "duplicate" ? "" : (detail.roomDetail?.roomCode || ""),
    areaM2: String(detail.areaM2 || ""),
    roomFloor: String(detail.roomDetail?.floorNumber ?? "2"),
    toiletType: detail.roomDetail?.restroomType === "SHARED" ? "SHARED" : "PRIVATE",
    kitchenType:
      detail.roomDetail?.kitchenType === "SHARED"
        ? "SHARED"
        : detail.roomDetail?.kitchenType === "NONE"
        ? "NONE"
        : "PRIVATE",
    hasWindow: detail.roomDetail?.hasWindow ? "YES" : "NO",
    hasBalcony: (() => {
      const t = detail.roomDetail?.balconyType;
      if (t === "SHARED" || t === "PRIVATE" || t === "NONE") return t;
      if ((detail.roomDetail as { hasBalcony?: boolean })?.hasBalcony === true) return "PRIVATE";
      return "NONE";
    })(),
    hasLoft: Boolean(detail.roomDetail?.hasMezzanine),
    furnishing: furnishingStatusToFormValue(detail.roomDetail?.furnishingStatus),
    entranceType: detail.roomDetail?.accessType === "SHARED" ? "SHARED" : "PRIVATE",
    curfewType: detail.roomDetail?.accessHoursType === "CURFEW" ? "CURFEW" : "FREE",
    electricityMeter: detail.roomDetail?.electricMeterType === "SHARED" ? "SHARED" : "PRIVATE",
    waterMeter: detail.roomDetail?.waterMeterType === "SHARED" ? "SHARED" : "PRIVATE",
    maxOccupants: String(detail.roomDetail?.maxOccupants ?? "2"),
    maxVehicles: String(detail.roomDetail?.maxVehicles ?? "2"),
    parkingPolicy:
      detail.roomDetail?.parkingPolicy === "PAID"
        ? "PAID"
        : detail.roomDetail?.parkingPolicy === "NONE"
        ? "NONE"
        : "FREE",
  };

  // 6. Amenities & Furnishings
  const standardCodes = (detail.amenities || []).map((a) => a.code).filter(Boolean);
  const customItems = detail.customAmenities || [];
  const selectedAmenities = [...standardCodes, ...customItems];

  const furnishingAssets: FurnishingAssetRow[] = (detail.furnishings || []).map((f) => ({
    itemCode: f.itemCode ?? null,
    assetName: f.assetName || "",
    quantity: f.quantity ?? 1,
    handoverCondition: f.handoverCondition || "GOOD",
    conditionNote: f.conditionNote || "",
  }));

  // 7. Monthly Expenses & Location
  let monthlyExpenses: MonthlyExpensesData;
  let streetLine = "";
  let provinceCode = "79";
  let provinceQuery = "";
  let wardCode = "";
  let wardQuery = "";

  if (branch) {
    // Current branch data is ALWAYS the single source of truth for branch listings!
    monthlyExpenses = buildExpensesFromBranch(branch, category);
    streetLine = branch.streetLine || "";
    provinceCode = branch.provinceCode ? String(branch.provinceCode) : "79";
    provinceQuery = branch.provinceName || "";
    wardCode = branch.wardCode ? String(branch.wardCode) : "";
    wardQuery = branch.wardName || "";
  } else {
    // Independent listing: use charges and address from source
    monthlyExpenses = buildExpensesFromListingCharges(detail.charges, category);
    if (detail.address) {
      streetLine = detail.address.streetLine || "";
      provinceCode = detail.address.provinceCode || "79";
      provinceQuery = detail.address.provinceName || "";
      wardCode = detail.address.wardCode || "";
      wardQuery = detail.address.wardName || "";
    }
  }

  // 8. Pricing
  const pricing: PricingData = {
    priceMonthly: String(detail.pricing?.amount ?? ""),
    priceUnit:
      detail.pricing?.unit === "M2_MONTH"
        ? "VND_M2_MONTH"
        : detail.pricing?.unit === "ROOM_MONTH"
        ? "VND_ROOM_MONTH"
        : detail.pricing?.unit === "PERSON_MONTH"
        ? "VND_PERSON_MONTH"
        : detail.pricing?.unit === "SEAT_MONTH"
        ? "VND_SEAT_MONTH"
        : "VND_MONTH",
    isNegotiable: Boolean(detail.pricing?.negotiable),
    depositType:
      detail.pricing?.depositType === "FIXED_AMOUNT"
        ? "AMOUNT"
        : detail.pricing?.depositType === "MONTH_COUNT"
        ? "MONTHS"
        : "NONE",
    depositAmount: String(detail.pricing?.depositAmount ?? ""),
    depositMonths: String(detail.pricing?.depositMonths ?? ""),
    paymentCycle: "MONTHLY",
    minimumLeaseMonths: String(detail.pricing?.minimumLeaseMonths ?? "6"),
    includeManagementFee: false,
    includeVat: Boolean(detail.pricing?.vatIncluded),
  };

  return {
    basicInfo,
    apartmentDetails,
    houseDetails,
    roomDetails,
    furnishingAssets,
    selectedAmenities,
    monthlyExpenses,
    pricing,
    addressMode: "new",
    streetLine,
    provinceCode,
    provinceQuery,
    wardCode,
    wardQuery,
    selectedViewingDays: detail.viewingDays ? (detail.viewingDays as string[]) : [],
    selectedViewingSlots: detail.viewingSlots ? (detail.viewingSlots as string[]) : [],
    notice: branchNotice,
  };
}
