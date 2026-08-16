"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  LayoutGrid,
  Users,
  Wallet,
  User,
  Lock,
  LogOut,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";

interface UserDropdownProps {
  avatarUrl?: string | null;
}

export default function UserDropdown({ avatarUrl }: UserDropdownProps) {
  const { profileName, email, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const displayName = profileName || email?.split("@")[0] || "Tài khoản";
  const initialLetter = displayName.charAt(0).toUpperCase() || "U";

  // Mock wallet data (before API integration)
  const walletData = {
    available: "0 đ",
    holding: "0 đ",
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full border transition-all cursor-pointer ${
          isOpen
            ? "border-slate-800 bg-slate-100/80 dark:bg-slate-800 dark:border-slate-600 shadow-sm"
            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
        }`}
      >
        {/* Avatar with status indicator */}
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {initialLetter}
            </div>
          )}
          {/* Active online green dot */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
        </div>

        {/* Username */}
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[110px] truncate">
          {displayName}
        </span>

        {/* Chevron Icon */}
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-4 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
          {/* 1. Wallet Card ("SỐ DƯ VÍ") */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-3.5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  SỐ DƯ VÍ
                </span>
              </div>
              <Link
                href="/profile#wallet"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 2 Wallet Sub-Boxes */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white dark:bg-slate-900/90 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800 shadow-2xs">
                <p className="text-[11px] text-slate-400 font-medium">Khả dụng</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {walletData.available}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-900/90 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800 shadow-2xs">
                <p className="text-[11px] text-slate-400 font-medium">Đang giữ</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {walletData.holding}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Menu Navigation Items */}
          <nav className="space-y-1">
            {/* Tổng quan */}
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
                <span className="text-xs font-semibold">Tổng quan</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold leading-none">
                Mới
              </span>
            </Link>

            {/* Quản lý khách hàng */}
            <Link
              href="/profile#customers"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group"
            >
              <Users className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
              <span className="text-xs font-semibold">Quản lý khách hàng</span>
            </Link>

            {/* Ví & giao dịch */}
            <Link
              href="/profile#transactions"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group"
            >
              <Wallet className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
              <span className="text-xs font-semibold">Ví & giao dịch</span>
            </Link>

            {/* Thay đổi thông tin cá nhân */}
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group"
            >
              <User className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
              <span className="text-xs font-semibold">
                Thay đổi thông tin cá nhân
              </span>
            </Link>

            {/* Thay đổi mật khẩu */}
            <Link
              href="/profile#change-password"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors group"
            >
              <Lock className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" />
              <span className="text-xs font-semibold">Thay đổi mật khẩu</span>
            </Link>

            {/* Divider */}
            <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

            {/* Đăng xuất */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-600 transition-colors" />
              <span className="text-xs font-semibold">Đăng xuất</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
