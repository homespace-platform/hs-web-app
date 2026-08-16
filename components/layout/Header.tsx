"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import UserDropdown from "./UserDropdown";
import NotificationDropdown from "@/components/notification/NotificationDropdown";
import ThemeToggle from "@/components/theme/ThemeToggle";
import provinceService from "@/services/province.service";
import { Province } from "@/types/province.type";
import {
  Menu,
  X,
  Smartphone,
  LogIn,
  UserPlus,
  Bell,
  MessageCircle,
  LayoutGrid,
  Heart,
  MapPin,
  ChevronDown,
  Search,
  Check,
  Loader2,
  Clock,
  User,
  LogOut,
  Newspaper,
} from "lucide-react";

export default function Header() {
  const { authenticated, login, register, logout, username, profileName } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(24);

  // Province States
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number>(79);
  const [selectedProvinceName, setSelectedProvinceName] = useState<string>("Thành phố Hồ Chí Minh");
  const [isProvinceOpen, setIsProvinceOpen] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState("");
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const provinceDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        provinceDropdownRef.current &&
        !provinceDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProvinceOpen(false);
      }
    }

    if (isProvinceOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProvinceOpen]);

  // Sync favorites count
  useEffect(() => {
    try {
      const saved = localStorage.getItem("homespace_saved_favorites");
      if (saved) {
        const ids = JSON.parse(saved);
        if (Array.isArray(ids) && ids.length > 0) {
          setFavoriteCount(ids.length);
        }
      }
    } catch {
      // ignore
    }

    const handleFavUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.ids) {
        setFavoriteCount(customEvent.detail.ids.length);
      }
    };
    window.addEventListener("favoritesUpdated", handleFavUpdate);
    return () => {
      window.removeEventListener("favoritesUpdated", handleFavUpdate);
    };
  }, []);

  // Fetch Provinces & Initialize from LocalStorage
  useEffect(() => {
    let isMounted = true;

    try {
      const saved = localStorage.getItem("homespace_selected_province");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.code && parsed?.name) {
          setSelectedProvinceCode(parsed.code);
          setSelectedProvinceName(parsed.name);
        }
      }
    } catch {
      // Ignore local storage parse error
    }

    const fetchProvinces = async () => {
      try {
        setLoadingProvinces(true);
        const data = await provinceService.getProvinces();
        if (isMounted && data && data.length > 0) {
          setProvinces(data);
          const saved = localStorage.getItem("homespace_selected_province");
          if (!saved) {
            const hcm = data.find((p) => p.code === 79);
            if (hcm) {
              setSelectedProvinceCode(hcm.code);
              setSelectedProvinceName(hcm.name);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load provinces in Header:", error);
      } finally {
        if (isMounted) setLoadingProvinces(false);
      }
    };

    fetchProvinces();
    return () => {
      isMounted = false;
    };
  }, []);

  // Save province to LocalStorage on change
  const handleSelectProvince = (province: Province) => {
    setSelectedProvinceCode(province.code);
    setSelectedProvinceName(province.name);
    setIsProvinceOpen(false);
    setProvinceSearch("");

    try {
      localStorage.setItem(
        "homespace_selected_province",
        JSON.stringify({ code: province.code, name: province.name })
      );
      localStorage.removeItem("homespace_selected_district");
      window.dispatchEvent(
        new CustomEvent("provinceChanged", {
          detail: { code: province.code, name: province.name },
        })
      );
    } catch (e) {
      console.error("Failed to save province to localStorage:", e);
    }
  };

  // Filter provinces list
  const filteredProvinces = useMemo(() => {
    if (!provinceSearch.trim()) return provinces;
    return provinces.filter((p) =>
      p.name.toLowerCase().includes(provinceSearch.toLowerCase())
    );
  }, [provinces, provinceSearch]);

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-background/90 backdrop-blur-md border-b border-border transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 gap-4">
          {/* Left: Logo & Province Selector */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link
              href="/"
              className="flex items-center group focus:outline-none"
            >
              <Image
                src="/logo/homespace-horizontal-logo-crop-removebg.png"
                alt="HomeSpace Logo"
                width={180}
                height={46}
                priority
                className="h-10 sm:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>

            {/* Select Tỉnh/Thành Phố (Không có ô search) */}
            <div className="relative shrink-0 hidden sm:block" ref={provinceDropdownRef}>
              <button
                type="button"
                onClick={() => setIsProvinceOpen(!isProvinceOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full border transition-all cursor-pointer text-xs font-semibold shadow-2xs ${
                  isProvinceOpen
                    ? "border-primary/50 bg-muted text-primary"
                    : "border-border bg-card text-foreground hover:bg-muted hover:border-primary/40"
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate max-w-[140px] md:max-w-[180px]">
                  {loadingProvinces ? "Đang tải..." : selectedProvinceName}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${
                    isProvinceOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu Chọn Tỉnh Thành */}
              {isProvinceOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-popover text-popover-foreground rounded-2xl shadow-2xl border border-border p-2 z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="relative mb-2 px-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={provinceSearch}
                      onChange={(e) => setProvinceSearch(e.target.value)}
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
                    ) : filteredProvinces.length > 0 ? (
                      filteredProvinces.map((p) => {
                        const isSelected = selectedProvinceCode === p.code;
                        return (
                          <button
                            key={p.code}
                            type="button"
                            onClick={() => handleSelectProvince(p)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 text-primary font-bold"
                                : "text-foreground hover:bg-muted"
                            }`}
                          >
                            <span className="truncate">{p.name}</span>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
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
            
            {/* Link Tin tức (Dạng text link nhẹ nhàng sau chọn tỉnh) */}
            <Link
              href="/news"
              className="hidden md:flex items-center text-sm font-semibold text-foreground/80 hover:text-primary transition-colors px-2 py-1"
            >
              <span>Tin tức</span>
            </Link>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-2.5 shrink-0">
            {/* Theme Mode Switcher */}
            <ThemeToggle />

            {authenticated ? (
              /* State 1: Authenticated User (Đã đăng nhập) */
              <div className="flex items-center gap-2.5">
                {/* Yêu thích */}
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

                {/* Tin nhắn / Chat */}
                <Link
                  href="/chat"
                  title="Tin nhắn"
                  className="relative w-10 h-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none shadow-xs">
                    3
                  </span>
                </Link>

                {/* Thông báo với popup danh sách */}
                <NotificationDropdown initialCount={5} />

                {/* Quản lý tin */}
                <Link href="/profile#listings">
                  <button
                    type="button"
                    className="h-10 px-4 rounded-full border border-border bg-card text-foreground hover:bg-muted text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                    <span>Quản lý tin</span>
                  </button>
                </Link>

                {/* User Dropdown */}
                <UserDropdown />
              </div>
            ) : (
              /* State 2: Guest / Unauthenticated (Chưa đăng nhập) */
              <div className="flex items-center gap-3">
                {/* Yêu thích */}
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

                {/* Tải ứng dụng */}
                <Link
                  href="#download-app"
                  className="h-10 flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary transition-colors px-3 rounded-full hover:bg-muted"
                >
                  <Smartphone className="w-4 h-4 text-accent-ai" />
                  <span>Tải ứng dụng</span>
                </Link>

                {/* Divider */}
                <div className="h-5 w-px bg-border mx-1" />

                {/* Login / Register */}
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

          {/* Mobile Menu Button & Action Controls */}
          <div className="md:hidden flex items-center gap-1.5">
            <ThemeToggle />
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-200 shadow-xl">
          {/* Mobile Province Select */}
          <div className="flex items-center h-11 bg-muted rounded-xl px-3 border border-border">
            <MapPin className="w-4 h-4 text-primary shrink-0 mr-2" />
            <select
              value={selectedProvinceCode}
              onChange={(e) => {
                const code = Number(e.target.value);
                const prov = provinces.find((p) => p.code === code);
                if (prov) handleSelectProvince(prov);
              }}
              className="w-full bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              {provinces.map((p) => (
                <option key={p.code} value={p.code} className="bg-card text-foreground">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <nav className="flex flex-col space-y-1">
            {/* Thông báo (Navigate tới /notifications) */}
            <Link
              href="/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-rose-500" />
                <span>Thông báo</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-2xs">
                5
              </span>
            </Link>

            {/* Tin nhắn */}
            <Link
              href="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span>Tin nhắn & Trò chuyện</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shadow-2xs">
                3
              </span>
            </Link>

            {/* Yêu thích */}
            <Link
              href="/favorites"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-rose-500" />
                <span>Danh sách yêu thích</span>
              </div>
              {favoriteCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-2xs">
                  {favoriteCount}
                </span>
              )}
            </Link>

            {/* Lịch sử xem tin */}
            <Link
              href="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-primary" />
                <span>Lịch sử xem tin</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                40
              </span>
            </Link>

            {/* Quản lý tin */}
            {authenticated && (
              <Link
                href="/profile#listings"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-3 transition-colors"
              >
                <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                <span>Quản lý tin đăng</span>
              </Link>
            )}

            {/* Tin tức & Thị trường */}
            <Link
              href="/news"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-3 transition-colors"
            >
              <Newspaper className="w-4 h-4 text-primary" />
              <span>Tin tức & Thị trường</span>
            </Link>

            {/* Tải ứng dụng */}
            <Link
              href="#download-app"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2.5 rounded-xl text-sm font-semibold text-foreground hover:bg-muted flex items-center gap-3 transition-colors"
            >
              <Smartphone className="w-4 h-4 text-accent-ai" />
              <span>Tải ứng dụng HomeSpace</span>
            </Link>
          </nav>

          {/* User Auth Section */}
          <div className="pt-3 border-t border-border flex flex-col gap-2.5">
            {authenticated ? (
              <div className="flex items-center justify-between px-1">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 text-xs font-semibold text-foreground hover:text-primary transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-xs">
                    {(username || profileName || "U").charAt(0).toUpperCase()}
                  </div>
                  <span>{username || profileName || "Tài khoản của tôi"}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
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
                  <LogIn className="w-4 h-4" />
                  Đăng nhập
                </Button>
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    register();
                  }}
                  className="flex-1 justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-10 cursor-pointer text-xs font-semibold"
                >
                  <UserPlus className="w-4 h-4" />
                  Đăng ký
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
