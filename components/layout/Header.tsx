"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import UserDropdown from "./UserDropdown";
import {
  Menu,
  X,
  Smartphone,
  PlusCircle,
  LogIn,
  UserPlus,
  Bell,
  MessageCircle,
  LayoutGrid,
} from "lucide-react";

export default function Header() {
  const { authenticated, login, register } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#F8FAFC]/90 dark:bg-[#090D16]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Left: Logo & Navigation Links */}
          <div className="flex items-center gap-8 lg:gap-10">
            <Link
              href="/"
              className="flex items-center group focus:outline-none"
            >
              <Image
                src="/homespace-horizontal-logo-removebg.png"
                alt="HomeSpace Logo"
                width={180}
                height={46}
                priority
                className="h-10 sm:h-11 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </Link>

            <nav className="hidden md:flex items-center gap-7">
              <Link
                href="/#featured-listings"
                className="text-sm font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors"
              >
                Nhà cho thuê
              </Link>
            </nav>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {authenticated ? (
              /* Authenticated User Header Actions */
              <div className="flex items-center gap-2.5">
                {/* 1. Chat Icon */}
                <button
                  type="button"
                  title="Tin nhắn"
                  className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>

                {/* 2. Notification Bell with Badge */}
                <button
                  type="button"
                  title="Thông báo"
                  className="relative w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                    6
                  </span>
                </button>

                {/* 3. Quản lý tin button */}
                <Link href="/profile#listings">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-3.5 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium gap-1.5"
                  >
                    <LayoutGrid className="w-4 h-4 text-slate-500" />
                    <span>Quản lý tin</span>
                  </Button>
                </Link>

                {/* 4. Đăng tin button */}
                <Link href="#landlord-cta">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium"
                  >
                    Đăng tin
                  </Button>
                </Link>

                {/* 5. User Dropdown Menu Component */}
                <UserDropdown />
              </div>
            ) : (
              /* Guest / Unauthenticated Header Actions */
              <div className="flex items-center gap-4">
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

                <div className="flex items-center gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => login()}
                    className="text-slate-700 hover:text-blue-600 dark:text-slate-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Đăng nhập
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={() => register()}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Đăng ký
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {authenticated && <UserDropdown />}
            <button
              type="button"
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

            {!authenticated && (
              <div className="flex gap-2 w-full pt-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    login();
                  }}
                  className="flex-1 justify-center gap-1.5 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <LogIn className="w-4 h-4" />
                  Đăng nhập
                </Button>
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    register();
                  }}
                  className="flex-1 justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
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
