"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  MapPin,
  Building,
  ChevronDown,
  Sparkles,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUICK_SEARCH_SUGGESTIONS } from "@/data/home-data";
import provinceService from "@/services/province.service";
import { Province } from "@/types/province.type";

interface AiSearchBarProps {
  onSearch?: (query: { keyword: string; location: string; type: string }) => void;
}

export default function AiSearchBar({ onSearch }: AiSearchBarProps) {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");

  const propertyTypes = [
    { value: "", label: "Tất cả thể loại" },
    { value: "apartment", label: "Căn hộ/Chung cư" },
    { value: "house", label: "Nhà ở" },
    { value: "office", label: "Văn phòng" },
    { value: "commercial", label: "Mặt bằng kinh doanh" },
    { value: "studio", label: "Studio" },
    { value: "room", label: "Phòng trọ" },
  ];

  // Fetch provinces from API
  useEffect(() => {
    let isMounted = true;
    const fetchProvinces = async () => {
      try {
        setLoadingProvinces(true);
        const data = await provinceService.getProvinces();
        if (isMounted && data && data.length > 0) {
          setProvinces(data);
        }
      } catch (error) {
        console.error("Failed to fetch provinces in search bar:", error);
      } finally {
        if (isMounted) setLoadingProvinces(false);
      }
    };

    fetchProvinces();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter provinces by search query
  const filteredProvinces = useMemo(() => {
    if (!locationSearchQuery.trim()) return provinces;
    return provinces.filter((p) =>
      p.name.toLowerCase().includes(locationSearchQuery.toLowerCase())
    );
  }, [provinces, locationSearchQuery]);

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
      <div className="bg-card text-card-foreground rounded-2xl shadow-xl shadow-primary-dark/5 border border-border p-2 sm:p-3 relative z-30">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-stretch gap-2">
          {/* Keyword Search Input */}
          <div className="flex-[1.5] flex items-center px-4 py-2.5 rounded-xl hover:bg-muted transition-colors">
            <Search className="w-5 h-5 text-primary shrink-0 mr-3" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Nhập yêu cầu: Căn hộ 2 phòng ngủ Quận 7 dưới 15tr..."
              className="w-full bg-transparent border-none outline-none text-sm md:text-base text-foreground placeholder:text-muted-foreground focus:ring-0 p-0"
            />
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-border my-2 self-stretch" />

          {/* Location Selector Dropdown (API Powered & Scrollable) */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => {
                setIsLocationOpen(!isLocationOpen);
                setIsTypeOpen(false);
              }}
              className="w-full h-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-muted transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <MapPin className="w-4 h-4 text-accent-ai shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {location || "Chọn khu vực"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
            </button>

            {isLocationOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border p-2 z-50 animate-in fade-in-50 zoom-in-95">
                {/* Search box inside location dropdown */}
                <div className="relative mb-2 px-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    placeholder="Tìm tỉnh thành..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg border border-border focus:outline-none focus:border-primary text-foreground"
                    autoFocus
                  />
                </div>

                {/* Scrollable list */}
                <div className="max-h-60 overflow-y-auto space-y-0.5 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setLocation("");
                      setIsLocationOpen(false);
                      setLocationSearchQuery("");
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      location === ""
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span>Tất cả khu vực</span>
                    {location === "" && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>

                  {loadingProvinces ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Đang tải tỉnh thành...</span>
                    </div>
                  ) : filteredProvinces.length > 0 ? (
                    filteredProvinces.map((p) => {
                      const isSelected = location === p.name;
                      return (
                        <button
                          key={p.code}
                          type="button"
                          onClick={() => {
                            setLocation(p.name);
                            setIsLocationOpen(false);
                            setLocationSearchQuery("");
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      Không tìm thấy tỉnh thành
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-border my-2 self-stretch" />

          {/* Property Type Dropdown */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => {
                setIsTypeOpen(!isTypeOpen);
                setIsLocationOpen(false);
              }}
              className="w-full h-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-muted transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Building className="w-4 h-4 text-accent-ai shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {propertyTypes.find((t) => t.value === propertyType)?.label || "Thể loại"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
            </button>

            {isTypeOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border p-2 z-50 animate-in fade-in-50 zoom-in-95">
                <div className="max-h-60 overflow-y-auto space-y-0.5 no-scrollbar">
                  {propertyTypes.map((type) => {
                    const isSelected = propertyType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setPropertyType(type.value);
                          setIsTypeOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span>{type.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Submit Button */}
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-7 py-3 h-auto rounded-xl shadow-md shadow-primary/20 hover:shadow-lg transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Tìm kiếm nhanh</span>
          </Button>
        </form>
      </div>

      {/* Quick Search Chips */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-accent-ai" />
          Gợi ý tìm nhanh:
        </span>
        {QUICK_SEARCH_SUGGESTIONS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickSuggestion(item)}
            className="bg-card/80 hover:bg-primary/10 text-foreground hover:text-primary border border-border px-3 py-1.5 rounded-full transition-all text-xs font-medium cursor-pointer"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
