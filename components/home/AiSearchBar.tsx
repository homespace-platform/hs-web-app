"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import provinceService from "@/services/province.service";
import { District } from "@/types/province.type";
import { propertySearchService, type PlaceSuggestion } from "@/services/property-search.service";

interface AiSearchBarProps {
  onSearch?: (query: { keyword: string; location: string; type: string }) => void;
}

export default function AiSearchBar({ onSearch }: AiSearchBarProps) {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [fallbackToProvince, setFallbackToProvince] = useState(false);
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
    { value: "house", label: "Nhà nguyên căn" },
    { value: "apartment", label: "Căn hộ chung cư" },
    { value: "room", label: "Phòng trọ" },
  ];

  useEffect(() => {
    let cancelled = false;
    setSuggestionsLoading(true);
    setSuggestionsError(false);
    propertySearchService.suggestions(String(provinceCode), selectedDistrict || undefined)
      .then((response) => {
        if (cancelled) return;
        setSuggestions(response.suggestions);
        setFallbackToProvince(response.fallbackToProvince);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions([]);
        setFallbackToProvince(false);
        setSuggestionsError(true);
      })
      .finally(() => { if (!cancelled) setSuggestionsLoading(false); });
    return () => { cancelled = true; };
  }, [provinceCode, selectedDistrict]);

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
        localStorage.removeItem("homespace_selected_district");
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
    const query = keyword.trim();
    if (!query) return;
    // Keep the natural-language prompt clean; structured search context is sent separately.
    const firstMessage = query;
    onSearch?.({
      keyword: query,
      location: selectedDistrict ? `${selectedDistrict}, ${provinceName}` : provinceName,
      type: propertyType,
    });
    const params = new URLSearchParams({
      channel: "ai",
      newSession: "1",
      prompt: firstMessage,
      searchListings: "1",
      provinceCode: String(provinceCode),
    });
    if (selectedDistrict) params.set("district", selectedDistrict);
    if (propertyType) params.set("category", propertyType.toUpperCase());
    router.push(`/chat?${params.toString()}`);
  };

  const handleQuickSuggestion = (item: string) => {
    setKeyword(item);
    if (fallbackToProvince) handleSelectDistrict("");
  };

  return (
    <div className="w-full mx-auto">
      {/* Main Search Bar Card */}
      <div className="bg-card text-card-foreground rounded-2xl shadow-xl shadow-primary-dark/5 border border-border p-2 sm:p-3 relative z-30">
        <form onSubmit={handleSearch} className="flex flex-col gap-2">
          {/* Keyword Search Input */}
          <div className="flex items-start px-4 py-3 rounded-xl bg-muted/60 focus-within:ring-2 focus-within:ring-primary/30 transition-colors">
            <Search className="w-5 h-5 text-primary shrink-0 mr-3 mt-1" />
            <textarea
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
              rows={2}
              maxLength={500}
              aria-label="Mô tả nhu cầu tìm phòng bằng ngôn ngữ tự nhiên"
              placeholder="Ví dụ: Tôi là sinh viên, tìm phòng trọ có gác và ban công dưới 3 triệu tại Gò Vấp..."
              className="w-full min-h-14 resize-none bg-transparent border-none outline-none text-sm md:text-base text-foreground placeholder:text-muted-foreground focus:ring-0 p-0"
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">

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
          <div className="hidden sm:block w-px bg-border my-2 self-stretch" />

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
            disabled={!keyword.trim()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-7 py-3 h-auto rounded-xl shadow-md shadow-primary/20 hover:shadow-lg transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Tìm kiếm nhanh</span>
          </Button>
          </div>
        </form>
      </div>

      {/* Quick Search Chips */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="text-muted-foreground font-medium flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-accent-ai" />
          Địa điểm nổi bật:
        </span>
        {suggestionsLoading && <span className="text-muted-foreground">Đang tìm địa điểm phù hợp...</span>}
        {!suggestionsLoading && suggestionsError && <span className="text-destructive">Chưa tải được gợi ý. Vui lòng thử tải lại trang.</span>}
        {!suggestionsLoading && !suggestionsError && fallbackToProvince && (
          <span className="text-muted-foreground">Chưa có địa điểm gợi ý riêng cho {selectedDistrict}; xem thêm địa điểm nổi bật tại {provinceName}:</span>
        )}
        {!suggestionsLoading && !suggestionsError && suggestions.length === 0 && (
          <span className="text-muted-foreground">Chưa có danh sách địa điểm nổi bật cho {provinceName}.</span>
        )}
        {suggestions.map((item, idx) => (
          <button
            key={`${item.label}-${idx}`}
            type="button"
            onClick={() => handleQuickSuggestion(item.searchText)}
            className="bg-card/80 hover:bg-primary/10 text-foreground hover:text-primary border border-border px-3 py-1.5 rounded-full transition-all text-xs font-medium cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
