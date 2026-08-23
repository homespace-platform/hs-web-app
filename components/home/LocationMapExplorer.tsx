"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Search,
  Check,
  Loader2,
} from "lucide-react";
import provinceService from "@/services/province.service";
import { Province } from "@/types/province.type";

const CATEGORIES = [
  { id: "apartment", label: "Căn hộ/Chung cư" },
  { id: "house", label: "Nhà ở" },
  { id: "office", label: "Văn phòng" },
  { id: "commercial", label: "Mặt bằng kinh doanh" },
  { id: "studio", label: "Studio" },
  { id: "room", label: "Phòng trọ" },
];

export default function LocationMapExplorer() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("apartment");
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | string>(79);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch real provinces from hs-location-service
  useEffect(() => {
    let isMounted = true;
    const fetchProvinces = async () => {
      try {
        setLoadingProvinces(true);
        const data = await provinceService.getProvinces();
        if (isMounted && data && data.length > 0) {
          setProvinces(data);
          // Set default to Ho Chi Minh (code 79)
          const defaultHcm = data.find((p) => String(p.code) === "79" || p.code === 79);
          if (defaultHcm) {
            setSelectedProvinceCode(defaultHcm.code);
          } else {
            setSelectedProvinceCode(data[0].code);
          }
        }
      } catch (error) {
        console.error("Failed to load provinces:", error);
      } finally {
        if (isMounted) setLoadingProvinces(false);
      }
    };

    fetchProvinces();
    return () => {
      isMounted = false;
    };
  }, []);

  // Find currently selected province object
  const currentProvince = useMemo(() => {
    return (
      provinces.find((p) => p.code === selectedProvinceCode) || {
        code: 79,
        name: "Thành phố Hồ Chí Minh",
      }
    );
  }, [provinces, selectedProvinceCode]);

  // Filter provinces list by user search query
  const filteredProvinces = useMemo(() => {
    if (!searchQuery.trim()) return provinces;
    return provinces.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [provinces, searchQuery]);

  return (
    <section
      id="location-map"
      className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      <div className="bg-card text-card-foreground rounded-3xl p-6 sm:p-8 lg:p-10 border border-border shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Form & Features (7 cols) */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col">
            {/* Header */}
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground tracking-tight mb-2">
              Tham khảo giá thuê nhà
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-2xl">
              Cập nhật dữ liệu biến động giá thuê mới nhất tháng 01/2026 tại 63
              tỉnh thành
            </p>

            {/* Category Tabs */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 mb-6">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${isActive
                        ? "bg-foreground text-background shadow-xs"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* City Selector & Action Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
              {/* Custom Searchable Province Dropdown */}
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full h-[52px] px-4 py-2 bg-card text-card-foreground rounded-xl border border-border flex items-center justify-between text-left shadow-2xs hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div>
                    <span className="block text-[11px] font-semibold text-muted-foreground leading-none mb-1">
                      Chọn tỉnh thành
                    </span>
                    <span className="block text-sm font-bold text-foreground truncate">
                      {loadingProvinces ? (
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground font-normal">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          Đang tải danh sách tỉnh thành...
                        </span>
                      ) : (
                        currentProvince.name
                      )}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>

                {/* Dropdown Menu Panel with Search */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-popover text-popover-foreground rounded-2xl border border-border shadow-2xl z-40 p-2 animate-in fade-in-50 zoom-in-95 duration-150">
                    {/* Search input inside dropdown */}
                    <div className="relative mb-2 px-1">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm kiếm trong 63 tỉnh thành..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg border border-border focus:outline-none focus:border-primary text-foreground"
                        autoFocus
                      />
                    </div>

                    {/* Province list options */}
                    <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
                      {filteredProvinces.length > 0 ? (
                        filteredProvinces.map((p) => {
                          const isSelected = selectedProvinceCode === p.code;
                          return (
                            <button
                              key={p.code}
                              type="button"
                              onClick={() => {
                                setSelectedProvinceCode(p.code);
                                setIsDropdownOpen(false);
                                setSearchQuery("");
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${isSelected
                                  ? "bg-primary/10 text-primary font-bold"
                                  : "text-foreground hover:bg-muted"
                                }`}
                            >
                              <span>{p.name}</span>
                              {isSelected && (
                                <Check className="w-3.5 h-3.5 text-primary" />
                              )}
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

              {/* CTA Button: Xem giá ngay */}
              <button
                type="button"
                onClick={() => router.push("/#featured-listings")}
                className="h-[52px] px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm sm:text-base shadow-sm hover:shadow-md hover:shadow-primary/20 transition-all shrink-0 flex items-center justify-center cursor-pointer"
              >
                Xem giá ngay
              </button>
            </div>

            {/* 4 Checkpoints Value Proposition */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-xs sm:text-sm text-foreground font-semibold">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 stroke-[2.2]" />
                <span>Dữ liệu thật từ tin đăng cho thuê</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 stroke-[2.2]" />
                <span>Chi tiết đến quận, phường, đường</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 stroke-[2.2]" />
                <span>Giá giao dịch thực tế</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 stroke-[2.2]" />
                <span>Cập nhật hằng tháng</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Embedded Google Maps (6 cols) */}
          <div className="lg:col-span-6 xl:col-span-5 relative w-full h-[280px] sm:h-[340px] lg:h-[380px] rounded-2xl sm:rounded-3xl overflow-hidden border border-border shadow-md bg-muted">
            {/* Embedded Google Maps dynamically querying selected province name */}
            <iframe
              title={`Bản đồ tham khảo giá ${currentProvince.name}`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                currentProvince.name + ", Vietnam"
              )}&z=12&output=embed`}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
