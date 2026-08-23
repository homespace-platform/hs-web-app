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
import { District } from "@/types/province.type";

interface AiSearchBarProps {
  onSearch?: (query: { keyword: string; location: string; type: string }) => void;
}

export default function AiSearchBar({ onSearch }: AiSearchBarProps) {
  const [keyword, setKeyword] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);

  // Selected Province from Header (Synced via localStorage & custom events)
  const [provinceCode, setProvinceCode] = useState<number | string>(79);
  const [provinceName, setProvinceName] = useState<string>("Thành phố Hồ Chí Minh");

  // Districts corresponding to selected province
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(false);
  const [districtSearchQuery, setDistrictSearchQuery] = useState<string>("");

  const propertyTypes = [
    { value: "", label: "Tất cả thể loại" },
    { value: "apartment", label: "Căn hộ/Chung cư" },
    { value: "house", label: "Nhà ở" },
    { value: "office", label: "Văn phòng" },
    { value: "commercial", label: "Mặt bằng kinh doanh" },
    { value: "studio", label: "Studio" },
    { value: "room", label: "Phòng trọ" },
  ];

  // 1. Load initial province & district from localStorage and fetch districts
  useEffect(() => {
    let currentCode: number | string = 79;
    let currentName = "Thành phố Hồ Chí Minh";

    try {
      const savedProv = localStorage.getItem("homespace_selected_province");
      if (savedProv) {
        const parsed = JSON.parse(savedProv);
        if (parsed?.code) {
          currentCode = parsed.code;
          currentName = parsed.name || currentName;
        }
      }

      const savedDist = localStorage.getItem("homespace_selected_district");
      if (savedDist) {
        setSelectedDistrict(savedDist);
      }
    } catch {
      // Ignore parse error
    }

    setProvinceCode(currentCode);
    setProvinceName(currentName);

    // Fetch districts for this province
    const loadDistricts = async (pCode: number | string) => {
      try {
        setLoadingDistricts(true);
        const data = await provinceService.getDistrictsByProvince(pCode);
        setDistricts(data || []);
      } catch (error) {
        console.error("Failed to load districts:", error);
      } finally {
        setLoadingDistricts(false);
      }
    };

    loadDistricts(currentCode);

    // 2. Listen to custom event when Header changes province
    const handleProvinceChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ code: number | string; name: string }>;
      if (customEvent.detail?.code) {
        const newCode = customEvent.detail.code;
        const newName = customEvent.detail.name;
        setProvinceCode(newCode);
        setProvinceName(newName);
        setSelectedDistrict("");
        loadDistricts(newCode);
      }
    };

    window.addEventListener("provinceChanged", handleProvinceChanged);
    return () => {
      window.removeEventListener("provinceChanged", handleProvinceChanged);
    };
  }, []);

  // Handle district selection and store in localStorage
  const handleSelectDistrict = (distName: string) => {
    setSelectedDistrict(distName);
    setIsLocationOpen(false);
    setDistrictSearchQuery("");

    try {
      if (distName) {
        localStorage.setItem("homespace_selected_district", distName);
      } else {
        localStorage.removeItem("homespace_selected_district");
      }
    } catch (e) {
      console.error("Failed to save district to localStorage:", e);
    }
  };

  // Filter districts by user search query inside dropdown
  const filteredDistricts = useMemo(() => {
    if (!districtSearchQuery.trim()) return districts;
    return districts.filter((d) =>
      d.name.toLowerCase().includes(districtSearchQuery.toLowerCase())
    );
  }, [districts, districtSearchQuery]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (onSearch) {
      onSearch({
        keyword,
        location: selectedDistrict ? `${selectedDistrict}, ${provinceName}` : provinceName,
        type: propertyType,
      });
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

          {/* District Location Selector Dropdown (Based on Header's Selected Province) */}
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
                <MapPin className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">
                  {selectedDistrict ? selectedDistrict : "Tất cả quận/huyện"}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
            </button>

            {isLocationOpen && (
              <div className="absolute top-full left-0 mt-2 w-72 bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border p-2 z-50 animate-in fade-in-50 zoom-in-95">
                {/* Search box inside district dropdown */}
                <div className="relative mb-2 px-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={districtSearchQuery}
                    onChange={(e) => setDistrictSearchQuery(e.target.value)}
                    placeholder={`Tìm quận/huyện tại ${provinceName}...`}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg border border-border focus:outline-none focus:border-primary text-foreground"
                    autoFocus
                  />
                </div>

                {/* Scrollable list */}
                <div className="max-h-60 overflow-y-auto space-y-0.5 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => handleSelectDistrict("")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedDistrict === ""
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span>Tất cả quận/huyện ({provinceName})</span>
                    {selectedDistrict === "" && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>

                  {loadingDistricts ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Đang tải quận/huyện...</span>
                    </div>
                  ) : filteredDistricts.length > 0 ? (
                    filteredDistricts.map((d) => {
                      const isSelected = selectedDistrict === d.name;
                      return (
                        <button
                          key={d.code}
                          type="button"
                          onClick={() => handleSelectDistrict(d.name)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="truncate">{d.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                      Không tìm thấy quận/huyện
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
                <Building className="w-4 h-4 text-primary shrink-0" />
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
