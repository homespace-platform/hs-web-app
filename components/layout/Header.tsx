"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/useAuth";
import { Button } from "@/components/ui/button";
import UserDropdown from "./UserDropdown";
import NotificationDropdown from "@/components/notification/NotificationDropdown";
import UserAvatar from "@/components/common/UserAvatar";
import listingLocationService from "@/services/listing-location.service";
import type { AdministrativeCity, AdministrativeWard } from "@/types/administrative-location.type";
import { locationMatches } from "@/lib/administrative-location";
import { changeRentCity, readRentState, rentHrefFromLocation, writeRentState } from "@/lib/rent-filter-state";
import { updateRentQuery, useRentUrlState } from "@/hooks/useRentUrlState";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchFavoriteIds } from "@/features/favorite/favoriteSlice";
import { fetchHistoryIds } from "@/features/history/historySlice";
import {
  hydrateLocation,
  setGlobalCity,
  setGlobalWard,
} from "@/features/location/locationSlice";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import { requireKyc } from "@/lib/kyc-gate";
import {
  Menu,
  X,
  Smartphone,
  LayoutGrid,
  Heart,
  MapPin,
  ChevronDown,
  ChevronLeft,
  Search,
  Check,
  Loader2,
  Plus,
} from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboard = pathname?.startsWith("/dashboard");
  const isRentPage = pathname === "/rent";
  const { openRolePicker } = useDashboardRole();

  const {
    authenticated,
    login,
    register,
    logout,
    username,
    avatarUrl,
    profile,
  } = useAuth();

  const goToDashboard = () => {
    openRolePicker();
  };

  const goToPostListing = () => {
    requireKyc(profile, {
      router,
      redirect: true,
      onAllowed: () => router.push("/dashboard/properties/upsert"),
    });
  };
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dispatch = useAppDispatch();
  const favoriteCount = useAppSelector((state) => state.favorite.count);
  const historyCount = useAppSelector((state) => state.history.count);
  const globalLocation = useAppSelector((state) => state.location);

  const [provinces, setProvinces] = useState<AdministrativeCity[]>([]);
  const { cityId: urlCityId, filter: rentFilter, setCity, setWard, ready: rentQueryReady } = useRentUrlState();
  const selectedProvinceCode = isRentPage ? urlCityId : globalLocation.cityId;
  const selectedWardId = isRentPage ? rentFilter.wardId : globalLocation.wardId;
  const selectedProvinceName =
    provinces.find((city) => city.code === selectedProvinceCode)?.name
    || (globalLocation.cityId === selectedProvinceCode ? globalLocation.cityName : "")
    || "Chọn tỉnh/thành phố";
  const [catalogError, setCatalogError] = useState("");
  const [catalogReload, setCatalogReload] = useState(0);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationStep, setLocationStep] = useState<"city" | "ward">("city");
  const [locationSearch, setLocationSearch] = useState("");
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const locationDropdownRef = useRef<HTMLDivElement>(null);

  const [wards, setWards] = useState<AdministrativeWard[]>([]);
  const [wardError, setWardError] = useState("");
  const [loadingWards, setLoadingWards] = useState(false);
  const selectedWardName =
    wards.find((ward) => ward.code === selectedWardId)?.name
    || (globalLocation.wardId === selectedWardId ? globalLocation.wardName : "")
    || "";
  // Chưa chọn phường → hiện tỉnh; đã chọn cả hai → hiện phường/xã.
  const locationLabel = loadingProvinces
    ? "Đang tải..."
    : selectedWardId && selectedWardName
      ? selectedWardName
      : selectedProvinceName;

  useEffect(() => {
    dispatch(hydrateLocation());
  }, [dispatch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(target)) {
        setIsLocationOpen(false);
      }
    }

    if (isLocationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLocationOpen]);

  useEffect(() => {
    if (authenticated) {
      dispatch(fetchFavoriteIds());
      dispatch(fetchHistoryIds());
    }
  }, [authenticated, dispatch]);

  useEffect(() => {
    let isMounted = true;

    const fetchProvinces = async () => {
      try {
        setLoadingProvinces(true);
        const data = await listingLocationService.getCities();
        if (isMounted && data && data.length > 0) {
          setProvinces(data);
          setCatalogError("");
        }
      } catch (error) {
        console.error("Failed to load provinces in Header:", error);
        if (isMounted) setCatalogError("Không thể tải danh mục tỉnh/thành phố.");
      } finally {
        if (isMounted) setLoadingProvinces(false);
      }
    };

    fetchProvinces();
    return () => {
      isMounted = false;
    };
  }, [catalogReload]);

  useEffect(() => {
    let cancelled = false;
    setWards([]);
    setWardError("");
    if (!selectedProvinceCode) {
      setLoadingWards(false);
      return;
    }
    setLoadingWards(true);
    listingLocationService
      .getWards(selectedProvinceCode)
      .then((data) => {
        if (!cancelled) setWards(data);
      })
      .catch(() => {
        if (!cancelled) setWardError("Không thể tải danh mục phường/xã.");
      })
      .finally(() => {
        if (!cancelled) setLoadingWards(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProvinceCode]);

  // Prefer global city/ward into empty /rent URL; mirror shared /rent URL into global store.
  useEffect(() => {
    if (!isRentPage || !rentQueryReady || !globalLocation.hydrated) return;

    if (!urlCityId && globalLocation.cityId) {
      let query = changeRentCity(window.location.search, globalLocation.cityId);
      if (globalLocation.wardId) {
        const current = readRentState(query);
        query = writeRentState(query, { ...current.filter, wardId: globalLocation.wardId });
      }
      updateRentQuery(query, true);
      return;
    }

    if (!urlCityId) return;

    if (urlCityId !== globalLocation.cityId) {
      const cityName =
        provinces.find((city) => city.code === urlCityId)?.name
        || globalLocation.cityName
        || urlCityId;
      dispatch(setGlobalCity({ code: urlCityId, name: cityName }));
      if (rentFilter.wardId) {
        const wardName =
          wards.find((ward) => ward.code === rentFilter.wardId)?.name
          || rentFilter.wardId;
        dispatch(setGlobalWard({ code: rentFilter.wardId, name: wardName }));
      }
      return;
    }

    if (rentFilter.wardId !== globalLocation.wardId) {
      if (!rentFilter.wardId) {
        dispatch(setGlobalWard(null));
      } else {
        const wardName =
          wards.find((ward) => ward.code === rentFilter.wardId)?.name
          || (globalLocation.wardId === rentFilter.wardId ? globalLocation.wardName : rentFilter.wardId);
        dispatch(setGlobalWard({ code: rentFilter.wardId, name: wardName }));
      }
    }
  }, [
    dispatch,
    globalLocation.cityId,
    globalLocation.cityName,
    globalLocation.hydrated,
    globalLocation.wardId,
    globalLocation.wardName,
    isRentPage,
    provinces,
    rentFilter.wardId,
    rentQueryReady,
    urlCityId,
    wards,
  ]);

  const handleSelectProvince = (province: AdministrativeCity) => {
    if (!province.code) return;
    dispatch(setGlobalCity({ code: province.code, name: province.name }));
    if (isRentPage) setCity(province.code);
    setLocationSearch("");
    setLocationStep("ward");

    try {
      window.dispatchEvent(
        new CustomEvent("provinceChanged", {
          detail: { code: province.code, name: province.name },
        }),
      );
    } catch (e) {
      console.error("Failed to broadcast province change:", e);
    }
  };

  const handleSelectWard = (ward: AdministrativeWard | null) => {
    if (!selectedProvinceCode) return;
    if (!ward) {
      dispatch(setGlobalWard(null));
      if (isRentPage) setWard("");
    } else {
      dispatch(setGlobalWard({ code: ward.code, name: ward.name }));
      if (isRentPage) setWard(ward.code);
    }
    setIsLocationOpen(false);
    setLocationSearch("");
  };

  const filteredProvinces = useMemo(() => {
    if (!locationSearch.trim()) return provinces;
    return provinces.filter((p) => locationMatches(p.name, locationSearch));
  }, [provinces, locationSearch]);

  const filteredWards = useMemo(() => {
    if (!locationSearch.trim()) return wards;
    return wards.filter((ward) => locationMatches(ward.name, locationSearch));
  }, [wards, locationSearch]);

  const rentHref = rentHrefFromLocation(selectedProvinceCode, selectedWardId);

  const openLocationPicker = () => {
    const nextOpen = !isLocationOpen;
    setIsLocationOpen(nextOpen);
    if (nextOpen) {
      setLocationStep(selectedProvinceCode ? "ward" : "city");
      setLocationSearch("");
    }
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === "undefined") return;

    if (window.location.pathname === "/") {
      e.preventDefault();

      const startPosition =
        window.pageYOffset || document.documentElement.scrollTop;
      if (startPosition <= 0) return;

      const duration = 550;
      const startTime = performance.now();
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const animateScroll = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = easeOutCubic(progress);
        window.scrollTo(0, startPosition * (1 - ease));
        if (progress < 1) window.requestAnimationFrame(animateScroll);
      };

      window.requestAnimationFrame(animateScroll);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-background/90 dark:bg-[#162032]/95 backdrop-blur-md border-b border-border dark:border-[#223147] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 gap-4">
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              href="/"
              onClick={handleLogoClick}
              className="flex items-center group focus:outline-none cursor-pointer"
              title="Về đầu trang HomeSpace"
            >
              <Image
                src="/logo/homespace-horizontal-logo-crop-removebg.png"
                alt="HomeSpace Logo"
                width={866}
                height={288}
                priority
                style={{ width: "auto" }}
                className="h-10 sm:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>

            <div className="relative shrink-0 hidden sm:block" ref={locationDropdownRef}>
              <button
                type="button"
                onClick={openLocationPicker}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border transition-all cursor-pointer text-xs font-semibold shadow-2xs ${isLocationOpen || selectedWardId
                    ? "border-primary/50 bg-muted text-primary"
                    : "border-border bg-card text-foreground hover:bg-muted hover:border-primary/40"
                  }`}
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[160px] md:max-w-[220px]">
                  {locationLabel}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${isLocationOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isLocationOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border p-2 z-50 animate-in fade-in-50 zoom-in-95">
                  {locationStep === "ward" && selectedProvinceCode ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setLocationStep("city");
                          setLocationSearch("");
                        }}
                        className="w-full mb-2 flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{selectedProvinceName}</span>
                        <span className="ml-auto text-primary">Đổi tỉnh</span>
                      </button>
                      <div className="relative mb-2 px-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                          type="text"
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          placeholder="Tìm phường/xã..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg border border-border focus:outline-none focus:border-primary text-foreground"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
                        {wardError ? (
                          <div role="alert" className="p-3 text-xs text-destructive">{wardError}</div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleSelectWard(null)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${!selectedWardId
                              ? "bg-primary/10 text-primary font-bold"
                              : "text-foreground hover:bg-muted"
                            }`}
                        >
                          <span>Toàn {selectedProvinceName.replace("Thành phố ", "").replace("Tỉnh ", "")}</span>
                          {!selectedWardId && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </button>
                        {loadingWards ? (
                          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            <span>Đang tải danh sách...</span>
                          </div>
                        ) : filteredWards.length > 0 ? (
                          filteredWards.map((ward) => {
                            const isSelected = selectedWardId === ward.code;
                            return (
                              <button
                                key={ward.code}
                                type="button"
                                onClick={() => handleSelectWard(ward)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${isSelected
                                    ? "bg-primary/10 text-primary font-bold"
                                    : "text-foreground hover:bg-muted"
                                  }`}
                              >
                                <span className="truncate">{ward.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                            Không tìm thấy phường/xã
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative mb-2 px-1">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                          type="text"
                          value={locationSearch}
                          onChange={(e) => setLocationSearch(e.target.value)}
                          placeholder="Tìm tỉnh thành..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg border border-border focus:outline-none focus:border-primary text-foreground"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
                        {loadingProvinces ? (
                          <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                            <span>Đang tải danh sách...</span>
                          </div>
                        ) : catalogError ? (
                          <div role="alert" className="p-3 text-xs text-destructive">
                            {catalogError}
                            <button type="button" onClick={() => setCatalogReload((value) => value + 1)} className="ml-2 underline">Thử lại</button>
                          </div>
                        ) : filteredProvinces.length > 0 ? (
                          filteredProvinces.map((p) => {
                            const isSelected = String(selectedProvinceCode) === String(p.code);
                            return (
                              <button
                                key={p.code}
                                type="button"
                                onClick={() => handleSelectProvince(p)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${isSelected
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
                    </>
                  )}
                </div>
              )}
            </div>

            <Link
              href={rentHref}
              className="hidden md:flex items-center text-sm font-semibold text-foreground/90 hover:text-primary transition-colors px-2 py-1"
            >
              <span>Nhà Cho Thuê</span>
            </Link>

            <Link
              href="/news"
              className="hidden md:flex items-center text-sm font-semibold text-foreground/80 hover:text-primary transition-colors px-2 py-1"
            >
              <span>Tin tức</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {authenticated ? (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/favorites"
                  title="Danh sách yêu thích"
                  className="relative w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 dark:hover:bg-muted transition-colors cursor-pointer"
                >
                  <Heart className="w-4 h-4" />
                  {favoriteCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                      {favoriteCount}
                    </span>
                  )}
                </Link>

                <NotificationDropdown initialCount={5} />

                <div className="hidden items-center gap-2 sm:flex">
                  {isDashboard ? (
                    <button
                      type="button"
                      onClick={goToPostListing}
                      className="h-10 px-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-primary-foreground" />
                      <span>Đăng tin</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={goToDashboard}
                      className="h-10 px-4 rounded-full border border-border bg-card text-foreground hover:bg-muted text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                      <span>Bảng điều khiển</span>
                    </button>
                  )}
                </div>

                <UserDropdown />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="#download-app"
                  className="h-10 flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors px-3 rounded-full hover:bg-muted"
                >
                  <Smartphone className="w-4 h-4 text-accent-ai" />
                  <span>Tải ứng dụng</span>
                </Link>

                <div className="h-5 w-px bg-border mx-1" />

                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => login()}
                    className="text-foreground hover:text-primary transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    Đăng nhập
                  </button>
                  <span className="text-muted-foreground font-light">|</span>
                  <button
                    type="button"
                    onClick={() => register()}
                    className="text-primary hover:underline transition-colors px-2.5 py-1.5 rounded-lg hover:bg-primary/10 cursor-pointer"
                  >
                    Đăng ký
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-1.5">
            {authenticated && <UserDropdown />}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-foreground hover:text-primary hover:bg-muted transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-xl">
          <div className="space-y-2 rounded-xl border border-border bg-muted/70 p-3">
            <div className="flex items-center gap-2 px-1 pb-1 text-xs font-bold text-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{locationLabel}</span>
            </div>
            <select
              value={selectedProvinceCode}
              onChange={(e) => {
                const code = e.target.value;
                const prov = provinces.find((p) => p.code === code);
                if (prov) handleSelectProvince(prov);
              }}
              className="w-full h-10 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="">Chọn tỉnh/thành phố</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code} className="bg-card text-foreground">
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={selectedWardId}
              disabled={!selectedProvinceCode || loadingWards}
              onChange={(e) => {
                const code = e.target.value;
                if (!code) handleSelectWard(null);
                else {
                  const ward = wards.find((item) => item.code === code);
                  if (ward) handleSelectWard(ward);
                }
              }}
              className="w-full h-10 px-3 rounded-lg border border-border bg-card text-xs font-semibold text-foreground focus:outline-none cursor-pointer disabled:opacity-60"
            >
              <option value="">
                {selectedProvinceCode ? `Toàn ${selectedProvinceName.replace("Thành phố ", "").replace("Tỉnh ", "")}` : "Chọn tỉnh trước"}
              </option>
              {wards.map((ward) => (
                <option key={ward.code} value={ward.code} className="bg-card text-foreground">
                  {ward.name}
                </option>
              ))}
            </select>
          </div>

          <nav className="flex flex-col space-y-1">
            <Link
              href="/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <span>Thông báo</span>
              </div>
            </Link>

            {authenticated && (
              <Link
                href="/favorites"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span>Danh sách yêu thích</span>
                </div>
                {favoriteCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-2xs">
                    {favoriteCount}
                  </span>
                )}
              </Link>
            )}

            <Link
              href="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <span>Lịch sử xem tin</span>
              </div>
              {historyCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {historyCount}
                </span>
              )}
            </Link>

            <Link
              href={rentHref}
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-3 transition-colors"
            >
              <span>Nhà Cho Thuê</span>
            </Link>

            <Link
              href="/news"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-3 transition-colors"
            >
              <span>Tin tức & Thị trường</span>
            </Link>

            {!authenticated && (
              <Link
                href="#download-app"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-3 transition-colors"
              >
                <span>Tải ứng dụng HomeSpace</span>
              </Link>
            )}
          </nav>

          <div className="pt-3 border-t border-border flex flex-col gap-2.5">
            {authenticated ? (
              <div className="flex items-center justify-between px-1">
                <Link
                  href="#"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <UserAvatar
                    src={avatarUrl}
                    name={username || "User"}
                    sizeClassName="h-8 w-8 text-xs"
                  />
                  <span>{username || "Tài khoản của tôi"}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                >
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-2 w-full pt-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    login();
                  }}
                  className="flex-1 justify-center gap-1.5 text-foreground border-border hover:bg-muted rounded-full h-10 cursor-pointer text-xs font-semibold"
                >
                  Đăng nhập
                </Button>
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    register();
                  }}
                  className="flex-1 justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-10 cursor-pointer text-xs font-semibold"
                >
                  Đăng ký
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>

      {authenticated && !mobileMenuOpen && (
        <div className="fixed top-[88px] right-4 z-40 flex gap-2 sm:hidden select-none animate-in fade-in-50 duration-200">
          {isDashboard ? (
            <button
              type="button"
              onClick={goToPostListing}
              className="h-9 px-3.5 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-primary-foreground" />
              <span>Đăng tin</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={goToDashboard}
              className="h-9 px-3.5 rounded-full border border-border bg-card/95 backdrop-blur-md shadow-md text-foreground hover:bg-muted text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Bảng điều khiển</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
