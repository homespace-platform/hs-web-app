"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
} from "./types";

export default function CreatePropertyListingPage() {
  const router = useRouter();
  const { profile } = useAuth();

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

  // Section 3: Amenities (Không tự check mặc định)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [listingOptions, setListingOptions] = useState<ListingOptionsResponse>({
    category: "APARTMENT",
    amenities: [],
    furnishings: [],
  });

  useEffect(() => {
    const categoryMap = {
      apartment: "APARTMENT",
      house: "HOUSE",
      office: "OFFICE",
      commercial: "COMMERCIAL_SPACE",
      room: "ROOM",
    } as const;
    let active = true;
    listingService.getPublicOptions(categoryMap[basicInfo.category])
      .then((options) => { if (active) setListingOptions(options); })
      .catch(() => { if (active) setListingOptions((current) => ({ ...current, amenities: [], furnishings: [] })); });
    return () => { active = false; };
  }, [basicInfo.category]);

  // Section 4: Monthly Expenses
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpensesData>({
    electricityType: "KWH",
    electricityPrice: "3500",
    waterType: "M3",
    waterPrice: "25000",
    managementFeeType: "MONTHLY",
    managementFee: "500000",
    internetType: "INCLUDED",
    internetFee: "",
    garbageFeeType: "INCLUDED",
    garbageFee: "",
    motorbikeParkingType: "INCLUDED",
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
        const defaultProvince =
          data.find((province) => String(province.code) === "79") ?? data[0];
        setProvinceCode(String(defaultProvince?.code ?? ""));
        setProvinceQuery(defaultProvince?.name ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setLocationError("Không tải được danh sách tỉnh/thành. Vui lòng thử lại sau.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch wards
  useEffect(() => {
    if (!provinceCode) return;
    let cancelled = false;

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
    toast.success("Đã cập nhật loại hình cho thuê");
  }

  function handleProvinceSelect(province: Province) {
    setProvinceCode(String(province.code));
    setProvinceQuery(province.name);
    setWardCode("");
    setWardQuery("");
    setWards([]);
    setWardLoading(true);
    setLocationError("");
  }

  function handleWardSelect(ward: Ward) {
    setWardCode(String(ward.code));
    setWardQuery(ward.name);
  }

  // Scroll to element helper
  function scrollToField(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // Validation function
  function validateAllFields(): boolean {
    const newErrors: FormErrors = {};
    let firstErrorId = "";

    function addError(fieldId: string, errorKey: string, message: string) {
      newErrors[errorKey] = message;
      if (!firstErrorId) {
        firstErrorId = fieldId;
      }
    }

    // 1. Basic Info
    if (!basicInfo.title.trim() || basicInfo.title.trim().length < 10) {
      addError("field-title", "title", "Tiêu đề phải có ít nhất 10 ký tự.");
    }
    if (basicInfo.images.length === 0) {
      addError("field-images", "images", "Vui lòng tải lên ít nhất 1 hình ảnh.");
    }
    if (!basicInfo.subtype) {
      addError("field-subtype", "subtype", "Vui lòng chọn loại chi tiết.");
    }
    if (!basicInfo.rentalType) {
      addError("field-rental-type", "rentalType", "Vui lòng chọn hình thức cho thuê.");
    }
    if (!basicInfo.availableDate) {
      addError("field-available-date", "availableDate", "Vui lòng chọn ngày có thể vào thuê.");
    }
    if (!basicInfo.description.trim()) {
      addError("field-description", "description", "Vui lòng nhập mô tả chi tiết.");
    }

    // 2. Category Specific Details
    switch (basicInfo.category) {
      case "apartment": {
        if (!apartmentDetails.projectName.trim()) {
          addError("field-project-name", "projectName", "Vui lòng nhập tên dự án/chung cư.");
        }
        const area = Number(apartmentDetails.areaM2);
        if (!area || area <= 0) {
          addError("field-area-m2", "areaM2", "Diện tích phải lớn hơn 0 m².");
        }
        if (apartmentDetails.floor === "" || Number(apartmentDetails.floor) < 0) {
          addError("field-floor", "floor", "Vui lòng nhập tầng căn hộ.");
        }
        const isStudio = basicInfo.subtype === "studio";
        const beds = Number(apartmentDetails.bedrooms);
        if (apartmentDetails.bedrooms === "" || (isStudio ? beds < 0 : beds < 1)) {
          addError("field-bedrooms", "bedrooms", isStudio ? "Số phòng ngủ không hợp lệ (>= 0)." : "Vui lòng nhập số phòng ngủ (>= 1).");
        }
        const baths = Number(apartmentDetails.bathrooms);
        if (apartmentDetails.bathrooms === "" || baths < 1) {
          addError("field-bathrooms", "bathrooms", "Vui lòng nhập số phòng tắm / WC (>= 1).");
        }
        break;
      }

      case "house": {
        const usableArea = Number(houseDetails.totalUsableAreaM2);
        if (!usableArea || usableArea <= 0) {
          addError("field-total-usable-area", "totalUsableAreaM2", "Tổng diện tích sử dụng phải lớn hơn 0 m².");
        }
        const totalFloors = Number(houseDetails.totalFloors);
        if (!totalFloors || totalFloors < 1) {
          addError("field-total-floors", "totalFloors", "Tổng số tầng phải từ 1 trở lên.");
        }
        const beds = Number(houseDetails.bedrooms);
        if (houseDetails.bedrooms === "" || beds < 1) {
          addError("field-bedrooms", "bedrooms", "Vui lòng nhập số phòng ngủ (>= 1).");
        }
        const baths = Number(houseDetails.bathrooms);
        if (houseDetails.bathrooms === "" || baths < 1) {
          addError("field-bathrooms", "bathrooms", "Vui lòng nhập số phòng tắm / WC (>= 1).");
        }
        break;
      }

      case "office": {
        if (basicInfo.subtype === "traditional_office" && !officeDetails.buildingName?.trim()) {
          addError("field-building-name", "buildingName", "Văn phòng truyền thống bắt buộc nhập tên tòa nhà.");
        }
        const area = Number(officeDetails.rentalAreaM2);
        if (!area || area <= 0) {
          addError("field-rental-area", "rentalAreaM2", "Diện tích cho thuê phải lớn hơn 0 m².");
        }
        if (!officeDetails.rentalFloor || String(officeDetails.rentalFloor).trim() === "") {
          addError("field-rental-floor", "rentalFloor", "Vui lòng nhập tầng cho thuê.");
        }
        break;
      }

      case "commercial": {
        const area = Number(commercialDetails.areaM2);
        if (!area || area <= 0) {
          addError("field-commercial-area", "areaM2", "Diện tích mặt bằng phải lớn hơn 0 m².");
        }
        const isFacadeRequired =
          basicInfo.subtype === "shop" ||
          basicInfo.subtype === "showroom" ||
          basicInfo.subtype === "shophouse";
        const facade = Number(commercialDetails.facadeWidthM);
        if (isFacadeRequired && (!facade || facade <= 0)) {
          addError("field-facade-width", "facadeWidthM", "Chiều ngang mặt tiền bắt buộc đối với loại hình này.");
        }
        break;
      }

      case "room": {
        const area = Number(roomDetails.areaM2);
        if (!area || area <= 0) {
          addError("field-room-area", "areaM2", "Diện tích phòng phải lớn hơn 0 m².");
        }
        const occupants = Number(roomDetails.maxOccupants);
        if (!occupants || occupants < 1) {
          addError("field-max-occupants", "maxOccupants", "Vui lòng nhập số người ở tối đa (>= 1).");
        }
        break;
      }
    }

    // 3. Pricing & Conditions
    const price = Number(pricing.priceMonthly);
    if (!price || price <= 0) {
      addError("field-price-monthly", "priceMonthly", "Vui lòng nhập giá thuê hợp lệ (> 0).");
    }
    if (pricing.depositType === "AMOUNT") {
      const deposit = Number(pricing.depositAmount);
      if (!deposit || deposit < 0) {
        addError("field-deposit-amount", "depositAmount", "Vui lòng nhập số tiền cọc hợp lệ.");
      }
    }
    if (pricing.depositType === "MONTHS") {
      const months = Number(pricing.depositMonths);
      if (!months || months <= 0) {
        addError("field-deposit-months", "depositMonths", "Vui lòng nhập số tháng cọc hợp lệ.");
      }
    }
    const minLease = Number(pricing.minimumLeaseMonths);
    if (!minLease || minLease < 1) {
      addError("field-minimum-lease", "minimumLeaseMonths", "Thời hạn thuê tối thiểu phải từ 1 tháng trở lên.");
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

    setErrors(newErrors);

    if (firstErrorId) {
      scrollToField(firstErrorId);
      const firstErrorMessage = Object.values(newErrors)[0];
      toast.error(firstErrorMessage || "Vui lòng kiểm tra lại các trường thông tin bị lỗi.");
      return false;
    }

    return true;
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmitListing() {
    const isValid = validateAllFields();
    if (!isValid) return;

    try {
      setIsSubmitting(true);
      toast.loading("Đang xử lý tải hình ảnh và đăng tin...", { id: "submit-listing" });

      // 1. Upload media files if any
      const uploadedMediaList: { storageObjectId: string; mediaType: "IMAGE" | "VIDEO" }[] = [];

      for (const img of basicInfo.images) {
        if (img.file) {
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
        if (vid.file) {
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

      // 2. Build payload
      const payload = buildCreateListingPayload({
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
      });

      // 3. Call backend API
      await listingService.create(payload);

      toast.success("Đăng tin cho thuê thành công!", { id: "submit-listing" });
      router.push("/dashboard/properties");
    } catch (error: unknown) {
      console.error("Submit listing error:", error);
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      const serverMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Đăng tin thất bại. Vui lòng kiểm tra lại kết nối và thử lại.";
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

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Đăng tin cho thuê
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Nhập đầy đủ thông tin để tạo tin đăng cho thuê chuyên nghiệp và tiếp cận hàng ngàn khách hàng tiềm năng.
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

        {/* Section 8: Hành động cuối form */}
        <FormActions
          onCancel={() => router.back()}
          onValidateForm={handleTestValidation}
          onSubmit={handleSubmitListing}
          isSubmitting={isSubmitting}
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
