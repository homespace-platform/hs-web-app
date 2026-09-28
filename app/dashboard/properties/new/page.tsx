"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Copy, AlertTriangle } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import provinceService from "@/services/province.service";
import listingService from "@/services/listing.service";
import storageService from "@/services/storage.service";
import branchService, { type PropertyBranch } from "@/services/branch.service";
import type { Province, Ward } from "@/types/province.type";
import type { ListingOptionsResponse, ListingSubmissionAction, ListingDetailResponse } from "@/types/listing.type";
import { getApiErrorMessage } from "@/utils/apiError";
import { isKycSatisfied, requireKyc } from "@/lib/kyc-gate";
import {
  buildCreateListingPayload,
  furnishingStatusToFormValue,
} from "./utils/buildListingPayload";
import { mapListingDetailToFormState } from "./utils/mapListingDetailToFormState";

import BasicInfoSection from "./components/BasicInfoSection";
import ApartmentDetailsSection from "./components/details/ApartmentDetailsSection";
import HouseDetailsSection from "./components/details/HouseDetailsSection";

import RoomDetailsSection from "./components/details/RoomDetailsSection";
import FurnishingAssetsSection from "./components/details/FurnishingAssetsSection";
import AmenitiesSection from "./components/AmenitiesSection";
import MonthlyExpensesSection from "./components/MonthlyExpensesSection";
import PricingSection from "./components/PricingSection";
import LocationSection, { type AddressMode } from "./components/LocationSection";
import ViewingScheduleSection from "./components/ViewingScheduleSection";
import DescriptionSection from "./components/DescriptionSection";
import FormActions from "./components/FormActions";
import CategoryChangeConfirmModal from "./components/CategoryChangeConfirmModal";

import {
  PRICE_UNITS_BY_CATEGORY,
} from "./constants";
import type {
  PropertyCategoryKey,
  BasicInfoData,
  ApartmentDetailsData,
  HouseDetailsData,
  RoomDetailsData,
  FurnishingAssetRow,
  MonthlyExpensesData,
  PricingData,
  FormErrors,
  SelectedMediaImage,
  SelectedMediaVideo,
} from "./types";

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function CreatePropertyListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const duplicateFrom = searchParams.get("duplicateFrom");
  const branchIdParam = searchParams.get("branchId");
  const isDuplicateMode = Boolean(duplicateFrom);
  const isEditMode = Boolean(editId && !duplicateFrom);
  const targetListingId = duplicateFrom || editId;

  const { profile } = useAuth();

  const [sourceListingTitle, setSourceListingTitle] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(Boolean(targetListingId));
  const [branches, setBranches] = useState<PropertyBranch[]>([]);
  const [rentedLockListing, setRentedLockListing] = useState<{ id: string; title: string } | null>(null);
  const [loadedListingStatus, setLoadedListingStatus] = useState<string | null>(null);

  // Section 1: Basic Info
  const [basicInfo, setBasicInfo] = useState<BasicInfoData>({
    title: "",
    images: [],
    videos: [],
    category: "apartment",
    availableDate: getTodayDateString(),
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
    entranceType: "PRIVATE",
    curfewType: "FREE",
    electricityMeter: "PRIVATE",
    waterMeter: "PRIVATE",
    maxOccupants: "2",
    maxVehicles: "2",
    parkingPolicy: "FREE",
  });

  // Section 2 (dùng chung 5 loại hình): bảng kiểm kê trang thiết bị bàn giao
  const [furnishingAssets, setFurnishingAssets] = useState<FurnishingAssetRow[]>([]);

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

  // Block unverified users from the listing form (Admin / verified pass)
  useEffect(() => {
    if (!profile) return;
    if (isKycSatisfied(profile)) return;
    requireKyc(profile, { router, redirect: true });
  }, [profile, router]);

  function handleSelectBranch(branchId: string, branchList = branches) {
    if (!branchId) {
      setBasicInfo((prev) => ({ ...prev, branchId: "" }));
      setMonthlyExpenses({
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
      });
      toast.info("Đã chuyển sang Bất động sản độc lập (bạn có thể tự nhập thủ công tất cả thông tin).");
      return;
    }

    const branch = branchList.find((b) => b.id === branchId);
    if (!branch) return;

    if (branch.category) {
      const mappedCategory = branch.category.toLowerCase() as PropertyCategoryKey;
      const defaultPriceUnit = PRICE_UNITS_BY_CATEGORY[mappedCategory]?.[0]?.value ?? "VND_MONTH";
      setBasicInfo((prev) => ({
        ...prev,
        branchId,
        category: mappedCategory,
      }));
      setPricing((prev) => ({
        ...prev,
        priceUnit: defaultPriceUnit,
      }));
    } else {
      setBasicInfo((prev) => ({ ...prev, branchId }));
    }

    if (branch.fullAddress || branch.streetLine) {
      setAddressMode("new");
      if (branch.provinceCode) {
        const pCodeStr = String(branch.provinceCode);
        setProvinceCode(pCodeStr);
        const foundP = provinces.find((p) => String(p.code) === pCodeStr);
        setProvinceQuery(branch.provinceName || (foundP ? foundP.name : ""));
        provinceService
          .getCurrentWardsByProvince(pCodeStr)
          .then((data) => {
            if (data && data.length) {
              setWards(data);
              setWardLoading(false);
            }
          })
          .catch(() => {});
      }
      if (branch.wardCode) {
        const wCodeStr = String(branch.wardCode);
        setWardCode(wCodeStr);
        const foundW = wards.find((w) => String(w.code) === wCodeStr);
        setWardQuery(branch.wardName || (foundW ? foundW.name : ""));
      }
      if (branch.streetLine) setStreetLine(branch.streetLine);

      setErrors((prev) => {
        const next = { ...prev };
        delete next.province;
        delete next.ward;
        delete next.streetLine;
        return next;
      });
    }

    // Initialize clean expenses state for branch (no lingering custom fees from other branches!)
    const isApartment = (branch.category ? branch.category.toLowerCase() : basicInfo.category) === "apartment";
    const newExpenses: MonthlyExpensesData = {
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
        newExpenses.electricityPrice = elec.amount ? String(elec.amount) : "";
        if (elec.includedInRent || elec.billingMethod === "INCLUDED") newExpenses.electricityType = "INCLUDED";
        else newExpenses.electricityType = "KWH";
      }

      const water = branch.defaultCharges.find((c) => c.chargeType === "WATER");
      if (water) {
        newExpenses.waterPrice = water.amount ? String(water.amount) : "";
        if (water.billingMethod === "PER_PERSON_MONTH") newExpenses.waterType = "PER_PERSON";
        else if (water.billingMethod === "PER_MONTH") newExpenses.waterType = "FLAT_ROOM";
        else if (water.includedInRent || water.billingMethod === "INCLUDED") newExpenses.waterType = "INCLUDED";
        else newExpenses.waterType = "M3";
      }

      const mgmt = branch.defaultCharges.find((c) => c.chargeType === "MANAGEMENT");
      if (isApartment && mgmt) {
        newExpenses.managementFee = mgmt.amount ? String(mgmt.amount) : "";
        if (mgmt.includedInRent || mgmt.billingMethod === "INCLUDED") newExpenses.managementFeeType = "INCLUDED";
        else if (mgmt.billingMethod === "PER_M2_MONTH") newExpenses.managementFeeType = "PER_M2";
        else if (mgmt.billingMethod === "NOT_APPLICABLE" || mgmt.billingMethod === "FREE") newExpenses.managementFeeType = "NONE";
        else newExpenses.managementFeeType = "MONTHLY";
      } else {
        newExpenses.managementFeeType = "NONE";
        newExpenses.managementFee = "";
      }

      const net = branch.defaultCharges.find((c) => c.chargeType === "INTERNET");
      if (net) {
        newExpenses.internetFee = net.amount ? String(net.amount) : "";
        if (net.includedInRent || net.billingMethod === "INCLUDED") newExpenses.internetType = "INCLUDED";
        else if (net.billingMethod === "NOT_APPLICABLE") newExpenses.internetType = "SELF_PAY";
        else newExpenses.internetType = "MONTHLY";
      }

      const garb = branch.defaultCharges.find(
        (c) => c.chargeType === "SERVICE_OR_GARBAGE" || c.chargeType === "GARBAGE" || c.chargeType === "CLEANING"
      );
      if (garb) {
        newExpenses.garbageFee = garb.amount ? String(garb.amount) : "";
        if (garb.includedInRent || garb.billingMethod === "INCLUDED") newExpenses.garbageFeeType = "INCLUDED";
        else if (garb.billingMethod === "NOT_APPLICABLE") newExpenses.garbageFeeType = "NONE";
        else newExpenses.garbageFeeType = "MONTHLY";
      }

      const moto = branch.defaultCharges.find((c) => c.chargeType === "MOTORBIKE_PARKING");
      if (moto) {
        newExpenses.motorbikeParkingFee = moto.amount ? String(moto.amount) : "";
        if (moto.billingMethod === "FREE" || moto.includedInRent || moto.billingMethod === "INCLUDED")
          newExpenses.motorbikeParkingType = "INCLUDED";
        else if (moto.billingMethod === "NOT_APPLICABLE") newExpenses.motorbikeParkingType = "NONE";
        else newExpenses.motorbikeParkingType = "PER_VEHICLE";
      }

      const car = branch.defaultCharges.find((c) => c.chargeType === "CAR_PARKING");
      if (car) {
        newExpenses.carParkingFee = car.amount ? String(car.amount) : "";
        if (car.billingMethod === "FREE" || car.includedInRent || car.billingMethod === "INCLUDED")
          newExpenses.carParkingType = "INCLUDED";
        else if (car.billingMethod === "NOT_APPLICABLE") newExpenses.carParkingType = "NONE";
        else newExpenses.carParkingType = "PER_VEHICLE";
      }

      const customOthers = branch.defaultCharges
        .filter((c) => c.chargeType === "OTHER")
        .map((c, idx) => ({
          id: c.id || `branch-fee-${idx}`,
          name: c.customName || "Phí dịch vụ khác",
          amount: c.amount ? String(c.amount) : "",
          unit: c.unit || "tháng",
        }));
      newExpenses.customFees = customOthers;
    }

    setMonthlyExpenses(newExpenses);

    if (branch.buildingRules && !basicInfo.description) {
      setBasicInfo((prev) => ({
        ...prev,
        description: `Nội quy & Quy định chung tòa nhà ${branch.name}:\n${branch.buildingRules}`,
      }));
    }

    if (branch.isComplete === false || (branch.missingCharges && branch.missingCharges.length > 0)) {
      toast.warning(
        `Chi nhánh "${branch.name}" chưa hoàn thiện biểu phí (${branch.missingCharges?.join(", ")}). Vui lòng cập nhật biểu phí chi nhánh trước khi đăng tin.`
      );
    } else {
      toast.info(`Đã áp dụng thông tin địa chỉ & biểu phí từ chi nhánh "${branch.name}"`);
    }
  }

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

  // Load existing listing data (for edit or duplicate mode) or branch
  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoadingDetail(Boolean(targetListingId));
      setLoadError(null);

      try {
        let branchList: PropertyBranch[] = [];
        try {
          branchList = await branchService.getMyBranches();
          if (active) setBranches(branchList);
        } catch (e) {
          console.warn("Could not load branches:", e);
        }

        if (targetListingId) {
          let detail: ListingDetailResponse;
          if (isDuplicateMode) {
            // Strictly fetch owner's listing - DO NOT fallback to public getById!
            detail = await listingService.getMyListingById(duplicateFrom!);
          } else {
            // Strictly fetch owner's listing for edit mode - DO NOT fallback to public getById!
              detail = await listingService.getMyListingById(editId!);
            // (no fallback)
            // public fallback removed
            // (end)
          }

          if (!active) return;

          setLoadedListingStatus(detail.status);

          if (isEditMode && String(detail.status || "").trim().toUpperCase() === "RENTED") {
            setRentedLockListing({ id: detail.id, title: detail.title });
            setIsLoadingDetail(false);
            return;
          }

          if (isDuplicateMode) {
            setSourceListingTitle(detail.title || "Tin gốc");
          }

          const formState = mapListingDetailToFormState(
            detail,
            isDuplicateMode ? "duplicate" : "edit",
            branchList,
            getTodayDateString()
          );

          setBasicInfo(formState.basicInfo);
          setApartmentDetails(formState.apartmentDetails);
          setHouseDetails(formState.houseDetails);
          setRoomDetails(formState.roomDetails);
          setFurnishingAssets(formState.furnishingAssets);
          setSelectedAmenities(formState.selectedAmenities);
          setMonthlyExpenses(formState.monthlyExpenses);
          setPricing(formState.pricing);
          setAddressMode(formState.addressMode);
          setStreetLine(formState.streetLine);
          setProvinceCode(formState.provinceCode);
          setProvinceQuery(formState.provinceQuery);
          setWardCode(formState.wardCode);
          setWardQuery(formState.wardQuery);
          setSelectedViewingDays(formState.selectedViewingDays);
          setSelectedViewingSlots(formState.selectedViewingSlots);

          if (formState.notice) {
            if (formState.notice.type === "warning") toast.warning(formState.notice.message);
            else if (formState.notice.type === "error") toast.error(formState.notice.message);
            else toast.info(formState.notice.message);
          }
        } else if (branchIdParam) {
          handleSelectBranch(branchIdParam, branchList);
        }
      } catch (err) {
        if (!active) return;
        console.error("Failed to load listing for new/edit/duplicate:", err);
        if (isDuplicateMode) {
          setLoadError(
            "Không thể nhân bản tin đăng này. Tin đăng không tồn tại hoặc bạn không có quyền sở hữu."
          );
        } else {
          setLoadError("Không tìm thấy tin đăng hoặc bạn không có quyền chỉnh sửa.");
        }
      } finally {
        if (active) setIsLoadingDetail(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetListingId, isDuplicateMode, editId, duplicateFrom, branchIdParam]);

  const selectedBranch = useMemo(
    () => branches.find((b) => b.id === basicInfo.branchId) ?? null,
    [branches, basicInfo.branchId]
  );

  const selectedProvince = useMemo(() => {
    const fromList = provinces.find(
      (p) =>
        String(p.code) === String(provinceCode) ||
        (provinceQuery && p.name.toLowerCase().trim() === provinceQuery.toLowerCase().trim())
    );
    if (fromList) return fromList;
    if (provinceCode || provinceQuery || selectedBranch?.provinceName) {
      return {
        code: provinceCode || selectedBranch?.provinceCode || "79",
        name: provinceQuery || selectedBranch?.provinceName || "Hồ Chí Minh",
      } as Province;
    }
    return undefined;
  }, [provinces, provinceCode, provinceQuery, selectedBranch?.provinceCode, selectedBranch?.provinceName]);

  const selectedWard = useMemo(() => {
    const fromList = wards.find(
      (w) =>
        String(w.code) === String(wardCode) ||
        (wardQuery && w.name.toLowerCase().trim() === wardQuery.toLowerCase().trim())
    );
    if (fromList) return fromList;
    if (wardCode || wardQuery || selectedBranch?.wardName) {
      return {
        code: wardCode || selectedBranch?.wardCode || "",
        name: wardQuery || selectedBranch?.wardName || "",
      } as Ward;
    }
    return undefined;
  }, [wards, wardCode, wardQuery, selectedBranch?.wardCode, selectedBranch?.wardName]);

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
    if (selectedBranch?.fullAddress) {
      return selectedBranch.fullAddress;
    }
    const street = streetLine.trim() || selectedBranch?.streetLine || "";
    const ward = selectedWard?.name || wardQuery || selectedBranch?.wardName || "";
    const prov = selectedProvince?.name || provinceQuery || selectedBranch?.provinceName || "";
    return [street, ward, prov].filter(Boolean).join(", ");
  }, [
    addressMode,
    savedUserAddress,
    selectedBranch,
    streetLine,
    selectedWard?.name,
    wardQuery,
    selectedProvince?.name,
    provinceQuery,
  ]);

  // Bàn giao thô được phép bỏ trống bảng thiết bị; mọi mức có nội thất đều phải
  // kê khai để dùng làm biên bản bàn giao trong hợp đồng.
  const isFurnishingRequired = useMemo(() => {
    switch (basicInfo.category) {
      case "apartment":
        return apartmentDetails.furnishing !== "RAW";
      case "house":
        return houseDetails.furnishing !== "RAW";
      case "room":
        return roomDetails.furnishing !== "RAW";
      default:
        return false;
    }
  }, [
    basicInfo.category,
    apartmentDetails.furnishing,
    houseDetails.furnishing,
    roomDetails.furnishing,
  ]);

  // Category change handler with confirmation
  function requestCategoryChange(newCategory: PropertyCategoryKey) {
    if (newCategory === basicInfo.category) return;
    setPendingCategory(newCategory);
    setIsCategoryModalOpen(true);
  }

  function applyCategoryChange(newCategory: PropertyCategoryKey) {
    const defaultPriceUnit = PRICE_UNITS_BY_CATEGORY[newCategory]?.[0]?.value ?? "VND_MONTH";

    setBasicInfo((prev) => ({
      ...prev,
      category: newCategory,
    }));

    setPricing((prev) => ({
      ...prev,
      priceUnit: defaultPriceUnit,
    }));

    // Catalog tiện ích và trang thiết bị khác nhau theo loại hình
    setSelectedAmenities([]);
    setFurnishingAssets([]);
    if (newCategory !== "apartment") {
      setMonthlyExpenses((prev) => ({
        ...prev,
        managementFeeType: "NONE",
        managementFee: "",
      }));
    }
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

    const todayStr = getTodayDateString();
    if (!basicInfo.availableDate) {
      addError(
        "field-available-date",
        "availableDate",
        "Vui lòng chọn ngày có thể vào thuê / bàn giao."
      );
    } else if (basicInfo.availableDate < todayStr) {
      addError(
        "field-available-date",
        "availableDate",
        "Ngày có thể vào thuê / bàn giao không được ở trong quá khứ."
      );
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
    } else if (basicInfo.category === "room") {
      if (!roomDetails.areaM2 || Number(roomDetails.areaM2) <= 0) {
        addError("field-room-area", "areaM2", "Diện tích phòng phải lớn hơn 0.");
      }
      if (!roomDetails.roomCode?.trim()) {
        addError("field-room-code", "roomCode", "Vui lòng nhập mã phòng / tên phòng.");
      }
      if (!roomDetails.maxOccupants || Number(roomDetails.maxOccupants) <= 0) {
        addError("field-room-occupants", "maxOccupants", "Số người ở tối đa phải lớn hơn 0.");
      }
    }

    // 2b. Bảng trang thiết bị bàn giao (dùng chung cho cả 5 loại hình)
    if (isFurnishingRequired && furnishingAssets.length === 0) {
      addError(
        "field-furnishing-assets",
        "furnishingAssets",
        "Vui lòng kê khai ít nhất một tài sản / trang thiết bị bàn giao."
      );
    }
    furnishingAssets.forEach((row, index) => {
      if (!row.assetName.trim()) {
        addError(
          "field-furnishing-assets",
          `furnishingAssets.${index}.assetName`,
          "Vui lòng nhập tên tài sản."
        );
      }
      if (!row.quantity || Number(row.quantity) < 1) {
        addError(
          "field-furnishing-assets",
          `furnishingAssets.${index}.quantity`,
          "Số lượng phải từ 1 trở lên."
        );
      }
    });

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
    if (basicInfo.branchId && selectedBranch) {
      // Khi chọn chi nhánh, địa chỉ kế thừa từ chi nhánh đã chọn
      const hasProv = Boolean(provinceCode || selectedBranch.provinceCode || selectedBranch.provinceName);
      const hasWard = Boolean(wardCode || selectedBranch.wardCode || selectedBranch.wardName);
      const hasStreet = Boolean(streetLine.trim() || selectedBranch.streetLine || selectedBranch.fullAddress);
      if (!hasProv) {
        addError("field-province", "province", "Chi nhánh chưa có thông tin Tỉnh / Thành phố.");
      }
      if (!hasWard) {
        addError("field-ward", "ward", "Chi nhánh chưa có thông tin Phường / Xã.");
      }
      if (!hasStreet) {
        addError("field-street-line", "streetLine", "Chi nhánh chưa có địa chỉ cụ thể.");
      }
    } else if (addressMode === "new") {
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
  const [submittingAction, setSubmittingAction] = useState<ListingSubmissionAction | null>(null);

  async function handleSaveListing(action: ListingSubmissionAction) {
    if (isSubmitting) return;
    if (!requireKyc(profile, { router, redirect: true })) return;
    if (
      isEditMode &&
      (String(loadedListingStatus || "").trim().toUpperCase() === "RENTED" || rentedLockListing)
    ) {
      toast.error("Tin đã cho thuê qua HomeSpace, không thể chỉnh sửa hoặc gửi duyệt lại.");
      return;
    }

    const isValid = validateAllFields();
    if (!isValid) return;

    if (selectedBranch && (selectedBranch.isComplete === false || (selectedBranch.missingCharges && selectedBranch.missingCharges.length > 0))) {
      toast.error(
        `Không thể gửi hoặc lưu tin đăng vì biểu phí của chi nhánh "${selectedBranch.name}" chưa hoàn thiện (còn thiếu: ${selectedBranch.missingCharges?.join(", ")}). Vui lòng cập nhật biểu phí chi nhánh trước.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmittingAction(action);
      const loadingText =
        action === "SAVE_DRAFT"
          ? (isDuplicateMode ? "Đang lưu bản sao dưới dạng nháp..." : "Đang lưu tin nháp...")
          : isDuplicateMode
          ? "Đang nhân bản tin và gửi duyệt..."
          : isEditMode
          ? "Đang cập nhật và gửi duyệt..."
          : "Đang xử lý tải hình ảnh và gửi duyệt...";
      toast.loading(loadingText, { id: "submit-listing" });

      // 1. Upload media files if new
      const uploadedMediaList: {
        storageObjectId?: string;
        sourceMediaId?: string;
        mediaType: "IMAGE" | "VIDEO";
      }[] = [];

      for (const [index, img] of basicInfo.images.entries()) {
        if (img.sourceMediaId) {
          // Keep source media reference for duplicate mode
          uploadedMediaList.push({ sourceMediaId: img.sourceMediaId, mediaType: "IMAGE" });
        } else if (img.storageObjectId) {
          uploadedMediaList.push({ storageObjectId: img.storageObjectId, mediaType: "IMAGE" });
        } else if (img.file) {
          const storageId = await storageService.uploadListingMedia(img.file);
          uploadedMediaList.push({ storageObjectId: storageId, mediaType: "IMAGE" });
          setBasicInfo((current) => ({
            ...current,
            images: current.images.map((item, itemIndex) =>
              itemIndex === index ? { ...item, storageObjectId: storageId } : item,
            ),
          }));
        }
      }

      for (const [index, vid] of basicInfo.videos.entries()) {
        if (vid.sourceMediaId) {
          // Keep source media reference for duplicate mode
          uploadedMediaList.push({ sourceMediaId: vid.sourceMediaId, mediaType: "VIDEO" });
        } else if (vid.storageObjectId) {
          uploadedMediaList.push({ storageObjectId: vid.storageObjectId, mediaType: "VIDEO" });
        } else if (vid.file) {
          const storageId = await storageService.uploadListingMedia(vid.file);
          uploadedMediaList.push({ storageObjectId: storageId, mediaType: "VIDEO" });
          setBasicInfo((current) => ({
            ...current,
            videos: current.videos.map((item, itemIndex) =>
              itemIndex === index ? { ...item, storageObjectId: storageId } : item,
            ),
          }));
        }
      }

      // 2. Build payload (upsert with id if editing; duplicate mode ALWAYS has id = null)
      const payload = buildCreateListingPayload({
        id: isDuplicateMode ? null : (editId || null),
        duplicateSourceListingId: isDuplicateMode ? duplicateFrom : null,
        submissionAction: action,
        basicInfo,
        apartmentDetails,
        houseDetails,
        roomDetails,
        furnishingAssets,
        selectedAmenities,
        catalogAmenityCodes: listingOptions.amenities.map((item) => item.code),
        monthlyExpenses,
        pricing,
        addressMode,
        savedAddressId: savedUserAddress?.id,
        provinceCode: provinceCode || selectedBranch?.provinceCode || "79",
        provinceName: selectedProvince?.name || provinceQuery || selectedBranch?.provinceName || "Hồ Chí Minh",
        wardCode: wardCode || selectedBranch?.wardCode || "",
        wardName: selectedWard?.name || wardQuery || selectedBranch?.wardName || "",
        streetLine: streetLine || selectedBranch?.streetLine || "",
        fullAddress: previewFullAddress || selectedBranch?.fullAddress || "",
        uploadedMediaList,
        selectedViewingDays,
        selectedViewingSlots,
      });

      // 3. Call backend upsert API
      await listingService.upsert(payload);

      const successMessage =
        action === "SAVE_DRAFT"
          ? (isDuplicateMode ? "Đã lưu bản sao dưới dạng tin nháp" : "Đã lưu tin nháp")
          : isDuplicateMode
          ? "Bản sao tin đăng đã được tạo và gửi chờ duyệt"
          : isEditMode
          ? "Tin đăng đã được cập nhật và gửi duyệt"
          : "Tin đã được gửi chờ duyệt";
      toast.success(successMessage, { id: "submit-listing" });
      router.push("/dashboard/properties");
    } catch (error: unknown) {
      console.error("Submit listing error:", error);
      const serverMessage = getApiErrorMessage(
        error,
        "Thao tác thất bại. Vui lòng kiểm tra lại kết nối và thử lại."
      );
      toast.error(serverMessage, { id: "submit-listing" });

      if (isEditMode && axios.isAxiosError(error) && error.response?.status === 409) {
        setLoadedListingStatus("RENTED");
        setRentedLockListing({ id: editId!, title: basicInfo.title || "Tin đăng" });
      }
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
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
    const furnishingSlot = (
      <div id="field-furnishing-assets" className="sm:col-span-2">
        <FurnishingAssetsSection
          rows={furnishingAssets}
          errors={errors}
          required={isFurnishingRequired}
          furnishingOptions={listingOptions.furnishings}
          onChange={setFurnishingAssets}
        />
      </div>
    );

    switch (basicInfo.category) {
      case "apartment":
        return (
          <ApartmentDetailsSection
            data={apartmentDetails}
            errors={errors}
            onChange={(updates) =>
              setApartmentDetails((prev) => ({ ...prev, ...updates }))
            }
            furnishingSlot={furnishingSlot}
          />
        );
      case "house":
        return (
          <HouseDetailsSection
            data={houseDetails}
            errors={errors}
            onChange={(updates) =>
              setHouseDetails((prev) => ({ ...prev, ...updates }))
            }
            furnishingSlot={furnishingSlot}
          />
        );

      case "room":
        return (
          <RoomDetailsSection
            data={roomDetails}
            errors={errors}
            onChange={(updates) =>
              setRoomDetails((prev) => ({ ...prev, ...updates }))
            }
            furnishingSlot={furnishingSlot}
          />
        );
      default:
        return null;
    }
  }

  if (rentedLockListing) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center space-y-5 animate-in fade-in-50 duration-200">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            Tin đăng đã cho thuê qua HomeSpace
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tin đăng <span className="font-semibold text-foreground">&quot;{rentedLockListing.title}&quot;</span> đã cho thuê và đang gắn liền với hợp đồng thuê trên hệ thống HomeSpace nên không thể chỉnh sửa nội dung, lưu nháp hoặc gửi duyệt lại.
          </p>
        </div>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard/properties")}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-all"
          >
            Quay lại danh sách tin
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/properties/view?id=${rentedLockListing.id}`)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted transition-all"
          >
            Xem chi tiết tin
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/properties/new?duplicateFrom=${rentedLockListing.id}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
          >
            <Copy className="h-4 w-4" />
            Nhân bản thành tin mới
          </button>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Không thể tải dữ liệu tin đăng</h2>
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/properties")}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            Quay lại danh sách tin đăng
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-9 w-9 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">
          {isDuplicateMode
            ? "Đang nạp dữ liệu từ tin đăng gốc để nhân bản..."
            : "Đang tải thông tin tin đăng để chỉnh sửa..."}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {isDuplicateMode
            ? "Nhân bản tin đăng"
            : isEditMode
            ? "Chỉnh sửa tin đăng"
            : "Đăng tin cho thuê"}
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {isDuplicateMode
            ? "Xem lại và điều chỉnh thông tin cần thiết (mã phòng, tầng, giá, ảnh...) để tạo tin mới nhanh chóng."
            : isEditMode
            ? "Cập nhật lại các thông tin của tin đăng để đảm bảo tính chính xác và thu hút khách thuê."
            : "Nhập đầy đủ thông tin để tạo tin đăng cho thuê chuyên nghiệp và tiếp cận hàng ngàn khách hàng tiềm năng."}
        </p>
      </div>

      {/* Duplicate Mode Banner */}
      {isDuplicateMode && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-blue-900 shadow-2xs dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shrink-0">
              <Copy className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold">
                Đang tạo tin mới từ &quot;{sourceListingTitle || "Tin gốc"}&quot;
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Tin gốc sẽ không thay đổi. Tin mới chỉ được tạo khi bạn bấm &quot;Lưu nháp&quot; hoặc &quot;Gửi duyệt&quot;.
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-6">
        {/* Section 1: Thông tin cơ bản */}
        <BasicInfoSection
          data={basicInfo}
          branches={branches}
          errors={errors}
          isBranchSelected={Boolean(basicInfo.branchId)}
          onChange={(updates) => setBasicInfo((prev) => ({ ...prev, ...updates }))}
          onSelectBranch={handleSelectBranch}
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
          isBranchSelected={Boolean(basicInfo.branchId)}
          selectedBranch={selectedBranch}
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
          isBranchSelected={Boolean(basicInfo.branchId)}
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
          onSaveDraft={() => handleSaveListing("SAVE_DRAFT")}
          onSubmitForReview={() => handleSaveListing("SUBMIT_FOR_REVIEW")}
          isSubmitting={isSubmitting}
          submittingAction={submittingAction}
          isEditing={isEditMode}
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
