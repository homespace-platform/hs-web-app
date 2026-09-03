"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/useAuth";
import {
  LayoutGrid,
  Wallet,
  LogOut,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ArrowRight,
  Heart,
  Clock,
  Calendar,
  Settings,
} from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import { useAppSelector } from "@/store/hooks";

export default function UserDropdown() {
  const { username, avatarUrl, logout } = useAuth();
  const favoriteCount = useAppSelector((state) => state.favorite.count);
  const historyCount = useAppSelector((state) => state.history.count);
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

  const displayName = username || "Người dùng";
  const initialLetter = displayName.charAt(0).toUpperCase() || "U";

  // Mock wallet data
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
        className={`h-10 flex items-center gap-2 pl-1 pr-3.5 rounded-full border transition-all cursor-pointer ${isOpen
            ? "border-primary/50 bg-muted shadow-sm"
            : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted"
          }`}
      >
        {/* Avatar with status indicator */}
        <div className="relative">
          <UserAvatar
            src={avatarUrl}
            name={displayName}
            sizeClassName="w-8 h-8 text-sm"
          />
          {/* Active online green dot */}
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-verified border-2 border-card rounded-full" />
        </div>

        {/* Username */}
        <span className="text-sm font-semibold text-foreground max-w-[120px] truncate">
          {displayName}
        </span>

        {/* Chevron Icon */}
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[calc(100vw-32px)] sm:w-80 max-w-sm bg-popover text-popover-foreground rounded-3xl shadow-2xl border border-border p-3.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto no-scrollbar">
          {/* 1. Wallet Card ("SỐ DƯ VÍ") */}
          <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-2xl p-3.5 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-primary">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  SỐ DƯ VÍ
                </span>
              </div>
              <Link
                href="#"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                <span>Xem tất cả</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* 2 Wallet Sub-Boxes */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-card rounded-xl p-2.5 border border-border shadow-2xs">
                <p className="text-[11px] text-muted-foreground font-medium">Khả dụng</p>
                <p className="text-sm font-bold text-foreground mt-0.5">
                  {walletData.available}
                </p>
              </div>
              <div className="bg-card rounded-xl p-2.5 border border-border shadow-2xs">
                <p className="text-[11px] text-muted-foreground font-medium">Đang giữ</p>
                <p className="text-sm font-bold text-foreground mt-0.5">
                  {walletData.holding}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Nhóm: Tổng quan & Tiện ích */}
          <nav className="space-y-0.5">
            {/* Tổng quan */}
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-foreground hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-semibold">Tổng quan</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>

            {/* Divider */}
            <div className="my-1.5 border-t border-border" />

            {/* 3. Nhóm: Tiện ích */}
            <div className="text-[11px] font-bold text-muted-foreground uppercase px-3 pt-1.5 pb-1 tracking-wider">
              Tiện ích
            </div>

            {/* Tin đã lưu */}
            <Link
              href="/favorites"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-foreground hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-muted-foreground group-hover:text-rose-500 transition-colors" />
                <span className="text-xs font-semibold">Tin đã lưu</span>
              </div>
              <div className="flex items-center gap-1.5">
                {favoriteCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                    {favoriteCount}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* Lịch sử xem tin */}
            <Link
              href="/history"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-foreground hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-semibold">Lịch sử xem tin</span>
              </div>
              <div className="flex items-center gap-1.5">
                {historyCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {historyCount}
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>

            {/* Divider */}
            <div className="my-1.5 border-t border-border" />

            {/* Cài đặt */}
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-foreground hover:bg-muted transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-semibold">Cài đặt</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>

            {/* Divider */}
            <div className="my-1.5 border-t border-border" />

            {/* Đăng xuất */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-foreground hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4 text-muted-foreground group-hover:text-rose-600 transition-colors" />
                <span className="text-xs font-semibold">Đăng xuất</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all" />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
