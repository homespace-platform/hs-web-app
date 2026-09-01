"use client";

import React, { useState, useEffect } from "react";
import {
  Home,
  RotateCcw,
  Bed,
  Banknote,
  Maximize2,
  Search,
  Layers,
  Armchair,
  Compass,
  Award,
  Building,
  Bath,
  Warehouse,
  UtensilsCrossed,
  KeyRound,
  FileText,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export interface FilterState {
  category: string;
  subtype: string;
  minPrice: number; // in Millions
  maxPrice: number; // in Millions
  areaRange: string;
  district: string;
  beds: string;
  baths: string;
  furnishingStatus: string;
  direction: string;
  balconyDirection: string;
  officeGrade: string;
  positionType: string;
  restroomType: string;
  kitchenType: string;
  accessType: string;
  legalStatus: string;
  hasMezzanine: boolean;
  hasRooftop: boolean;
  hasGarage: boolean;
  tab: "all" | "owner" | "verified";
  hasVideoOnly: boolean;
  sortBy: "newest" | "price_asc" | "price_desc" | "area_desc";
  viewMode: "collage" | "grid";
  searchQuery: string;
}

interface RentFilterSidebarProps {
  filter: FilterState;
  onApply: (newFilter: FilterState) => void;
  onReset: () => void;
  totalResultsCount: number;
}

export const RENT_CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "apartment", label: "Căn hộ/Chung cư" },
  { id: "house", label: "Nhà ở" },
  { id: "office", label: "Văn phòng" },
  { id: "commercial", label: "Mặt bằng kinh doanh" },
  { id: "studio", label: "Studio" },
  { id: "room", label: "Phòng trọ" },
];

export const CATEGORY_SUBTYPES: Record<string, { id: string; label: string }[]> = {
  apartment: [
    { id: "all", label: "Tất cả căn hộ" },
    { id: "APARTMENT_STANDARD", label: "Căn hộ thường" },
    { id: "APARTMENT_STUDIO", label: "Studio" },
    { id: "APARTMENT_DUPLEX", label: "Duplex" },
    { id: "APARTMENT_PENTHOUSE", label: "Penthouse" },
    { id: "APARTMENT_OFFICETEL", label: "Officetel" },
    { id: "APARTMENT_OTHER", label: "Loại khác" },
  ],
  house: [
    { id: "all", label: "Tất cả nhà ở" },
    { id: "HOUSE_TOWNHOUSE", label: "Nhà phố" },
    { id: "HOUSE_ALLEY", label: "Nhà trong hẻm" },
    { id: "HOUSE_VILLA", label: "Biệt thự" },
    { id: "HOUSE_GRADE_4", label: "Nhà cấp 4" },
    { id: "HOUSE_OTHER", label: "Loại khác" },
  ],
  office: [
    { id: "all", label: "Tất cả văn phòng" },
    { id: "OFFICE_TRADITIONAL", label: "Văn phòng truyền thống" },
    { id: "OFFICE_SERVICED", label: "Văn phòng dịch vụ" },
    { id: "OFFICE_COWORKING", label: "Coworking" },
    { id: "OFFICE_SHARED", label: "Văn phòng chia sẻ" },
    { id: "OFFICE_OTHER", label: "Loại khác" },
  ],
  commercial: [
    { id: "all", label: "Tất cả mặt bằng" },
    { id: "COMMERCIAL_STORE", label: "Cửa hàng" },
    { id: "COMMERCIAL_KIOSK", label: "Ki-ốt" },
    { id: "COMMERCIAL_SHOWROOM", label: "Showroom" },
    { id: "COMMERCIAL_SHOPHOUSE", label: "Shophouse" },
    { id: "COMMERCIAL_MALL", label: "Trong TTTM" },
    { id: "COMMERCIAL_OTHER", label: "Loại khác" },
  ],
  room: [
    { id: "all", label: "Tất cả phòng" },
    { id: "ROOM_BOARDING", label: "Phòng trọ" },
    { id: "ROOM_IN_HOUSE", label: "Phòng trong nhà" },
    { id: "ROOM_SERVICED_APARTMENT", label: "Căn hộ dịch vụ" },
    { id: "ROOM_DORMITORY", label: "Ký túc xá" },
    { id: "ROOM_OTHER", label: "Loại khác" },
  ],
};

const AREA_BUTTONS = [
  { id: "all", label: "Tất cả diện tích" },
  { id: "under_30", label: "Dưới 30 m²" },
  { id: "30_50", label: "30 - 50 m²" },
  { id: "50_80", label: "50 - 80 m²" },
  { id: "80_100", label: "80 - 100 m²" },
  { id: "100_150", label: "100 - 150 m²" },
  { id: "150_200", label: "150 - 200 m²" },
  { id: "200_250", label: "200 - 250 m²" },
  { id: "over_250", label: "Trên 250 m²" },
];

const BEDS_ITEMS = [
  { id: "all", label: "Tất cả" },
  { id: "1", label: "1 PN" },
  { id: "2", label: "2 PN" },
  { id: "3", label: "3+ PN" },
];

const BATHS_ITEMS = [
  { id: "all", label: "Tất cả" },
  { id: "1", label: "1 WC" },
  { id: "2", label: "2 WC" },
  { id: "3", label: "3+ WC" },
];

const FURNISHING_ITEMS = [
  { id: "all", label: "Tất cả" },
  { id: "UNFURNISHED", label: "Bàn giao thô" },
  { id: "BASIC", label: "Nội thất cơ bản" },
  { id: "FULLY_FURNISHED", label: "Đầy đủ nội thất" },
];

const DIRECTION_ITEMS = [
  { id: "all", label: "Tất cả hướng" },
  { id: "EAST", label: "Đông" },
  { id: "WEST", label: "Tây" },
  { id: "SOUTH", label: "Nam" },
  { id: "NORTH", label: "Bắc" },
  { id: "SOUTH_EAST", label: "Đông Nam" },
  { id: "NORTH_EAST", label: "Đông Bắc" },
  { id: "SOUTH_WEST", label: "Tây Nam" },
  { id: "NORTH_WEST", label: "Tây Bắc" },
];

const OFFICE_GRADE_ITEMS = [
  { id: "all", label: "Tất cả hạng" },
  { id: "GRADE_A", label: "Hạng A" },
  { id: "GRADE_B", label: "Hạng B" },
  { id: "GRADE_C", label: "Hạng C" },
  { id: "ECONOMY", label: "Tiết kiệm" },
];

const POSITION_TYPE_ITEMS = [
  { id: "all", label: "Tất cả vị trí" },
  { id: "GROUND_FLOOR", label: "Mặt đất / Trệt" },
  { id: "UPPER_FLOOR", label: "Tầng lầu" },
  { id: "SHOPPING_MALL", label: "Trong TTTM" },
];

const RESTROOM_TYPE_ITEMS = [
  { id: "all", label: "Tất cả" },
  { id: "PRIVATE", label: "Khép kín (Riêng)" },
  { id: "SHARED", label: "Dùng chung" },
];

const KITCHEN_ITEMS = [
  { id: "all", label: "Tất cả" },
  { id: "PRIVATE", label: "Bếp riêng" },
  { id: "SHARED", label: "Bếp chung" },
  { id: "NONE", label: "Không nấu ăn" },
];

const ACCESS_ITEMS = [
  { id: "all", label: "Tất cả" },
  { id: "PRIVATE", label: "Lối đi riêng" },
  { id: "SHARED", label: "Đi chung" },
];

const LEGAL_ITEMS = [
  { id: "all", label: "Tất cả" },
  { id: "PINK_BOOK", label: "Sổ hồng / Sổ đỏ" },
  { id: "CONTRACT", label: "Hợp đồng mua bán" },
  { id: "PENDING", label: "Đang chờ cấp sổ" },
];

const PRICE_PRESETS = [0, 5, 10, 20, 40, 70, 100];

export default function RentFilterSidebar({
  filter,
  onApply,
  onReset,
  totalResultsCount,
}: RentFilterSidebarProps) {
  // Staged / Draft state (CHỈ gửi API khi ấn "Áp dụng bộ lọc" để tránh quá tải CSDL)
  const [draft, setDraft] = useState<FilterState>(filter);

  // Sync draft when external filter changes
  useEffect(() => {
    setDraft(filter);
  }, [filter]);

  // Handle category change: update category and reset sub-filters
  const handleCategoryChange = (catId: string) => {
    setDraft((prev) => {
      let nextSubtype = "all";
      let nextBeds = prev.beds;

      if (catId === "studio") {
        nextSubtype = "APARTMENT_STUDIO";
      }

      if (catId === "office" || catId === "commercial" || catId === "room") {
        nextBeds = "all";
      }

      return {
        ...prev,
        category: catId,
        subtype: nextSubtype,
        beds: nextBeds,
        baths: "all",
        furnishingStatus: "all",
        direction: "all",
        balconyDirection: "all",
        officeGrade: "all",
        positionType: "all",
        restroomType: "all",
        kitchenType: "all",
        accessType: "all",
        legalStatus: "all",
        hasMezzanine: false,
        hasRooftop: false,
        hasGarage: false,
      };
    });
  };

  // Subtypes for current category
  const activeSubtypes =
    draft.category === "studio"
      ? CATEGORY_SUBTYPES.apartment
      : CATEGORY_SUBTYPES[draft.category] || null;

  // Determine visibility of category-specific filters
  const showBedroomFilter =
    draft.category === "all" ||
    draft.category === "apartment" ||
    draft.category === "house" ||
    draft.category === "studio";

  const showBathroomFilter =
    draft.category === "all" ||
    draft.category === "apartment" ||
    draft.category === "house" ||
    draft.category === "office";

  const showFurnishingFilter =
    draft.category === "apartment" ||
    draft.category === "house" ||
    draft.category === "room" ||
    draft.category === "studio";

  const showDirectionFilter =
    draft.category === "apartment" || draft.category === "studio";

  const showLegalFilter =
    draft.category === "apartment" || draft.category === "house";

  const showHouseFeatures = draft.category === "house";
  const showOfficeFeatures = draft.category === "office";
  const showCommercialFeatures = draft.category === "commercial";
  const showRoomFeatures = draft.category === "room";

  // Calculate active draft filters count for badge
  let activeFilterCount = 0;
  if (draft.category !== "all") activeFilterCount++;
  if (draft.subtype && draft.subtype !== "all") activeFilterCount++;
  if (draft.minPrice > 0 || draft.maxPrice < 100) activeFilterCount++;
  if (draft.areaRange !== "all") activeFilterCount++;
  if (draft.beds !== "all") activeFilterCount++;
  if (draft.baths !== "all") activeFilterCount++;
  if (draft.furnishingStatus && draft.furnishingStatus !== "all") activeFilterCount++;
  if (draft.direction && draft.direction !== "all") activeFilterCount++;
  if (draft.balconyDirection && draft.balconyDirection !== "all") activeFilterCount++;
  if (draft.officeGrade && draft.officeGrade !== "all") activeFilterCount++;
  if (draft.positionType && draft.positionType !== "all") activeFilterCount++;
  if (draft.restroomType && draft.restroomType !== "all") activeFilterCount++;
  if (draft.kitchenType && draft.kitchenType !== "all") activeFilterCount++;
  if (draft.accessType && draft.accessType !== "all") activeFilterCount++;
  if (draft.legalStatus && draft.legalStatus !== "all") activeFilterCount++;
  if (draft.hasMezzanine) activeFilterCount++;
  if (draft.hasRooftop) activeFilterCount++;
  if (draft.hasGarage) activeFilterCount++;

  const handleSliderChange = (vals: number[]) => {
    if (vals.length === 2) {
      setDraft((prev) => ({
        ...prev,
        minPrice: vals[0],
        maxPrice: vals[1],
      }));
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-3xl border border-border overflow-hidden shadow-sm flex flex-col max-h-[calc(100vh-120px)] transition-all">
      {/* Scrollable Body */}
      <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 no-scrollbar">
        {/* 1. Loại phòng & nhà */}
        <div>
          <div className="flex items-center gap-2 mb-3.5">
            <Home className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Loại phòng & nhà
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {RENT_CATEGORIES.map((item) => {
              const isSelected = draft.category === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleCategoryChange(item.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25 scale-[1.03]"
                      : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/70"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 1.1 Thuộc tính con: Loại chi tiết (Subtypes) */}
        {activeSubtypes && activeSubtypes.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-2.5 animate-in fade-in-50 duration-200">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                {draft.category === "apartment" || draft.category === "studio"
                  ? "Loại căn hộ chi tiết"
                  : draft.category === "house"
                  ? "Kiểu nhà ở"
                  : draft.category === "office"
                  ? "Loại hình văn phòng"
                  : draft.category === "commercial"
                  ? "Loại mặt bằng"
                  : "Loại phòng trọ"}
              </h4>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {activeSubtypes.map((sub) => {
                const isSelected = draft.subtype === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, subtype: sub.id }))
                    }
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all duration-150 cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-xs scale-[1.02]"
                        : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Khoảng giá thuê */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Khoảng giá thuê
              </h3>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              (đ/tháng)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="p-2.5 sm:p-3 rounded-2xl border border-border bg-background shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all text-center">
              <label className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                Tối thiểu
              </label>
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={draft.maxPrice}
                  value={draft.minPrice === 0 ? "" : draft.minPrice}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : Number(e.target.value);
                    if (val >= 0 && val <= 100) {
                      setDraft((prev) => ({ ...prev, minPrice: val }));
                    }
                  }}
                  placeholder="0"
                  className="w-10 text-center font-heading font-extrabold text-sm sm:text-base text-primary bg-transparent focus:outline-none placeholder:text-primary/40 no-spinner"
                />
                <span className="font-heading font-bold text-xs sm:text-sm text-primary">
                  triệu
                </span>
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-2xl border border-border bg-background shadow-2xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all text-center">
              <label className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-0.5">
                Tối đa
              </label>
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  min={draft.minPrice}
                  max={100}
                  value={draft.maxPrice >= 100 ? "" : draft.maxPrice}
                  onChange={(e) => {
                    const val = e.target.value === "" ? 100 : Number(e.target.value);
                    if (val >= 0 && val <= 100) {
                      setDraft((prev) => ({ ...prev, maxPrice: val }));
                    }
                  }}
                  placeholder="100+"
                  className="w-10 text-center font-heading font-extrabold text-sm sm:text-base text-primary bg-transparent focus:outline-none placeholder:text-primary/40 no-spinner"
                />
                <span className="font-heading font-bold text-xs sm:text-sm text-primary">
                  triệu
                </span>
              </div>
            </div>
          </div>

          <div className="px-2 pt-3 pb-1">
            <Slider
              value={[draft.minPrice, draft.maxPrice]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleSliderChange}
              className="my-3"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground/80 font-medium pt-1 select-none">
              {PRICE_PRESETS.map((p) => (
                <span
                  key={p}
                  onClick={() => {
                    if (p < draft.maxPrice) {
                      setDraft((prev) => ({ ...prev, minPrice: p }));
                    } else {
                      setDraft((prev) => ({ ...prev, maxPrice: p }));
                    }
                  }}
                  className="hover:text-primary cursor-pointer transition-colors"
                >
                  {p === 0 ? "0" : p >= 100 ? "100 tr" : `${p} tr`}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Diện tích */}
        <div>
          <div className="flex items-center gap-2 mb-3.5">
            <Maximize2 className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Diện tích
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {AREA_BUTTONS.map((item) => {
              const isSelected = draft.areaRange === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({ ...prev, areaRange: item.id }))
                  }
                  className={`py-2 px-1.5 rounded-2xl border text-center text-xs transition-all duration-200 cursor-pointer select-none ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25 scale-[1.03] border-primary"
                      : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                  }`}
                >
                  <span className="text-[11px] leading-tight whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Số phòng ngủ (Căn hộ / Nhà ở) */}
        {showBedroomFilter && (
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <Bed className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Số phòng ngủ
              </h3>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {BEDS_ITEMS.map((item) => {
                const isSelected = draft.beds === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, beds: item.id }))
                    }
                    className={`py-2 rounded-2xl border text-center text-xs font-bold transition-all duration-200 cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25 scale-[1.03] border-primary"
                        : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4.1. Số phòng vệ sinh (Căn hộ / Nhà ở / Văn phòng) */}
        {showBathroomFilter && (
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <Bath className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Số phòng tắm / WC
              </h3>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {BATHS_ITEMS.map((item) => {
                const isSelected = draft.baths === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, baths: item.id }))
                    }
                    className={`py-2 rounded-2xl border text-center text-xs font-bold transition-all duration-200 cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25 scale-[1.03] border-primary"
                        : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Tình trạng nội thất (Căn hộ / Nhà ở / Phòng trọ) */}
        {showFurnishingFilter && (
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <Armchair className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Tình trạng nội thất
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {FURNISHING_ITEMS.map((item) => {
                const isSelected = draft.furnishingStatus === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, furnishingStatus: item.id }))
                    }
                    className={`py-2 px-2 rounded-2xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-md shadow-primary/25 scale-[1.02] border-primary"
                        : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                    }`}
                  >
                    <span className="text-[11px] truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Hướng cửa chính & Hướng ban công (Căn hộ) */}
        {showDirectionFilter && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <Compass className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Hướng cửa chính
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {DIRECTION_ITEMS.map((item) => {
                  const isSelected = draft.direction === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, direction: item.id }))
                      }
                      className={`py-1.5 px-1 rounded-xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                      }`}
                    >
                      <span className="text-[10px] truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <Compass className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Hướng ban công
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {DIRECTION_ITEMS.map((item) => {
                  const isSelected = draft.balconyDirection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, balconyDirection: item.id }))
                      }
                      className={`py-1.5 px-1 rounded-xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                      }`}
                    >
                      <span className="text-[10px] truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 7. Giấy tờ pháp lý (Căn hộ / Nhà ở) */}
        {showLegalFilter && (
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Giấy tờ pháp lý
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {LEGAL_ITEMS.map((item) => {
                const isSelected = draft.legalStatus === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, legalStatus: item.id }))
                    }
                    className={`py-2 px-2 rounded-2xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                        : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                    }`}
                  >
                    <span className="text-[11px] truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 8. Tiện ích nhà nguyên căn (Sân thượng, Garage, Lối đi) */}
        {showHouseFeatures && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Tiện ích kiến trúc
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({ ...prev, hasRooftop: !prev.hasRooftop }))
                }
                className={`py-2 px-2.5 rounded-2xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                  draft.hasRooftop
                    ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                    : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                }`}
              >
                Có sân thượng
              </button>

              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({ ...prev, hasGarage: !prev.hasGarage }))
                }
                className={`py-2 px-2.5 rounded-2xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                  draft.hasGarage
                    ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                    : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                }`}
              >
                Có garage để xe
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-3.5 h-3.5 text-primary" />
                <h4 className="text-[11px] font-bold text-foreground uppercase tracking-wider">
                  Lối đi
                </h4>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {ACCESS_ITEMS.map((item) => {
                  const isSelected = draft.accessType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, accessType: item.id }))
                      }
                      className={`py-1.5 px-1 rounded-xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                      }`}
                    >
                      <span className="text-[10px] truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 9. Hạng văn phòng (Văn phòng) */}
        {showOfficeFeatures && (
          <div>
            <div className="flex items-center gap-2 mb-3.5">
              <Award className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Hạng văn phòng
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {OFFICE_GRADE_ITEMS.map((item) => {
                const isSelected = draft.officeGrade === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, officeGrade: item.id }))
                    }
                    className={`py-2 px-2 rounded-2xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                        : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                    }`}
                  >
                    <span className="text-[11px] truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 10. Vị trí mặt bằng & Gác lửng (Mặt bằng kinh doanh) */}
        {showCommercialFeatures && (
          <div className="space-y-3.5">
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <Building className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Vị trí mặt bằng
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {POSITION_TYPE_ITEMS.map((item) => {
                  const isSelected = draft.positionType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, positionType: item.id }))
                      }
                      className={`py-2 px-2 rounded-2xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                      }`}
                    >
                      <span className="text-[11px] truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({ ...prev, hasMezzanine: !prev.hasMezzanine }))
                }
                className={`w-full py-2 px-3 rounded-2xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                  draft.hasMezzanine
                    ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                    : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                }`}
              >
                Mặt bằng có gác lửng
              </button>
            </div>
          </div>
        )}

        {/* 11. Nhà vệ sinh, Khu bếp, Lối đi (Phòng trọ) */}
        {showRoomFeatures && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <Bath className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Nhà vệ sinh
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {RESTROOM_TYPE_ITEMS.map((item) => {
                  const isSelected = draft.restroomType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, restroomType: item.id }))
                      }
                      className={`py-2 px-2 rounded-2xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                      }`}
                    >
                      <span className="text-[11px] truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3.5">
                <UtensilsCrossed className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Khu vực bếp
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {KITCHEN_ITEMS.map((item) => {
                  const isSelected = draft.kitchenType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setDraft((prev) => ({ ...prev, kitchenType: item.id }))
                      }
                      className={`py-2 px-2 rounded-2xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                        isSelected
                          ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                          : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                      }`}
                    >
                      <span className="text-[11px] truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() =>
                  setDraft((prev) => ({ ...prev, hasMezzanine: !prev.hasMezzanine }))
                }
                className={`w-full py-2 px-3 rounded-2xl border text-center text-xs font-semibold transition-all duration-200 cursor-pointer select-none ${
                  draft.hasMezzanine
                    ? "bg-primary text-primary-foreground font-bold shadow-xs border-primary"
                    : "bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground border-border/70"
                }`}
              >
                Phòng có gác lửng
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="p-4 border-t border-border bg-card/95 backdrop-blur-md flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="h-11 px-4 rounded-2xl border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </Button>

        <Button
          type="button"
          onClick={() => onApply(draft)}
          className="flex-1 h-11 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>Áp dụng bộ lọc</span>
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-primary-foreground text-primary text-[10px] font-extrabold flex items-center justify-center ml-0.5">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
