"use client";

import { useState } from "react";
import { Search, MapPin, Building, ChevronDown, Sparkles, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUICK_SEARCH_SUGGESTIONS, POPULAR_LOCATIONS } from "@/data/home-data";

interface AiSearchBarProps {
  onSearch?: (query: { keyword: string; location: string; type: string }) => void;
}

export default function AiSearchBar({ onSearch }: AiSearchBarProps) {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  const propertyTypes = [
    { value: "", label: "Tất cả thể loại" },
    { value: "apartment", label: "Căn hộ chung cư" },
    { value: "house", label: "Nhà phố nguyên căn" },
    { value: "studio", label: "Phòng Studio cao cấp" },
    { value: "villa", label: "Biệt thự & Penthouse" },
  ];

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onSearch) {
      onSearch({ keyword, location, type: propertyType });
    }
  };

  const handleQuickSuggestion = (item: string) => {
    setKeyword(item);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Main Search Bar Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-blue-950/5 border border-slate-200/90 dark:border-slate-800 p-2 sm:p-3 relative z-20">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-stretch gap-2">
          {/* Keyword Search Input */}
          <div className="flex-[1.5] flex items-center px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
            <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mr-3" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập yêu cầu: Căn hộ 2 phòng ngủ Quận 7 dưới 15tr..."
              className="w-full bg-transparent border-none outline-none text-sm md:text-base text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-0 p-0"
            />
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-slate-200 dark:bg-slate-800 my-2 self-stretch" />

          {/* Location Selector Dropdown */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => {
                setIsLocationOpen(!isLocationOpen);
                setIsTypeOpen(false);
              }}
              className="w-full h-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-cyan-600 shrink-0" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {location || "Chọn khu vực"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            </button>

            {isLocationOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-30 animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setLocation("");
                    setIsLocationOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600"
                >
                  Tất cả khu vực
                </button>
                {POPULAR_LOCATIONS.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setLocation(loc.name);
                      setIsLocationOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${location === loc.name
                        ? "bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-slate-200 dark:bg-slate-800 my-2 self-stretch" />

          {/* Property Type Dropdown */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => {
                setIsTypeOpen(!isTypeOpen);
                setIsLocationOpen(false);
              }}
              className="w-full h-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Building className="w-4 h-4 text-cyan-600 shrink-0" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {propertyTypes.find((t) => t.value === propertyType)?.label || "Thể loại"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            </button>

            {isTypeOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-30 animate-in fade-in-50 zoom-in-95">
                {propertyTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setPropertyType(type.value);
                      setIsTypeOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${propertyType === type.value
                        ? "bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400 font-semibold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Submit Button */}
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 py-3 h-auto rounded-xl shadow-md shadow-blue-600/20 hover:shadow-lg transition-all shrink-0 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
            <span>Tìm kiếm nhanh</span>
          </Button>
        </form>
      </div>

      {/* Quick Search Chips */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
          Gợi ý tìm nhanh:
        </span>
        {QUICK_SEARCH_SUGGESTIONS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickSuggestion(item)}
            className="bg-white/80 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-200/80 dark:border-slate-700 px-3 py-1.5 rounded-full transition-all text-xs font-medium"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
