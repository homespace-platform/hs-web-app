"use client";

import React, { startTransition, useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RentCollageCard from "@/components/rent/RentCollageCard";
import RentFilterSidebar, {
  FilterState,
} from "@/components/rent/RentFilterSidebar";
import { RentPropertyItem } from "@/types/rent.type";
import provinceService from "@/services/province.service";
import listingService from "@/services/listing.service";
import { toRentProperty } from "@/lib/listing-to-rent-property";
import { District } from "@/types/province.type";
import type { ListingCategory, ListingSubtype } from "@/types/listing.type";
import { useAuth } from "@/features/auth/useAuth";
import { useAppSelector } from "@/store/hooks";
import {
  Home,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Search,
  Building,
  LayoutList,
  Grid,
  MapPin,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

const ITEMS_PER_PAGE = 10;

export default function RentPage() {
  const [properties, setProperties] = useState<RentPropertyItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const { authenticated } = useAuth();
  const favoriteIdsList = useAppSelector((state) => state.favorite.ids);
  const favoriteIds = useMemo(() => new Set(favoriteIdsList), [favoriteIdsList]);

  // Dynamic Province & Districts synced with Header
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | string>(79);
  const [selectedProvinceName, setSelectedProvinceName] = useState<string>(
    "Thành phố Hồ Chí Minh"
  );
  const [districts, setDistricts] = useState<District[]>([]);
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState("");
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const districtDropdownRef = useRef<HTMLDivElement>(null);

  // Search input state (chỉ gửi API khi bấm Tìm kiếm hoặc Enter để tránh quá tải CSDL)
  const [searchInput, setSearchInput] = useState("");

  // Active Filter State (CHỈ cập nhật khi bấm "Áp dụng bộ lọc" hoặc submit search/district)
  const [filter, setFilter] = useState<FilterState>({
    category: "all",
    subtype: "all",
    minPrice: 0,
    maxPrice: 100,
    areaRange: "all",
    district: "all",
    beds: "all",
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
    tab: "all",
    hasVideoOnly: false,
    sortBy: "newest",
    viewMode: "collage",
    searchQuery: "",
  });

  // Call Public API whenever active filter, page, or provinceCode changes
  useEffect(() => {
    let cancelled = false;

    const runFetch = async () => {
      setIsLoading(true);
      setApiError("");
      try {
        // Map category
        let apiCategory: ListingCategory | undefined = undefined;
        if (filter.category === "apartment") {
          apiCategory = "APARTMENT";
        } else if (filter.category === "house") {
          apiCategory = "HOUSE";
        } else if (filter.category === "office") {
          apiCategory = "OFFICE";
        } else if (filter.category === "commercial") {
          apiCategory = "COMMERCIAL_SPACE";
        } else if (filter.category === "room") {
          apiCategory = "ROOM";
        } else if (filter.category === "studio") {
          apiCategory = "APARTMENT";
        }

        // Map subtype
        let apiSubtype: ListingSubtype | undefined = undefined;
        if (filter.subtype && filter.subtype !== "all") {
          apiSubtype = filter.subtype as ListingSubtype;
        } else if (filter.category === "studio") {
          apiSubtype = "APARTMENT_STUDIO";
        }

        // Map price (in millions -> VND)
        const priceMin = filter.minPrice > 0 ? filter.minPrice * 1_000_000 : undefined;
        const priceMax = filter.maxPrice < 100 ? filter.maxPrice * 1_000_000 : undefined;

        // Map area range
        let areaMin: number | undefined = undefined;
        let areaMax: number | undefined = undefined;
        if (filter.areaRange === "under_30") {
          areaMax = 30;
        } else if (filter.areaRange === "30_50") {
          areaMin = 30;
          areaMax = 50;
        } else if (filter.areaRange === "50_80") {
          areaMin = 50;
          areaMax = 80;
        } else if (filter.areaRange === "80_100") {
          areaMin = 80;
          areaMax = 100;
        } else if (filter.areaRange === "100_150") {
          areaMin = 100;
          areaMax = 150;
        } else if (filter.areaRange === "150_200") {
          areaMin = 150;
          areaMax = 200;
        } else if (filter.areaRange === "200_250") {
          areaMin = 200;
          areaMax = 250;
        } else if (filter.areaRange === "over_250") {
          areaMin = 250;
        }

        // Map bedrooms
        let bedrooms: number | undefined = undefined;
        if (filter.beds !== "all") {
          bedrooms = parseInt(filter.beds, 10);
        }

        // Map provinceCode
        let pCodeStr: string | undefined = undefined;
        if (selectedProvinceCode) {
          pCodeStr = String(selectedProvinceCode).padStart(2, "0");
        }

        // Keyword: combines search input and district if specified
        const terms: string[] = [];
        if (filter.searchQuery.trim()) {
          terms.push(filter.searchQuery.trim());
        }
        if (filter.district && filter.district !== "all") {
          terms.push(filter.district);
        }
        const keyword = terms.length > 0 ? terms.join(" ") : undefined;

        const data = await listingService.getPublicListings({
          page: currentPage,
          size: ITEMS_PER_PAGE,
          category: apiCategory,
          subtype: apiSubtype,
          priceMin,
          priceMax,
          areaMin,
          areaMax,
          bedrooms,
          bathrooms: filter.baths !== "all" ? parseInt(filter.baths, 10) : undefined,
          hasVideo: filter.hasVideoOnly ? true : undefined,
          furnishingStatus: filter.furnishingStatus !== "all" ? (filter.furnishingStatus as any) : undefined,
          direction: filter.direction !== "all" ? filter.direction : undefined,
          balconyDirection: filter.balconyDirection !== "all" ? filter.balconyDirection : undefined,
          officeGrade: filter.officeGrade !== "all" ? filter.officeGrade : undefined,
          positionType: filter.positionType !== "all" ? (filter.positionType as any) : undefined,
          restroomType: filter.restroomType !== "all" ? (filter.restroomType as any) : undefined,
          kitchenType: filter.kitchenType !== "all" ? filter.kitchenType : undefined,
          accessType: filter.accessType !== "all" ? filter.accessType : undefined,
          legalStatus: filter.legalStatus !== "all" ? filter.legalStatus : undefined,
          hasMezzanine: filter.hasMezzanine ? true : undefined,
          hasRooftop: filter.hasRooftop ? true : undefined,
          hasGarage: filter.hasGarage ? true : undefined,
          provinceCode: pCodeStr,
          keyword,
          sort: filter.sortBy,
        });

        if (!cancelled) {
          const items = (data.result ?? []).map((item) => toRentProperty(item));
          setProperties(items);
          setTotalItems(data.totalElements ?? items.length);
          setTotalPages(data.totalPages ?? 1);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching public listings:", err);
          setApiError("Không thể tải danh sách tin từ API.");
          setProperties([]);
          setTotalItems(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    runFetch();

    return () => {
      cancelled = true;
    };
  }, [filter, currentPage, selectedProvinceCode]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilter((prev) => ({ ...prev, searchQuery: searchInput.trim() }));
    setCurrentPage(1);
  };

  // Sync selected province from LocalStorage and Header CustomEvent
  useEffect(() => {
    const loadProvinceAndDistricts = async (pCode: number | string, pName: string) => {
      setSelectedProvinceCode(pCode);
      setSelectedProvinceName(pName);
      try {
        setLoadingDistricts(true);
        const dList = await provinceService.getDistrictsByProvince(pCode);
        setDistricts(dList || []);
      } catch (err) {
        console.error("Error loading districts for province:", err);
      } finally {
        setLoadingDistricts(false);
      }
    };

    // 1. URL filter from detail breadcrumb takes precedence.
    const params = new URLSearchParams(window.location.search);
    const urlProvinceCode = params.get("provinceCode");
    const urlProvinceName = params.get("provinceName");
    const urlWard = params.get("ward");
    if (urlProvinceCode && urlProvinceName) {
      loadProvinceAndDistricts(urlProvinceCode, urlProvinceName);
      startTransition(() => setFilter((prev) => ({ ...prev, district: urlWard || "all" })));
    }

    // 2. Initial read from localStorage
    if (!urlProvinceCode || !urlProvinceName) {
      try {
        const saved = localStorage.getItem("homespace_selected_province");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.code && parsed?.name) {
            loadProvinceAndDistricts(parsed.code, parsed.name);
          } else {
            loadProvinceAndDistricts(79, "Thành phố Hồ Chí Minh");
          }
        } else {
          loadProvinceAndDistricts(79, "Thành phố Hồ Chí Minh");
        }
      } catch {
        loadProvinceAndDistricts(79, "Thành phố Hồ Chí Minh");
      }
    }

    // 3. Listen to custom event when user changes province in Header
    const handleProvinceChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ code: number | string; name: string }>;
      if (customEvent.detail?.code) {
        loadProvinceAndDistricts(
          customEvent.detail.code,
          customEvent.detail.name
        );
        // Reset district selection when province changes
        setFilter((prev) => ({ ...prev, district: "all" }));
        setCurrentPage(1);
      }
    };

    window.addEventListener("provinceChanged", handleProvinceChanged);
    return () => {
      window.removeEventListener("provinceChanged", handleProvinceChanged);
    };
  }, []);

  // Close district dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        districtDropdownRef.current &&
        !districtDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDistrictDropdownOpen(false);
      }
    };
    if (isDistrictDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDistrictDropdownOpen]);

  // Filter districts based on search
  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return districts;
    return districts.filter((d) =>
      d.name.toLowerCase().includes(districtSearch.toLowerCase())
    );
  }, [districts, districtSearch]);

  // Handle reset filter
  const handleReset = () => {
    setSearchInput("");
    setFilter({
      category: "all",
      subtype: "all",
      minPrice: 0,
      maxPrice: 100,
      areaRange: "all",
      district: "all",
      beds: "all",
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
      tab: "all",
      hasVideoOnly: false,
      sortBy: "newest",
      viewMode: "collage",
      searchQuery: "",
    });
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + properties.length, totalItems);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    listContainerRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const shortProvinceName = selectedProvinceName
    .replace("Thành phố ", "")
    .replace("Tỉnh ", "");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* 1. Breadcrumbs */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
            <Link
              href="/"
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-foreground">Nhà cho thuê</span>
          </nav>

          {/* 2. Page Header & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border/80 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-foreground tracking-tight">
                  Danh sách nhà cho thuê
                </h1>
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold ring-1 ring-primary/20">
                  {totalItems} tin đăng
                </span>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
                Khám phá căn hộ, nhà nguyên căn, phòng trọ trực tiếp chính chủ tại {selectedProvinceName}. Minh bạch giá cả, ký hợp đồng điện tử và bảo vệ tiền cọc an toàn On-chain.
              </p>
            </div>

            {/* Mobile Filter Trigger Button */}
            <Button
              type="button"
              onClick={() => setIsMobileFilterOpen(true)}
              className="lg:hidden h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-2 self-start shadow-sm cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>Bộ lọc tìm kiếm</span>
            </Button>
          </div>

          {/* 3. Main 2-Column Layout: Left Filter Sidebar + Right Listings Feed */}
          <div
            ref={listContainerRef}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start scroll-mt-24"
          >
            {/* Left Column: Filter Sidebar (Hidden on mobile, sticky on Desktop) */}
            <div className="hidden lg:block lg:col-span-4 xl:col-span-4 sticky top-24 self-start z-20">
              <RentFilterSidebar
                filter={filter}
                onApply={(newFilter) => {
                  setFilter(newFilter);
                  setCurrentPage(1);
                }}
                onReset={handleReset}
                totalResultsCount={totalItems}
              />
            </div>

            {/* Right Column: Controls Bar + Listings List (8 cols) */}
            <div className="lg:col-span-8 xl:col-span-8 space-y-5">
              {/* Sub-controls Bar: Search, Dynamic District Dropdown, Video Toggle, Sort, View mode */}
              <div className="bg-card rounded-3xl border border-border p-4 space-y-3.5 shadow-sm">
                {/* Search Input Form (Chỉ tìm khi bấm submit hoặc enter để tránh quá tải CSDL) */}
                <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Tìm theo tên bài đăng, đường, phường, quận..."
                    className="h-11 pl-10 pr-28 text-xs sm:text-sm bg-muted/60 border-border rounded-2xl focus-visible:border-primary focus-visible:ring-primary/20"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput("");
                          setFilter((prev) => ({ ...prev, searchQuery: "" }));
                          setCurrentPage(1);
                        }}
                        className="w-6 h-6 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8 px-3.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
                    >
                      Tìm kiếm
                    </Button>
                  </div>
                </form>

                {/* Sub-bar: Left Dropdown Huyện & Right Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  {/* Left: Dropdown Quận / Huyện (Theo Header tỉnh đã chọn) */}
                  <div className="relative" ref={districtDropdownRef}>
                    <button
                      type="button"
                      onClick={() =>
                        setIsDistrictDropdownOpen(!isDistrictDropdownOpen)
                      }
                      className={`h-9 px-3.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-2xs ${filter.district !== "all"
                          ? "bg-primary/10 border-primary text-primary font-bold ring-1 ring-primary/20"
                          : "border-border bg-background hover:bg-muted text-foreground"
                        }`}
                    >
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate max-w-[200px]">
                        {filter.district === "all"
                          ? `Tất cả Quận/Huyện (${shortProvinceName})`
                          : filter.district}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${isDistrictDropdownOpen ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    {/* District Dropdown Menu */}
                    {isDistrictDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border p-2 z-50 animate-in fade-in-50 zoom-in-95">
                        <div className="relative mb-2 px-1">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                          <input
                            type="text"
                            value={districtSearch}
                            onChange={(e) => setDistrictSearch(e.target.value)}
                            placeholder="Tìm quận/huyện..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg border border-border focus:outline-none focus:border-primary text-foreground"
                            autoFocus
                          />
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
                          {/* Option: Tất cả quận huyện */}
                          <button
                            type="button"
                            onClick={() => {
                              setFilter({ ...filter, district: "all" });
                              setIsDistrictDropdownOpen(false);
                              setDistrictSearch("");
                              setCurrentPage(1);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${filter.district === "all"
                                ? "bg-primary/10 text-primary font-bold"
                                : "text-foreground hover:bg-muted"
                              }`}
                          >
                            <span>Tất cả Quận/Huyện</span>
                            {filter.district === "all" && (
                              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            )}
                          </button>

                          {loadingDistricts ? (
                            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                              <span>Đang tải danh sách...</span>
                            </div>
                          ) : filteredDistricts.length > 0 ? (
                            filteredDistricts.map((d) => {
                              const isSelected = filter.district === d.name;
                              return (
                                <button
                                  key={d.code}
                                  type="button"
                                  onClick={() => {
                                    setFilter({ ...filter, district: d.name });
                                    setIsDistrictDropdownOpen(false);
                                    setDistrictSearch("");
                                    setCurrentPage(1);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${isSelected
                                      ? "bg-primary/10 text-primary font-bold"
                                      : "text-foreground hover:bg-muted"
                                    }`}
                                >
                                  <span className="truncate">{d.name}</span>
                                  {isSelected && (
                                    <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                  )}
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

                  {/* Right Controls: Video Toggle, Sort, View mode */}
                  <div className="flex items-center gap-3.5 shrink-0 self-end sm:self-auto">
                    {/* Video toggle with shadcn Switch */}
                    <div className="flex items-center gap-2">
                      <Switch
                        id="video-toggle"
                        checked={filter.hasVideoOnly}
                        onCheckedChange={(checked) => {
                          setFilter((prev) => ({
                            ...prev,
                            hasVideoOnly: checked,
                          }));
                          setCurrentPage(1);
                        }}
                      />
                      <label
                        htmlFor="video-toggle"
                        className="text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer select-none hidden sm:inline"
                      >
                        Tin có video
                      </label>
                    </div>

                    {/* Sort Dropdown */}
                    <select
                      value={filter.sortBy}
                      onChange={(e) => {
                        setFilter((prev) => ({
                          ...prev,
                          sortBy: e.target.value as FilterState["sortBy"],
                        }));
                        setCurrentPage(1);
                      }}
                      className="h-9 px-3 rounded-2xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all"
                    >
                      <option value="newest">Tin mới nhất</option>
                      <option value="price_asc">Giá thấp đến cao</option>
                      <option value="price_desc">Giá cao đến thấp</option>
                      <option value="area_desc">Diện tích lớn nhất</option>
                    </select>

                    {/* View Mode Toggle */}
                    <div className="flex items-center border border-border rounded-2xl p-0.5 bg-muted/60">
                      <button
                        type="button"
                        onClick={() =>
                          setFilter((prev) => ({ ...prev, viewMode: "collage" }))
                        }
                        title="Xem dạng thẻ chi tiết (Collage)"
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${filter.viewMode === "collage"
                            ? "bg-card text-foreground shadow-2xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <LayoutList className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFilter((prev) => ({ ...prev, viewMode: "grid" }))
                        }
                        title="Xem dạng lưới (Grid)"
                        className={`p-1.5 rounded-xl transition-all cursor-pointer ${filter.viewMode === "grid"
                            ? "bg-card text-foreground shadow-2xs font-bold"
                            : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        <Grid className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feed: Empty State or Listings Cards */}
              {isLoading ? (
                <div className="bg-card rounded-3xl border border-border p-12 text-center text-muted-foreground shadow-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span>Đang tải tin đăng...</span>
                </div>
              ) : apiError ? (
                <div className="bg-card rounded-3xl border border-border p-12 text-center text-destructive shadow-sm">
                  {apiError}
                </div>
              ) : properties.length === 0 ? (
                <div className="bg-card rounded-3xl border border-border p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3.5 shadow-sm">
                  <div className="w-16 h-16 rounded-3xl bg-muted flex items-center justify-center text-muted-foreground/50">
                    <Building className="w-8 h-8" />
                  </div>
                  <h3 className="font-heading font-bold text-base text-foreground">
                    Không tìm thấy nhà cho thuê phù hợp
                  </h3>
                  <p className="text-xs sm:text-sm max-w-md text-muted-foreground leading-relaxed">
                    Hãy thử điều chỉnh lại mức giá, diện tích, quận huyện hoặc nhấn Đặt lại để xem tất cả tin cho thuê đang có sẵn.
                  </p>
                  <Button
                    type="button"
                    onClick={handleReset}
                    className="mt-2 h-10 px-5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-md shadow-primary/20"
                  >
                    Xóa tất cả bộ lọc
                  </Button>
                </div>
              ) : filter.viewMode === "collage" ? (
                /* Collage View */
                <div className="space-y-4 sm:space-y-5">
                  {properties.map((prop) => (
                    <RentCollageCard
                      key={prop.id}
                      property={prop}
                      viewMode="collage"
                      initialFavorited={favoriteIds.has(prop.id)}
                    />
                  ))}
                </div>
              ) : (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-stretch">
                  {properties.map((prop) => (
                    <RentCollageCard
                      key={prop.id}
                      property={prop}
                      viewMode="grid"
                      initialFavorited={favoriteIds.has(prop.id)}
                    />
                  ))}
                </div>
              )}

              {/* 4. Pagination Bar */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/80 pt-6">
                  <p className="text-xs text-muted-foreground font-medium order-2 sm:order-1">
                    Hiển thị{" "}
                    <span className="font-bold text-foreground">
                      {startIndex + 1} - {endIndex}
                    </span>{" "}
                    trong tổng số{" "}
                    <span className="font-bold text-foreground">
                      {totalItems}
                    </span>{" "}
                    tin đăng cho thuê
                  </p>

                  <div className="flex items-center gap-2 order-1 sm:order-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-10 px-4 rounded-2xl border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Trước</span>
                    </Button>

                    <div className="flex items-center gap-1.5">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => handlePageChange(page)}
                            className={`w-10 h-10 rounded-2xl text-xs font-bold transition-all cursor-pointer ${currentPage === page
                                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
                                : "border border-border bg-card text-foreground hover:bg-muted"
                              }`}
                          >
                            {page}
                          </button>
                        )
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="h-10 px-4 rounded-2xl border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Tiếp</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Filter Modal / Drawer */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileFilterOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-md bg-background h-full ml-auto shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-heading font-bold text-base text-foreground">
                Bộ lọc tìm kiếm
              </h2>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <RentFilterSidebar
                filter={filter}
                onApply={(newFilter) => {
                  setFilter(newFilter);
                  setCurrentPage(1);
                  setIsMobileFilterOpen(false);
                }}
                onReset={handleReset}
                totalResultsCount={totalItems}
              />
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
