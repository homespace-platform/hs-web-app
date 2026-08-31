"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import provinceService from "@/services/province.service";
import listingService from "@/services/listing.service";
import storageService from "@/services/storage.service";
import type { Province, Ward } from "@/types/province.type";
import type { ListingOptionsResponse } from "@/types/listing.type";
import { buildCreateListingPayload } from "./utils/buildListingPayload";

import BasicInfoSection from "./components/BasicInfoSection";
import ApartmentDetailsSection from "./components/details/ApartmentDetailsSection";
import HouseDetailsSection from "./components/details/HouseDetailsSection";
import OfficeDetailsSection from "./components/details/OfficeDetailsSection";
import CommercialDetailsSection from "./components/details/CommercialDetailsSection";
import RoomDetailsSection from "./components/details/RoomDetailsSection";
import AmenitiesSection from "./components/AmenitiesSection";
import MonthlyExpensesSection from "./components/MonthlyExpensesSection";
import PricingSection from "./components/PricingSection";
import LocationSection, { type AddressMode } from "./components/LocationSection";
import ViewingScheduleSection from "./components/ViewingScheduleSection";
import DescriptionSection from "./components/DescriptionSection";
import FormActions from "./components/FormActions";
import CategoryChangeConfirmModal from "./components/CategoryChangeConfirmModal";

import {
  SUBTYPES_BY_CATEGORY,
  RENTAL_TYPES_BY_CATEGORY,
  PRICE_UNITS_BY_CATEGORY,
} from "./constants";
import type {
  PropertyCategoryKey,
  BasicInfoData,
  ApartmentDetailsData,
  HouseDetailsData,
  OfficeDetailsData,
  CommercialDetailsData,
  RoomDetailsData,
  MonthlyExpensesData,
  PricingData,
  FormErrors,
  SelectedMediaImage,
  SelectedMediaVideo,
} from "./types";

function CreatePropertyListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { profile } = useAuth();

  const [isLoadingDetail, setIsLoadingDetail] = useState(Boolean(editId));

  // Section 1: Basic Info
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    title: "",
    images: [],
    videos: [],
    category: "apartment",
    subtype: "apartment_normal",
    rentalType: "WHOLE",
    availableDate: new Date().toISOString().split("T")[0],
    description: "",
  });

  // Section 2: Details per Category
  const [apartmentDetails, setApartmentDetails] = useState<ApartmentDetailsData>({
    projectName: "",
    buildingBlock: "",
    unitNumber: "",
    areaM2: "",
    bedrooms: "2",
    bathrooms: "2",
    livingRooms: "1",
    kitchens: "1",
    floor: "",
    totalFloors: "",
    furnishing: "FULL",
    doorOrientation: "",
    balconyOrientation: "",
    view: "",
    maxOccupants: "4",
    legalStatus: "PINK_BOOK",
  });

  const [houseDetails, setHouseDetails] = useState<HouseDetailsData>({
    landAreaM2: "",
    totalUsableAreaM2: "",
    facadeWidthM: "",
    lengthM: "",
    streetWidthM: "",
    frontageCount: "1",
    bedrooms: "3",
    bathrooms: "3",
    livingRooms: "1",
    kitchens: "1",
    totalFloors: "2",
    hasRooftopTerrace: false,
    privateEntrance: "PRIVATE",
    hasGarage: false,
    maxOccupants: "6",
    maxVehicles: "4",
    furnishing: "BASIC",
    legalStatus: "PINK_BOOK",
    rentalScope: "",
    rentalFloor: "",
    sharedEntrance: "SHARED",
  });

  const [officeDetails, setOfficeDetails] = useState<OfficeDetailsData>({
    buildingName: "",
    officeGrade: "GRADE_B",
    rentalAreaM2: "",
    isSubdivisible: false,
    rentalFloor: "",
    handoverCondition: "BASIC",
    seatsCount: "",
    toiletsCount: "2",
    toiletType: "SHARED",
    pantry: "SHARED",
    operatingHours: "07:30 – 18:30 (Thứ 2 - Thứ 7)",
    carParkingSlots: "",
    motorbikeParkingSlots: "",
  });

  const [commercialDetails, setCommercialDetails] = useState<CommercialDetailsData>({
    areaM2: "",
    spacePosition: "GROUND_LEVEL",
    facadeWidthM: "",
    lengthM: "",
    frontageCount: "1",
    streetWidthM: "",
    rentalFloorsCount: "1",
    hasLoft: false,
    toiletsCount: "1",
    privateEntrance: "PRIVATE",
    parkingOption: "BOTH",
    handoverCondition: "BASIC",
    hasThreePhasePower: false,
    hasFireSafety: true,
    operatingHours: "Tự do 24/7",
    restrictedIndustries: "",
    loadingArea: "",
  });

  const [roomDetails, setRoomDetails] = useState<RoomDetailsData>({
    roomCode: "",
    areaM2: "",
    roomFloor: "2",
    toiletType: "PRIVATE",
    kitchenType: "PRIVATE",
    hasWindow: "YES",
    hasBalcony: "PRIVATE",
    hasLoft: false,
    furnishing: "FULL",
    selectedFurniture: [],
    entranceType: "PRIVATE",
    curfewType: "FREE",
    electricityMeter: "PRIVATE",
    waterMeter: "PRIVATE",
    maxOccupants: "2",
    maxVehicles: "2",
    parkingPolicy: "FREE",
  });

  // Section 3: Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [listingOptions, setListingOptions] = useState<ListingOptionsResponse>({
    category: "APARTMENT",
    amenities: [],
    furnishings: [],
  });

  // Section 4: Monthly Expenses
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpensesData>({
    electricityType: "KWH",
    electricityPrice: "3500",
    waterType: "M3",
    waterPrice: "25000",
    managementFeeType: "INCLUDED",
    managementFee: "",
    internetType: "SELF_PAY",
    internetFee: "",
    garbageFeeType: "INCLUDED",
    garbageFee: "",
    motorbikeParkingType: "NONE",
    motorbikeParkingFee: "",
    carParkingType: "NONE",
    carParkingFee: "",
    overtimeAcFee: "",
    customFees: [],
  });

  // Section 5: Pricing
  const [pricing, setPricing] = useState<PricingData>({
    priceMonthly: "",
    priceUnit: "VND_MONTH",
    isNegotiable: false,
    depositType: "MONTHS",
    depositAmount: "",
    depositMonths: "1",
    paymentCycle: "MONTHLY",
    minimumLeaseMonths: "6",
    includeManagementFee: false,
    includeVat: false,
  });

  // Section 6: Location
  const savedUserAddress = profile?.address ?? null;
  const [addressMode, setAddressMode] = useState<AddressMode>(savedUserAddress ? "saved" : "new");
  const [streetLine, setStreetLine] = useState("");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceCode, setProvinceCode] = useState("79");
  const [wardCode, setWardCode] = useState("");
  const [provinceQuery, setProvinceQuery] = useState("");
  const [wardQuery, setWardQuery] = useState("");
  const [wardLoading, setWardLoading] = useState(true);
  const [locationError, setLocationError] = useState("");

  // Section 7: Viewing Schedule (Không tự check mặc định)
  const [selectedViewingDays, setSelectedViewingDays] = useState<string[]>([]);
  const [selectedViewingSlots, setSelectedViewingSlots] = useState<string[]>([]);

  // Modal confirm category switch
  const [pendingCategory, setPendingCategory] = useState<PropertyCategoryKey | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Errors state
  const [errors, setErrors] = useState<FormErrors>({});

  // Fetch provinces
  useEffect(() => {
    let cancelled = false;
    provinceService
      .getCurrentProvinces()
      .then((data) => {
        if (cancelled) return;
        setProvinces(data);
      })
      .catch(() => {
        if (cancelled) return;
        setLocationError("Không tải được danh sách tỉnh/thành phố.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch public listing options catalog
  useEffect(() => {
    let cancelled = false;
    const catEnum =
      basicInfo.category === "house"
        ? "HOUSE"
        : basicInfo.category === "office"
        ? "OFFICE"
        : basicInfo.category === "commercial"
        ? "COMMERCIAL_SPACE"
        : basicInfo.category === "room"
        ? "ROOM"
        : "APARTMENT";

    listingService
      .getPublicOptions(catEnum)
      .then((res) => {
        if (!cancelled && res) {
          setListingOptions(res);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch options catalog:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [basicInfo.category]);

  // Fetch wards when province changes
  useEffect(() => {
    let cancelled = false;
    if (!provinceCode) return;

    provinceService
      .getCurrentWardsByProvince(provinceCode)
      .then((data) => {
        if (cancelled) return;
        setWards(data);
        setWardLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setWards([]);
        setWardLoading(false);
        setLocationError("Không tải được danh sách phường/xã.");
      });

    return () => {
      cancelled = true;
    };
  }, [provinceCode]);

  // Load existing listing data if editing
  useEffect(() => {
    if (!editId) return;

    let active = true;

    listingService
      .getById(editId)
      .then((res) => {
        if (!active) return;

        // 1. Basic Info
        let cat: PropertyCategoryKey = "apartment";
        if (res.category === "HOUSE") cat = "house";
        else if (res.category === "OFFICE") cat = "office";
        else if (res.category === "COMMERCIAL_SPACE" || res.category === "COMMERCIAL") cat = "commercial";
        else if (res.category === "ROOM") cat = "room";

        const subtypeMap: Record<string, string> = {
          APARTMENT_STANDARD: "standard",
          APARTMENT_STUDIO: "studio",
          APARTMENT_DUPLEX: "duplex",
          APARTMENT_PENTHOUSE: "penthouse",
          APARTMENT_OFFICETEL: "officetel",
          APARTMENT_OTHER: "other",
          HOUSE_TOWNHOUSE: "townhouse",
          HOUSE_ALLEY: "alley_house",
          HOUSE_VILLA: "villa",
          HOUSE_GRADE_4: "grade4",
          HOUSE_OTHER: "other",
          OFFICE_TRADITIONAL: "traditional_office",
          OFFICE_SERVICED: "serviced_office",
          OFFICE_COWORKING: "coworking",
          OFFICE_SHARED: "shared_space",
          OFFICE_OTHER: "other",
          COMMERCIAL_STORE: "shop",
          COMMERCIAL_KIOSK: "kiosk",
          COMMERCIAL_SHOWROOM: "showroom",
          COMMERCIAL_SHOPHOUSE: "shophouse",
          COMMERCIAL_MALL: "mall_space",
          COMMERCIAL_OTHER: "other",
          ROOM_BOARDING: "boarding_room",
          ROOM_IN_HOUSE: "house_room",
          ROOM_SERVICED_APARTMENT: "serviced_apartment",
          ROOM_DORMITORY: "dormitory",
          ROOM_OTHER: "other",
        };

        const existingImages: SelectedMediaImage[] = (res.media || [])
          .filter((m) => m.mediaType === "IMAGE")
          .map((m) => ({
            name: m.id || "image",
            dataUrl: m.url,
            storageObjectId: m.storageObjectId,
          }));

        const existingVideos: SelectedMediaVideo[] = (res.media || [])
          .filter((m) => m.mediaType === "VIDEO")
          .map((m) => ({
            name: m.id || "video",
            url: m.url,
            storageObjectId: m.storageObjectId,
          }));

        setBasicInfo({
          title: res.title || "",
          images: existingImages,
          videos: existingVideos,
          category: cat,
          subtype: subtypeMap[res.subtype] || "standard",
          rentalType: res.rentalMode === "PARTIAL" ? "PARTIAL" : "WHOLE",
          availableDate: res.availableFrom || new Date().toISOString().split("T")[0],
          description: res.description || "",
        });

        // 2. Details
        if (res.apartmentDetail) {
          setApartmentDetails({
            projectName: res.apartmentDetail.projectName || "",
            buildingBlock: res.apartmentDetail.buildingBlock || "",
            unitNumber: res.apartmentDetail.unitCode || "",
            areaM2: String(res.areaM2 || ""),
            bedrooms: String(res.apartmentDetail.bedroomCount ?? "2"),
            bathrooms: String(res.apartmentDetail.bathroomCount ?? "2"),
            livingRooms: String(res.apartmentDetail.livingRoomCount ?? "1"),
            kitchens: String(res.apartmentDetail.kitchenCount ?? "1"),
            floor: String(res.apartmentDetail.floorNumber ?? ""),
            totalFloors: String(res.apartmentDetail.buildingTotalFloors ?? ""),
            furnishing: res.apartmentDetail.furnishingStatus || "FULL",
            doorOrientation: res.apartmentDetail.mainDoorDirection || "",
            balconyOrientation: res.apartmentDetail.balconyDirection || "",
            view: res.apartmentDetail.viewDescription || "",
            maxOccupants: String(res.apartmentDetail.maxOccupants ?? "4"),
            legalStatus: res.apartmentDetail.legalStatus || "PINK_BOOK",
          });
        }

        if (res.houseDetail) {
          setHouseDetails({
            landAreaM2: String(res.houseDetail.landAreaM2 ?? ""),
            totalUsableAreaM2: String(res.areaM2 || ""),
            facadeWidthM: String(res.houseDetail.frontageWidthM ?? ""),
            lengthM: String(res.houseDetail.lengthM ?? ""),
            streetWidthM: String(res.houseDetail.accessRoadWidthM ?? ""),
            frontageCount: String(res.houseDetail.frontageCount ?? "1"),
            bedrooms: String(res.houseDetail.bedroomCount ?? "3"),
            bathrooms: String(res.houseDetail.bathroomCount ?? "3"),
            livingRooms: String(res.houseDetail.livingRoomCount ?? "1"),
            kitchens: String(res.houseDetail.kitchenCount ?? "1"),
            totalFloors: String(res.houseDetail.totalFloors ?? "2"),
            hasRooftopTerrace: Boolean(res.houseDetail.hasRooftop),
            privateEntrance: res.houseDetail.accessType || "PRIVATE",
            hasGarage: Boolean(res.houseDetail.hasGarage),
            maxOccupants: String(res.houseDetail.maxOccupants ?? "6"),
            maxVehicles: String(res.houseDetail.maxVehicles ?? "4"),
            furnishing: res.houseDetail.furnishingStatus || "BASIC",
            legalStatus: res.houseDetail.legalStatus || "PINK_BOOK",
            rentalScope: res.houseDetail.rentalScopeDescription || "",
            rentalFloor: String(res.houseDetail.rentedFloorFrom ?? ""),
            sharedEntrance: "SHARED",
          });
        }

        if (res.officeDetail) {
          setOfficeDetails({
            buildingName: res.officeDetail.buildingName || "",
            officeGrade: res.officeDetail.officeGrade || "GRADE_B",
            rentalAreaM2: String(res.areaM2 || ""),
            isSubdivisible: Boolean(res.officeDetail.minimumDivisibleAreaM2),
            rentalFloor: String(res.officeDetail.floorNumber ?? "1"),
            handoverCondition: res.officeDetail.handoverStatus || "BASIC",
            seatsCount: String(res.officeDetail.expectedSeats ?? ""),
            toiletsCount: String(res.officeDetail.restroomCount ?? "2"),
            toiletType: res.officeDetail.restroomType || "SHARED",
            pantry: res.officeDetail.pantryType || "SHARED",
            operatingHours:
              res.officeDetail.operatingMode === "ALWAYS_OPEN"
                ? "24/7 (Tự do ra vào)"
                : "07:30 – 18:30 (Thứ 2 - Thứ 7)",
            carParkingSlots: String(res.officeDetail.carParkingCapacity ?? ""),
            motorbikeParkingSlots: String(res.officeDetail.motorbikeParkingCapacity ?? ""),
          });
        }

        if (res.commercialDetail) {
          setCommercialDetails({
            areaM2: String(res.areaM2 || ""),
            spacePosition:
              res.commercialDetail.positionType === "UPPER_FLOOR"
                ? "UPPER_FLOOR"
                : res.commercialDetail.positionType === "SHOPPING_MALL"
                ? "MALL"
                : "GROUND_LEVEL",
            facadeWidthM: String(res.commercialDetail.frontageWidthM ?? ""),
            lengthM: String(res.commercialDetail.lengthM ?? ""),
            frontageCount: String(res.commercialDetail.frontageCount ?? "1"),
            streetWidthM: String(res.commercialDetail.roadWidthM ?? ""),
            rentalFloorsCount: String(res.commercialDetail.rentedFloorCount ?? "1"),
            hasLoft: Boolean(res.commercialDetail.hasMezzanine),
            toiletsCount: String(res.commercialDetail.restroomCount ?? "1"),
            privateEntrance: res.commercialDetail.accessType || "PRIVATE",
            parkingOption:
              res.commercialDetail.parkingType === "MOTORBIKE"
                ? "MOTORBIKE_ONLY"
                : res.commercialDetail.parkingType === "NONE"
                ? "NONE"
                : "BOTH",
            handoverCondition: res.commercialDetail.handoverStatus || "BASIC",
            hasThreePhasePower: Boolean(res.commercialDetail.hasThreePhasePower),
            hasFireSafety: Boolean(res.commercialDetail.hasStandardFireSafety),
            operatingHours: res.commercialDetail.operatingHoursDescription || "Tự do 24/7",
            restrictedIndustries: res.commercialDetail.restrictedBusinesses || "",
            loadingArea: res.commercialDetail.loadingAreaDescription || "",
          });
        }

        if (res.roomDetail) {
          setRoomDetails({
            roomCode: res.roomDetail.roomCode || "",
            areaM2: String(res.areaM2 || ""),
            roomFloor: String(res.roomDetail.floorNumber ?? "2"),
            toiletType: res.roomDetail.restroomType === "SHARED" ? "SHARED" : "PRIVATE",
            kitchenType:
              res.roomDetail.kitchenType === "SHARED"
                ? "SHARED"
                : res.roomDetail.kitchenType === "NONE"
                ? "NONE"
                : "PRIVATE",
            hasWindow: res.roomDetail.hasWindow ? "YES" : "NO",
            hasBalcony: res.roomDetail.hasBalcony ? "PRIVATE" : "NO",
            hasLoft: Boolean(res.roomDetail.hasMezzanine),
            furnishing: res.roomDetail.furnishingStatus || "FULL",
            selectedFurniture: res.furnishings?.map((f) => f.code) || [],
            entranceType: res.roomDetail.accessType === "SHARED" ? "SHARED" : "PRIVATE",
            curfewType: res.roomDetail.accessHoursType === "CURFEW" ? "CURFEW" : "FREE",
            electricityMeter: res.roomDetail.electricMeterType === "SHARED" ? "SHARED" : "PRIVATE",
            waterMeter: res.roomDetail.waterMeterType === "SHARED" ? "SHARED" : "PRIVATE",
            maxOccupants: String(res.roomDetail.maxOccupants ?? "2"),
            maxVehicles: String(res.roomDetail.maxVehicles ?? "2"),
            parkingPolicy:
              res.roomDetail.parkingPolicy === "PAID"
                ? "PAID"
                : res.roomDetail.parkingPolicy === "NONE"
                ? "NONE"
                : "FREE",
          });
        }

        // 3. Amenities
        if (res.amenities && res.amenities.length > 0) {
          setSelectedAmenities(res.amenities.map((a) => a.code || a.name));
        }

        // 4. Monthly Expenses
        if (res.charges) {
          const elec = res.charges.find((c) => c.chargeType === "ELECTRICITY");
          const water = res.charges.find((c) => c.chargeType === "WATER");
          const mgmt = res.charges.find((c) => c.chargeType === "MANAGEMENT");
          const net = res.charges.find((c) => c.chargeType === "INTERNET");
          const garb = res.charges.find((c) => c.chargeType === "SERVICE_OR_GARBAGE");
          const moto = res.charges.find((c) => c.chargeType === "MOTORBIKE_PARKING");
          const car = res.charges.find((c) => c.chargeType === "CAR_PARKING");
          const otAc = res.charges.find((c) => c.chargeType === "OVERTIME_AIR_CONDITIONING");
          const customs = res.charges.filter((c) => c.chargeType === "OTHER");

          setMonthlyExpenses({
            electricityType: elec?.includedInRent
              ? "INCLUDED"
              : elec?.billingMethod === "STATE_WATER_RATE"
              ? "STATE_PRICE"
              : "KWH",
            electricityPrice: elec?.amount != null ? String(elec.amount) : "3500",
            waterType: water?.includedInRent
              ? "INCLUDED"
              : water?.billingMethod === "PER_PERSON_MONTH"
              ? "PER_PERSON"
              : water?.billingMethod === "PER_MONTH"
              ? "FLAT_ROOM"
              : "M3",
            waterPrice: water?.amount != null ? String(water.amount) : "25000",
            managementFeeType: mgmt?.includedInRent
              ? "INCLUDED"
              : mgmt?.billingMethod === "PER_M2_MONTH"
              ? "PER_M2"
              : "MONTHLY",
            internetType: net?.includedInRent ? "INCLUDED" : net?.amount != null ? "MONTHLY" : "SELF_PAY",
            internetFee: net?.amount != null ? String(net.amount) : "",
            garbageFeeType: garb?.includedInRent ? "INCLUDED" : "MONTHLY",
            garbageFee: garb?.amount != null ? String(garb.amount) : "",
            motorbikeParkingType: moto?.includedInRent
              ? "INCLUDED"
              : moto?.amount != null
              ? "PER_VEHICLE"
              : "NONE",
            motorbikeParkingFee: moto?.amount != null ? String(moto.amount) : "",
            carParkingType: car?.includedInRent
              ? "INCLUDED"
              : car?.amount != null
              ? "PER_VEHICLE"
              : "NONE",
            carParkingFee: car?.amount != null ? String(car.amount) : "",
            overtimeAcFee: otAc?.amount != null ? String(otAc.amount) : "",
            customFees: customs.map((c, i) => ({
              id: `custom-${i}`,
              name: c.customName || "",
              amount: c.amount != null ? String(c.amount) : "",
              unit: "tháng",
            })),
          });
        }

        // 5. Pricing
        if (res.pricing) {
          setPricing({
            priceMonthly: String(res.pricing.amount ?? ""),
            priceUnit:
              res.pricing.unit === "M2_MONTH"
                ? "VND_M2_MONTH"
                : res.pricing.unit === "ROOM_MONTH"
                ? "VND_ROOM_MONTH"
                : res.pricing.unit === "PERSON_MONTH"
                ? "VND_PERSON_MONTH"
                : res.pricing.unit === "SEAT_MONTH"
                ? "VND_SEAT_MONTH"
                : "VND_MONTH",
            isNegotiable: Boolean(res.pricing.negotiable),
            depositType:
              res.pricing.depositType === "FIXED_AMOUNT"
                ? "AMOUNT"
                : res.pricing.depositType === "MONTH_COUNT"
                ? "MONTHS"
                : res.pricing.depositType === "NEGOTIABLE"
                ? "NEGOTIATE"
                : "NONE",
            depositAmount: String(res.pricing.depositAmount ?? ""),
            depositMonths: String(res.pricing.depositMonths ?? ""),
            paymentCycle:
              res.pricing.paymentCycle === "EVERY_2_MONTHS"
                ? "TWO_MONTHS"
                : res.pricing.paymentCycle === "EVERY_6_MONTHS"
                ? "HALF_YEAR"
                : res.pricing.paymentCycle === "NEGOTIABLE"
                ? "NEGOTIATE"
                : res.pricing.paymentCycle || "MONTHLY",
            minimumLeaseMonths: String(res.pricing.minimumLeaseMonths ?? "6"),
            includeManagementFee: false,
            includeVat: Boolean(res.pricing.vatIncluded),
          });
        }

        // 6. Location
        if (res.address) {
          setAddressMode("new");
          setStreetLine(res.address.streetLine || "");
          setProvinceCode(res.address.provinceCode || "79");
          setProvinceQuery(res.address.provinceName || "");
          setWardCode(res.address.wardCode || "");
          setWardQuery(res.address.wardName || "");
        }

        // 7. Viewing Schedule
        if (res.viewingDays && res.viewingDays.length > 0) {
          setSelectedViewingDays(res.viewingDays);
        }
        if (res.viewingSlots && res.viewingSlots.length > 0) {
          setSelectedViewingSlots(res.viewingSlots);
        }
      })
      .catch((err) => {
        console.error("Failed to load listing for edit:", err);
        toast.error("Không tìm thấy tin đăng hoặc bạn không có quyền chỉnh sửa.");
      })
      .finally(() => {
        if (active) setIsLoadingDetail(false);
      });

    return () => {
      active = false;
    };
  }, [editId]);

  const selectedProvince = provinces.find(
    (p) => String(p.code) === provinceCode
  );
  const selectedWard = wards.find((w) => String(w.code) === wardCode);

  const previewFullAddress = useMemo(() => {
    if (addressMode === "saved" && savedUserAddress) {
      return (
        savedUserAddress.fullAddress ||
        [
          savedUserAddress.streetLine,
          savedUserAddress.wardName,
          savedUserAddress.provinceName,
        ]
          .filter(Boolean)
          .join(", ")
      );
    }
    return [streetLine.trim(), selectedWard?.name, selectedProvince?.name]
      .filter(Boolean)
      .join(", ");
  }, [
    addressMode,
    savedUserAddress,
    streetLine,
    selectedWard?.name,
    selectedProvince?.name,
  ]);

  // Category change handler with confirmation
  function requestCategoryChange(newCategory: PropertyCategoryKey) {
    if (newCategory === basicInfo.category) return;
    setPendingCategory(newCategory);
    setIsCategoryModalOpen(true);
  }

  function applyCategoryChange(newCategory: PropertyCategoryKey) {
    const defaultSubtype = SUBTYPES_BY_CATEGORY[newCategory]?.[0]?.value ?? "";
    const defaultRentalType = RENTAL_TYPES_BY_CATEGORY[newCategory]?.[0]?.value ?? "";
    const defaultPriceUnit = PRICE_UNITS_BY_CATEGORY[newCategory]?.[0]?.value ?? "VND_MONTH";

    setBasicInfo((prev) => ({
      ...prev,
      category: newCategory,
      subtype: defaultSubtype,
      rentalType: defaultRentalType,
    }));

    setPricing((prev) => ({
      ...prev,
      priceUnit: defaultPriceUnit,
    }));

    setSelectedAmenities([]);
    setErrors({});
    setIsCategoryModalOpen(false);
    setPendingCategory(null);
  }

  const handleProvinceSelect = (province: Province) => {
    setProvinceCode(String(province.code));
    setProvinceQuery(province.name);
    setWardCode("");
    setWardQuery("");
  };

  const handleWardSelect = (ward: Ward) => {
    setWardCode(String(ward.code));
    setWardQuery(ward.name);
  };

  const scrollToField = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    }
  };

  function validateAllFields(options?: { skipDescription?: boolean }): boolean {
    const newErrors: FormErrors = {};
    let firstErrorId = "";

    const addError = (elementId: string, key: string, message: string) => {
      newErrors[key] = message;
      if (!firstErrorId) {
        firstErrorId = elementId;
      }
    };

    // 1. Basic Info
    if (!basicInfo.title.trim()) {
      addError("field-title", "title", "Vui lòng nhập tiêu đề bài đăng.");
    } else if (basicInfo.title.trim().length < 15) {
      addError("field-title", "title", "Tiêu đề quá ngắn (tối thiểu 15 ký tự).");
    }

    if (basicInfo.images.length === 0) {
      addError("field-images", "images", "Vui lòng tải lên ít nhất 1 hình ảnh thực tế.");
    }

    // 2. Category specific
    if (basicInfo.category === "apartment") {
      if (!apartmentDetails.projectName.trim()) {
        addError("field-project-name", "projectName", "Vui lòng nhập tên dự án / tòa nhà.");
      }
      if (!apartmentDetails.areaM2 || Number(apartmentDetails.areaM2) <= 0) {
        addError("field-area-m2", "areaM2", "Diện tích căn hộ phải lớn hơn 0.");
      }
      if (!apartmentDetails.floor) {
        addError("field-floor", "floor", "Vui lòng nhập số tầng của căn hộ.");
      }
    } else if (basicInfo.category === "house") {
      if (!houseDetails.totalUsableAreaM2 || Number(houseDetails.totalUsableAreaM2) <= 0) {
        addError("field-house-area", "totalUsableAreaM2", "Tổng diện tích sử dụng phải lớn hơn 0.");
      }
      if (!houseDetails.totalFloors || Number(houseDetails.totalFloors) <= 0) {
        addError("field-house-floors", "totalFloors", "Số tầng phải lớn hơn 0.");
      }
      if (basicInfo.rentalType === "PARTIAL" && !houseDetails.rentalScope?.trim()) {
        addError("field-rental-scope", "rentalScope", "Vui lòng mô tả phần diện tích cho thuê.");
      }
    } else if (basicInfo.category === "office") {
      if (basicInfo.subtype === "traditional_office" && !officeDetails.buildingName?.trim()) {
        addError("field-office-building", "buildingName", "Vui lòng nhập tên tòa nhà văn phòng.");
      }
      if (!officeDetails.rentalAreaM2 || Number(officeDetails.rentalAreaM2) <= 0) {
        addError("field-office-area", "rentalAreaM2", "Diện tích thuê phải lớn hơn 0.");
      }
      if (!officeDetails.rentalFloor) {
        addError("field-office-floor", "rentalFloor", "Vui lòng nhập tầng đặt văn phòng.");
      }
    } else if (basicInfo.category === "commercial") {
      if (!commercialDetails.areaM2 || Number(commercialDetails.areaM2) <= 0) {
        addError("field-commercial-area", "areaM2", "Diện tích mặt bằng phải lớn hơn 0.");
      }
      if (
        ["shop", "showroom", "shophouse"].includes(basicInfo.subtype) &&
        (!commercialDetails.facadeWidthM || Number(commercialDetails.facadeWidthM) <= 0)
      ) {
        addError("field-commercial-facade", "facadeWidthM", "Vui lòng nhập chiều rộng mặt tiền.");
      }
    } else if (basicInfo.category === "room") {
      if (!roomDetails.areaM2 || Number(roomDetails.areaM2) <= 0) {
        addError("field-room-area", "areaM2", "Diện tích phòng phải lớn hơn 0.");
      }
      if (!roomDetails.maxOccupants || Number(roomDetails.maxOccupants) <= 0) {
        addError("field-room-occupants", "maxOccupants", "Số người ở tối đa phải lớn hơn 0.");
      }
    }

    // 3. Pricing
    if (!pricing.priceMonthly || Number(pricing.priceMonthly) <= 0) {
      addError("field-pricing-monthly", "priceMonthly", "Vui lòng nhập giá cho thuê hợp lệ.");
    }
    if (pricing.depositType === "AMOUNT" && (!pricing.depositAmount || Number(pricing.depositAmount) <= 0)) {
      addError("field-deposit-amount", "depositAmount", "Vui lòng nhập số tiền đặt cọc.");
    }
    if (pricing.depositType === "MONTHS" && (!pricing.depositMonths || Number(pricing.depositMonths) <= 0)) {
      addError("field-deposit-months", "depositMonths", "Vui lòng nhập số tháng đặt cọc.");
    }

    // 4. Location
    if (addressMode === "new") {
      if (!provinceCode || !selectedProvince) {
        addError("field-province", "province", "Vui lòng chọn Tỉnh / Thành phố.");
      }
      if (!wardCode || !selectedWard) {
        addError("field-ward", "ward", "Vui lòng chọn Phường / Xã.");
      }
      if (!streetLine.trim()) {
        addError("field-street-line", "streetLine", "Vui lòng nhập địa chỉ cụ thể (Số nhà, tên đường).");
      }
    } else if (!savedUserAddress) {
      addError("field-street-line", "streetLine", "Không tìm thấy địa chỉ tài khoản đã lưu.");
    }

    // 5. Viewing Schedule
    if (selectedViewingDays.length === 0) {
      addError("field-viewing-days", "viewingDays", "Vui lòng chọn ít nhất một ngày trong tuần.");
    }
    if (selectedViewingSlots.length === 0) {
      addError("field-viewing-slots", "viewingSlots", "Vui lòng chọn ít nhất một buổi có thể xem.");
    }

    // 6. Description (only if not skipping)
    if (!options?.skipDescription) {
      if (!basicInfo.description.trim()) {
        addError("field-description", "description", "Vui lòng nhập mô tả chi tiết bài đăng.");
      } else if (basicInfo.description.trim().length < 30) {
        addError("field-description", "description", "Mô tả chi tiết quá ngắn (tối thiểu 30 ký tự).");
      }
    }

    setErrors(newErrors);

    if (firstErrorId) {
      scrollToField(firstErrorId);
      const firstErrorMessage = Object.values(newErrors)[0];
      toast.error(firstErrorMessage || "Vui lòng kiểm tra lại các trường thông tin bị lỗi.");
      return false;
    }

    return true;
  }

  function handleGenerateAiDescription() {
    const isValid = validateAllFields({ skipDescription: true });
    if (!isValid) {
      toast.error("Vui lòng hoàn thành các thông tin ở các bước trên để AI có đủ dữ liệu tạo mô tả.");
      return;
    }

    toast.info("Tính năng đang phát triển");
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmitListing() {
    const isValid = validateAllFields();
    if (!isValid) return;

    try {
      setIsSubmitting(true);
      toast.loading(
        editId
          ? "Đang lưu cập nhật tin đăng..."
          : "Đang xử lý tải hình ảnh và đăng tin...",
        { id: "submit-listing" }
      );

      // 1. Upload media files if new
      const uploadedMediaList: { storageObjectId: string; mediaType: "IMAGE" | "VIDEO" }[] = [];

      for (const img of basicInfo.images) {
        if (img.storageObjectId && !img.file) {
          uploadedMediaList.push({ storageObjectId: img.storageObjectId, mediaType: "IMAGE" });
        } else if (img.file) {
          try {
            const storageId = await storageService.uploadListingMedia(img.file);
            uploadedMediaList.push({ storageObjectId: storageId, mediaType: "IMAGE" });
          } catch (uploadErr) {
            console.warn("Storage upload fallback:", uploadErr);
            uploadedMediaList.push({
              storageObjectId: crypto.randomUUID(),
              mediaType: "IMAGE",
            });
          }
        }
      }

      for (const vid of basicInfo.videos) {
        if (vid.storageObjectId && !vid.file) {
          uploadedMediaList.push({ storageObjectId: vid.storageObjectId, mediaType: "VIDEO" });
        } else if (vid.file) {
          try {
            const storageId = await storageService.uploadListingMedia(vid.file);
            uploadedMediaList.push({ storageObjectId: storageId, mediaType: "VIDEO" });
          } catch (uploadErr) {
            console.warn("Storage upload fallback:", uploadErr);
            uploadedMediaList.push({
              storageObjectId: crypto.randomUUID(),
              mediaType: "VIDEO",
            });
          }
        }
      }

      // 2. Build payload (upsert with id if editing)
      const payload = buildCreateListingPayload({
        id: editId || null,
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
        savedAddressId: savedUserAddress?.id,
        provinceCode,
        provinceName: selectedProvince?.name || provinceQuery,
        wardCode,
        wardName: selectedWard?.name || wardQuery,
        streetLine,
        fullAddress: previewFullAddress,
        uploadedMediaList,
        selectedViewingDays,
        selectedViewingSlots,
      });

      // 3. Call backend upsert API
      await listingService.upsert(payload);

      toast.success(
        editId ? "Cập nhật tin đăng thành công!" : "Đăng tin cho thuê thành công!",
        { id: "submit-listing" }
      );
      router.push("/dashboard/properties");
    } catch (error: unknown) {
      console.error("Submit listing error:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const serverMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Thao tác thất bại. Vui lòng kiểm tra lại kết nối và thử lại.";
      toast.error(serverMessage, { id: "submit-listing" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTestValidation() {
    const isValid = validateAllFields();
    if (isValid) {
      toast.success("Tất cả dữ liệu nhập vào đều hợp lệ và sẵn sàng!");
    }
  }

  // Render Category Details Subcomponent cleanly
  function renderDetailsSection() {
    switch (basicInfo.category) {
      case "apartment":
        return (
          <ApartmentDetailsSection
            data={apartmentDetails}
            subtype={basicInfo.subtype}
            errors={errors}
            onChange={(updates) =>
              setApartmentDetails((prev) => ({ ...prev, ...updates }))
            }
          />
        );
      case "house":
        return (
          <HouseDetailsSection
            data={houseDetails}
            rentalType={basicInfo.rentalType}
            errors={errors}
            onChange={(updates) =>
              setHouseDetails((prev) => ({ ...prev, ...updates }))
            }
          />
        );
      case "office":
        return (
          <OfficeDetailsSection
            data={officeDetails}
            subtype={basicInfo.subtype}
            errors={errors}
            onChange={(updates) =>
              setOfficeDetails((prev) => ({ ...prev, ...updates }))
            }
          />
        );
      case "commercial":
        return (
          <CommercialDetailsSection
            data={commercialDetails}
            subtype={basicInfo.subtype}
            errors={errors}
            onChange={(updates) =>
              setCommercialDetails((prev) => ({ ...prev, ...updates }))
            }
          />
        );
      case "room":
        return (
          <RoomDetailsSection
            data={roomDetails}
            errors={errors}
            furnishingOptions={listingOptions.furnishings}
            onChange={(updates) =>
              setRoomDetails((prev) => ({ ...prev, ...updates }))
            }
          />
        );
      default:
        return null;
    }
  }

  if (isLoadingDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Đang tải thông tin tin đăng để chỉnh sửa...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {editId ? "Chỉnh sửa tin đăng" : "Đăng tin cho thuê"}
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {editId
            ? "Cập nhật lại các thông tin của tin đăng để đảm bảo tính chính xác và thu hút khách thuê."
            : "Nhập đầy đủ thông tin để tạo tin đăng cho thuê chuyên nghiệp và tiếp cận hàng ngàn khách hàng tiềm năng."}
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-6">
        {/* Section 1: Thông tin cơ bản */}
        <BasicInfoSection
          data={basicInfo}
          errors={errors}
          onChange={(updates) => setBasicInfo((prev) => ({ ...prev, ...updates }))}
          onRequestCategoryChange={requestCategoryChange}
        />

        {/* Section 2: Thông tin chi tiết (Component phân tách riêng biệt) */}
        {renderDetailsSection()}

        {/* Section 3: Tiện ích */}
        <AmenitiesSection
          selectedAmenities={selectedAmenities}
          options={listingOptions.amenities}
          errors={errors}
          onChange={setSelectedAmenities}
        />

        {/* Section 4: Chi phí hàng tháng */}
        <MonthlyExpensesSection
          category={basicInfo.category}
          data={monthlyExpenses}
          errors={errors}
          onChange={(updates) =>
            setMonthlyExpenses((prev) => ({ ...prev, ...updates }))
          }
        />

        {/* Section 5: Giá & Điều kiện thuê */}
        <PricingSection
          category={basicInfo.category}
          data={pricing}
          errors={errors}
          onChange={(updates) => setPricing((prev) => ({ ...prev, ...updates }))}
        />

        {/* Section 6: Vị trí */}
        <LocationSection
          addressMode={addressMode}
          savedUserAddress={savedUserAddress}
          streetLine={streetLine}
          provinceCode={provinceCode}
          provinceQuery={provinceQuery}
          wardCode={wardCode}
          wardQuery={wardQuery}
          provinces={provinces}
          wards={wards}
          wardLoading={wardLoading}
          locationError={locationError}
          previewFullAddress={previewFullAddress}
          errors={errors}
          onAddressModeChange={setAddressMode}
          onStreetLineChange={setStreetLine}
          onProvinceSelect={handleProvinceSelect}
          onProvinceQueryChange={(val) => {
            setProvinceQuery(val);
            if (val !== selectedProvince?.name) {
              setProvinceCode("");
              setWardCode("");
              setWardQuery("");
              setWards([]);
            }
          }}
          onWardSelect={handleWardSelect}
          onWardQueryChange={(val) => {
            setWardQuery(val);
            if (val !== selectedWard?.name) {
              setWardCode("");
            }
          }}
        />

        {/* Section 7: Lịch xem nhà */}
        <ViewingScheduleSection
          selectedDays={selectedViewingDays}
          selectedSlots={selectedViewingSlots}
          errors={errors}
          onChangeDays={setSelectedViewingDays}
          onChangeSlots={setSelectedViewingSlots}
        />

        {/* Section 8: Mô tả chi tiết */}
        <DescriptionSection
          value={basicInfo.description}
          errors={errors}
          onChange={(val) => setBasicInfo((prev) => ({ ...prev, description: val }))}
          onGenerateAiDescription={handleGenerateAiDescription}
        />

        {/* Hành động cuối form */}
        <FormActions
          onCancel={() => router.back()}
          onValidateForm={handleTestValidation}
          onSubmit={handleSubmitListing}
          isSubmitting={isSubmitting}
          submitLabel={editId ? "Cập nhật tin đăng" : "Đăng tin"}
          loadingLabel={editId ? "Đang cập nhật..." : "Đang đăng tin..."}
        />
      </form>

      {/* Confirmation Modal when switching categories */}
      <CategoryChangeConfirmModal
        isOpen={isCategoryModalOpen}
        targetCategory={pendingCategory}
        onConfirm={() => {
          if (pendingCategory) {
            applyCategoryChange(pendingCategory);
          }
        }}
        onCancel={() => {
          setIsCategoryModalOpen(false);
          setPendingCategory(null);
        }}
      />
    </div>
  );
}

export default function CreatePropertyListingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-9 w-9 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium">Đang tải...</p>
        </div>
      }
    >
      <CreatePropertyListingContent />
    </Suspense>
  );
}
