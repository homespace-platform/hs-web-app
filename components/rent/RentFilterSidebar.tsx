"use client";

import React, { useState, useEffect } from "react";
import {
  Home,
  RotateCcw,
  Check,
  Bed,
  Banknote,
  Maximize2,
  Search,
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
  onApply,
  onReset,
  totalResultsCount,
}: RentFilterSidebarProps) {
  // Staged / Draft state (chỉ gửi truy vấn khi ấn "Áp dụng bộ lọc" để chống quá tải CSDL)
  const [draft, setDraft] = useState<FilterState>(filter);

  // Sync draft when external filter changes (e.g. reset or province change)
  useEffect(() => {
    setDraft(filter);
  }, [filter]);

  // Calculate active draft filters count
  let activeFilterCount = 0;
  if (draft.category !== "all") activeFilterCount++;
  if (draft.minPrice > 0 || draft.maxPrice < 100) activeFilterCount++;
  if (draft.areaRange !== "all") activeFilterCount++;
  if (draft.beds !== "all") activeFilterCount++;
  if (draft.district !== "all") activeFilterCount++;

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
        {/* 1. Loại phòng & nhà (Dạng nút pill bo tròn cao cấp, active màu xanh primary) */}
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
                  onClick={() => setDraft((prev) => ({ ...prev, category: item.id }))}
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

          {/* Min - Max Interactive Input Cards */}
          <div className="grid grid-cols-2 gap-3 items-center">
            {/* Min Price Input */}
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

            {/* Max Price Input */}
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

          {/* shadcn Dual-Thumb Slider */}
          <div className="px-2 pt-3 pb-1">
            <Slider
              value={[draft.minPrice, draft.maxPrice]}
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

        {/* 3. Diện tích (Nút pill bo tròn, active màu xanh primary) */}
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
                  onClick={() => setDraft((prev) => ({ ...prev, areaRange: item.id }))}
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

        {/* 4. Số phòng ngủ (Active màu xanh primary) */}
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
                  onClick={() => setDraft((prev) => ({ ...prev, beds: item.id }))}
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
      </div>

      {/* Sticky Bottom Actions in Filter Sidebar (Chỉ gửi truy vấn khi ấn Áp dụng) */}
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
