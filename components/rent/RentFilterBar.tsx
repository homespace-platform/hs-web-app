"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Building2,
  Home,
  BedDouble,
  Store,
  Castle,
  Grid,
  LayoutList,
  Check,
  Search,
  Video,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export interface FilterState {
  category: string;
  priceRange: string;
  district: string;
  areaRange: string;
  beds: string;
  tab: "all" | "owner" | "verified";
  hasVideoOnly: boolean;
  sortBy: "newest" | "price_asc" | "price_desc" | "area_desc";
  viewMode: "collage" | "grid";
  searchQuery: string;
}

interface RentFilterBarProps {
  filter: FilterState;
  onChange: (newFilter: FilterState) => void;
  onReset: () => void;
  totalCount: number;
}

const QUICK_CATEGORIES = [
  { id: "all", label: "Tất cả loại nhà", icon: Building2 },
  { id: "apartment", label: "Căn hộ / Chung cư", icon: Building2 },
  { id: "house", label: "Nhà ở nguyên căn", icon: Home },
  { id: "room", label: "Phòng trọ / Studio", icon: BedDouble },
  { id: "commercial", label: "Văn phòng / Mặt bằng", icon: Store },
  { id: "villa", label: "Biệt thự / Villa", icon: Castle },
];

const PRICE_OPTIONS = [
  { id: "all", label: "Tất cả mức giá" },
  { id: "under_5", label: "Dưới 5 triệu" },
  { id: "5_10", label: "5 - 10 triệu" },
  { id: "10_20", label: "10 - 20 triệu" },
  { id: "20_40", label: "20 - 40 triệu" },
  { id: "over_40", label: "Trên 40 triệu" },
];

const DISTRICT_OPTIONS = [
  { id: "all", label: "Tất cả khu vực" },
  { id: "Quận 1", label: "Quận 1" },
  { id: "Quận 2", label: "Quận 2 (Thủ Đức)" },
  { id: "Quận 3", label: "Quận 3" },
  { id: "Quận 7", label: "Quận 7" },
  { id: "Bình Thạnh", label: "Quận Bình Thạnh" },
  { id: "Phú Nhuận", label: "Quận Phú Nhuận" },
  { id: "Quận 10", label: "Quận 10" },
  { id: "Thủ Đức", label: "TP. Thủ Đức" },
  { id: "Gò Vấp", label: "Quận Gò Vấp" },
];

const AREA_OPTIONS = [
  { id: "all", label: "Tất cả diện tích" },
  { id: "under_30", label: "Dưới 30 m²" },
  { id: "30_50", label: "30 - 50 m²" },
  { id: "50_80", label: "50 - 80 m²" },
  { id: "over_80", label: "Trên 80 m²" },
];

const BEDS_OPTIONS = [
  { id: "all", label: "Tất cả phòng ngủ" },
  { id: "1", label: "1 Phòng ngủ" },
  { id: "2", label: "2 Phòng ngủ" },
  { id: "3", label: "3+ Phòng ngủ" },
];

export default function RentFilterBar({
  filter,
  onChange,
  onReset,
  totalCount,
}: RentFilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const hasActiveFilters =
    filter.category !== "all" ||
    filter.priceRange !== "all" ||
    filter.district !== "all" ||
    filter.areaRange !== "all" ||
    filter.beds !== "all" ||
    filter.tab !== "all" ||
    filter.hasVideoOnly ||
    filter.searchQuery !== "";

  return (
    <div ref={containerRef} className="space-y-4 mb-8">
      {/* 1. Quick Category Icon Selector Row (Matching Reference Screenshot) */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
        {QUICK_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = filter.category === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                onChange({ ...filter, category: cat.id });
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl min-w-[100px] sm:min-w-[120px] transition-all cursor-pointer border ${
                isSelected
                  ? "bg-primary/10 border-primary/50 text-primary font-bold shadow-xs scale-105"
                  : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-6 h-6 mb-1.5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs text-center leading-tight whitespace-nowrap">
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Main Filter Pills Bar */}
      <div className="bg-card rounded-2xl border border-border p-3 sm:p-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pill: Loại phòng & nhà */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("category")}
              className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                filter.category !== "all"
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              <span>
                {QUICK_CATEGORIES.find((c) => c.id === filter.category)?.label ||
                  "Loại phòng & nhà"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === "category" && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-popover border border-border rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                {QUICK_CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange({ ...filter, category: item.id });
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                      filter.category === item.id
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{item.label}</span>
                    {filter.category === item.id && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Pill: Giá thuê */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("price")}
              className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                filter.priceRange !== "all"
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              <span>
                {PRICE_OPTIONS.find((p) => p.id === filter.priceRange)?.label ||
                  "Giá thuê"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === "price" && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-popover border border-border rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                {PRICE_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange({ ...filter, priceRange: item.id });
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                      filter.priceRange === item.id
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{item.label}</span>
                    {filter.priceRange === item.id && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Pill: Khu vực / Quận */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("district")}
              className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                filter.district !== "all"
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              <span>
                {DISTRICT_OPTIONS.find((d) => d.id === filter.district)?.label ||
                  "Khu vực"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === "district" && (
              <div className="absolute top-full left-0 mt-2 w-56 max-h-60 overflow-y-auto bg-popover border border-border rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95 no-scrollbar">
                {DISTRICT_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange({ ...filter, district: item.id });
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                      filter.district === item.id
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{item.label}</span>
                    {filter.district === item.id && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Pill: Diện tích */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("area")}
              className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                filter.areaRange !== "all"
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              <span>
                {AREA_OPTIONS.find((a) => a.id === filter.areaRange)?.label ||
                  "Diện tích"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === "area" && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-popover border border-border rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                {AREA_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange({ ...filter, areaRange: item.id });
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                      filter.areaRange === item.id
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{item.label}</span>
                    {filter.areaRange === item.id && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter Pill: Phòng ngủ */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleDropdown("beds")}
              className={`h-9 px-3.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                filter.beds !== "all"
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border bg-card hover:bg-muted text-foreground"
              }`}
            >
              <span>
                {BEDS_OPTIONS.find((b) => b.id === filter.beds)?.label ||
                  "Số phòng ngủ"}
              </span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === "beds" && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-popover border border-border rounded-xl shadow-xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                {BEDS_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange({ ...filter, beds: item.id });
                      setOpenDropdown(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer ${
                      filter.beds === item.id
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{item.label}</span>
                    {filter.beds === item.id && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={filter.searchQuery}
              onChange={(e) =>
                onChange({ ...filter, searchQuery: e.target.value })
              }
              placeholder="Tìm theo tên dự án, đường, quận..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-muted/60 border border-border rounded-full focus:outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="h-9 px-3 text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa lọc</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Sub-controls Bar: Tabs, Video Toggle, Sorting & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Left Tabs: Tất cả | Chính chủ | Xác thực On-chain */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => onChange({ ...filter, tab: "all" })}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              filter.tab === "all"
                ? "bg-foreground text-background font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            Tất cả ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...filter, tab: "owner" })}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              filter.tab === "owner"
                ? "bg-foreground text-background font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Chính chủ (Cá nhân)</span>
          </button>

          <button
            type="button"
            onClick={() => onChange({ ...filter, tab: "verified" })}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              filter.tab === "verified"
                ? "bg-emerald-600 text-white font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Xác thực On-chain</span>
          </button>
        </div>

        {/* Right Controls: Video toggle, Sort, View mode */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {/* Tin có video Switch */}
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground">
            <div
              onClick={() =>
                onChange({ ...filter, hasVideoOnly: !filter.hasVideoOnly })
              }
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                filter.hasVideoOnly ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  filter.hasVideoOnly ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </div>
            <span>Tin có video</span>
          </label>

          {/* Sort Dropdown */}
          <select
            value={filter.sortBy}
            onChange={(e) =>
              onChange({
                ...filter,
                sortBy: e.target.value as FilterState["sortBy"],
              })
            }
            className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground focus:outline-none focus:border-primary cursor-pointer"
          >
            <option value="newest">Tin mới nhất</option>
            <option value="price_asc">Giá thấp đến cao</option>
            <option value="price_desc">Giá cao đến thấp</option>
            <option value="area_desc">Diện tích lớn nhất</option>
          </select>

          {/* View Mode Toggle: Collage vs Grid */}
          <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/60">
            <button
              type="button"
              onClick={() => onChange({ ...filter, viewMode: "collage" })}
              title="Xem dạng thẻ chi tiết (Collage)"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                filter.viewMode === "collage"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...filter, viewMode: "grid" })}
              title="Xem dạng lưới (Grid)"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                filter.viewMode === "grid"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
