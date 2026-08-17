"use client";

import React from "react";
import {
  LayoutGrid,
  Building,
  Home,
  Briefcase,
  Store,
  Sparkles,
  DoorClosed,
  RotateCcw,
  Check,
  Bed,
  Banknote,
  Maximize2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export interface FilterState {
  category: string;
  minPrice: number; // in Millions
  maxPrice: number; // in Millions
  areaRange: string;
  district: string;
  beds: string;
  tab: "all" | "owner" | "verified";
  hasVideoOnly: boolean;
  sortBy: "newest" | "price_asc" | "price_desc" | "area_desc";
  viewMode: "collage" | "grid";
  searchQuery: string;
}

interface RentFilterSidebarProps {
  filter: FilterState;
  onChange: (newFilter: FilterState) => void;
  onReset: () => void;
  totalResultsCount: number;
}

export const RENT_CATEGORIES = [
  { id: "all", label: "Tất cả", icon: LayoutGrid },
  { id: "apartment", label: "Căn hộ/Chung cư", icon: Building },
  { id: "house", label: "Nhà ở", icon: Home },
  { id: "office", label: "Văn phòng", icon: Briefcase },
  { id: "commercial", label: "Mặt bằng kinh doanh", icon: Store },
  { id: "studio", label: "Studio", icon: Sparkles },
  { id: "room", label: "Phòng trọ", icon: DoorClosed },
];

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

const PRICE_PRESETS = [0, 5, 10, 20, 40, 70, 100];

export default function RentFilterSidebar({
  filter,
  onChange,
  onReset,
  totalResultsCount,
}: RentFilterSidebarProps) {
  // Calculate active filters count
  let activeFilterCount = 0;
  if (filter.category !== "all") activeFilterCount++;
  if (filter.minPrice > 0 || filter.maxPrice < 100) activeFilterCount++;
  if (filter.areaRange !== "all") activeFilterCount++;
  if (filter.beds !== "all") activeFilterCount++;
  if (filter.district !== "all") activeFilterCount++;
  if (filter.hasVideoOnly) activeFilterCount++;
  if (filter.searchQuery.trim() !== "") activeFilterCount++;

  const handleSliderChange = (vals: number[]) => {
    if (vals.length === 2) {
      onChange({
        ...filter,
        minPrice: vals[0],
        maxPrice: vals[1],
      });
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-3xl border border-border overflow-hidden shadow-sm sticky top-24 flex flex-col max-h-[calc(100vh-120px)] transition-all">
      {/* Scrollable Body */}
      <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 no-scrollbar">
        {/* 1. Loại phòng & nhà (Đồng nhất 7 danh mục: Tất cả, Căn hộ/Chung cư, Nhà ở, Văn phòng, Mặt bằng kinh doanh, Studio, Phòng trọ) */}
        <div>
          <div className="flex items-center gap-2 mb-3.5">
            <Home className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Loại phòng & nhà
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {RENT_CATEGORIES.map((item) => {
              const Icon = item.icon;
              const isSelected = filter.category === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ ...filter, category: item.id })}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer min-h-[76px] relative select-none ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary font-bold shadow-xs ring-2 ring-primary/20 scale-[1.02]"
                      : "bg-background border-border hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mb-1.5 transition-transform duration-200 ${
                      isSelected ? "text-primary scale-110" : "text-muted-foreground"
                    }`}
                  />
                  <span className="text-[11px] leading-tight line-clamp-2">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Khoảng giá thuê (đ/tháng) with shadcn Slider */}
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

          {/* Min - Max Box Indicators */}
          <div className="grid grid-cols-2 gap-3 items-center">
            <div className="p-3 rounded-2xl border border-border bg-background text-center shadow-2xs">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Tối thiểu
              </p>
              <p className="font-heading font-extrabold text-sm sm:text-base text-primary mt-0.5">
                {filter.minPrice === 0 ? "0 triệu" : `${filter.minPrice} triệu`}
              </p>
            </div>
            <div className="p-3 rounded-2xl border border-border bg-background text-center shadow-2xs">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Tối đa
              </p>
              <p className="font-heading font-extrabold text-sm sm:text-base text-primary mt-0.5">
                {filter.maxPrice >= 100 ? "100+ triệu" : `${filter.maxPrice} triệu`}
              </p>
            </div>
          </div>

          {/* shadcn Dual-Thumb Slider */}
          <div className="px-2 pt-3 pb-1">
            <Slider
              value={[filter.minPrice, filter.maxPrice]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleSliderChange}
              className="my-3"
            />

            {/* Quick Price Markers */}
            <div className="flex justify-between text-[10px] text-muted-foreground/80 font-medium pt-1 select-none">
              {PRICE_PRESETS.map((p) => (
                <span
                  key={p}
                  onClick={() => {
                    if (p < filter.maxPrice) {
                      onChange({ ...filter, minPrice: p });
                    } else {
                      onChange({ ...filter, maxPrice: p });
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

        {/* 3. Diện tích (Grid 3 cols) */}
        <div>
          <div className="flex items-center gap-2 mb-3.5">
            <Maximize2 className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Diện tích
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {AREA_BUTTONS.map((item) => {
              const isSelected = filter.areaRange === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ ...filter, areaRange: item.id })}
                  className={`py-2.5 px-2 rounded-xl border text-center text-xs transition-all duration-200 cursor-pointer select-none ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary font-bold shadow-xs ring-1 ring-primary/30 scale-[1.02]"
                      : "bg-background border-border hover:bg-muted/70 text-muted-foreground hover:text-foreground"
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

        {/* 4. Số phòng ngủ (Segmented selection) */}
        <div>
          <div className="flex items-center gap-2 mb-3.5">
            <Bed className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Số phòng ngủ
            </h3>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {BEDS_ITEMS.map((item) => {
              const isSelected = filter.beds === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ ...filter, beds: item.id })}
                  className={`py-2.5 rounded-xl border text-center text-xs font-bold transition-all duration-200 cursor-pointer select-none ${
                    isSelected
                      ? "bg-primary/10 border-primary text-primary font-bold shadow-xs ring-1 ring-primary/30 scale-[1.02]"
                      : "bg-background border-border hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions in Filter Sidebar */}
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
          onClick={() => {
            // Apply smoothly
          }}
          className="flex-1 h-11 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all cursor-pointer"
        >
          <Check className="w-4 h-4" />
          <span>Tìm thấy ({totalResultsCount})</span>
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
