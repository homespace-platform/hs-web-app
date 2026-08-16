"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Menu,
  X,
  Smartphone,
  PlusCircle,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
} from "lucide-react";

export default function Navbar() {
  const { authenticated, profileName, login, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 w-full z-50 bg-[#F8FAFC]/90 dark:bg-[#090D16]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo & Navigation Links */}
          <div className="flex items-center gap-8 lg:gap-10">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-heading">
                  Home<span className="text-blue-600">Space</span>
                </span>
                <span className="text-[9px] uppercase tracking-widest font-semibold text-cyan-600 dark:text-cyan-400">
                  PropTech Web3
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-7">
              <Link
                href="/#featured-listings"
                className="text-sm font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
              >
                Nhà đất cho thuê
              </Link>
              <Link
                href="/#tech-features"
                className="text-sm font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
              >
                Công nghệ & AI
              </Link>
              <Link
                href="/#popular-locations"
                className="text-sm font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
              >
                Khu vực nổi bật
              </Link>
              <Link
                href="/#location-map"
                className="text-sm font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
              >
                Bản đồ vị trí
              </Link>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="#download-app"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 dark:text-slate-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Smartphone className="w-4 h-4 text-cyan-600" />
              <span>Tải ứng dụng</span>
            </Link>

            <Link href="#landlord-cta">
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm hover:shadow-md transition-all gap-1.5 px-4 h-9 rounded-lg"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Đăng tin</span>
              </Button>
            </Link>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

            {/* Auth Status */}
            {authenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">
                    {profileName || "Tài khoản"}
                  </span>
                </Link>
                <button
                  onClick={() => logout()}
                  title="Đăng xuất"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-semibold">
                <button
                  onClick={() => login()}
                  className="text-slate-700 hover:text-blue-600 dark:text-slate-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Đăng nhập
                </button>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <button
                  onClick={() => login()}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800"
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-1">
            <Link
              href="/#featured-listings"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800"
            >
              Nhà đất cho thuê
            </Link>
            <Link
              href="/#tech-features"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800"
            >
              Công nghệ & AI
            </Link>
            <Link
              href="/#popular-locations"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800"
            >
              Khu vực nổi bật
            </Link>
            <Link
              href="/#location-map"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800"
            >
              Khám phá bản đồ
            </Link>
          </nav>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
            <Link
              href="#landlord-cta"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold justify-center gap-2">
                <PlusCircle className="w-4 h-4" />
                Đăng tin cho thuê
              </Button>
            </Link>

            {authenticated ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white"
                >
                  <UserIcon className="w-4 h-4 text-blue-600" />
                  <span>{profileName || "Trang cá nhân"}</span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setMobileMenuOpen(false);
                  login();
                }}
                className="w-full justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Đăng nhập / Đăng ký
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
