"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/useAuth";
import {
  LayoutGrid,
  LogOut,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Heart,
  Clock,
  Settings,
  Crown,
  Infinity as InfinityIcon,
} from "lucide-react";
import UserAvatar from "@/components/common/UserAvatar";
import { useAppSelector } from "@/store/hooks";
import { useDashboardRole } from "@/components/dashboard/DashboardRoleContext";
import membershipService from "@/services/membership.service";
import {
  getTierShortLabel,
  isMembershipExpired,
  isUnlimitedMembership,
} from "@/lib/membership";
import type { MembershipView } from "@/types/membership.type";

export default function UserDropdown() {
  const { authenticated, username, avatarUrl, profile, logout } = useAuth();
  const favoriteCount = useAppSelector((state) => state.favorite.count);
  const historyCount = useAppSelector((state) => state.history.count);
  const { openRolePicker } = useDashboardRole();
  const [isOpen, setIsOpen] = useState(false);
  const [membership, setMembership] = useState<MembershipView | null>(null);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [membershipError, setMembershipError] = useState(false);
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

  useEffect(() => {
    if (!authenticated) {
      setMembership(null);
      setLoadingMembership(false);
      setMembershipError(false);
      return;
    }
    if (!isOpen) return;

    let cancelled = false;
    setLoadingMembership(true);
    setMembershipError(false);

    membershipService
      .getMyMembership()
      .then((me) => {
        if (!cancelled) {
          setMembership(me);
          setMembershipError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMembership(null);
          setMembershipError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMembership(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authenticated, isOpen]);

  const displayName = username || "Người dùng";
  const unlimited = isUnlimitedMembership(membership, profile);
  const expired = !unlimited && membership !== null && isMembershipExpired(membership.expiresAt);

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
          {/* 1. Nhóm: Bảng điều khiển & Gói hội viên */}
          <nav className="space-y-1">
            {/* Bảng điều khiển */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                openRolePicker();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-foreground hover:bg-muted transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <LayoutGrid className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs font-semibold">Bảng điều khiển</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* Gói hội viên & Lượt đăng tin (True package/quota summary) */}
            <Link
              href="/dashboard/membership"
              onClick={() => setIsOpen(false)}
              data-testid="user-menu-membership-link"
              className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 text-foreground transition-colors group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  {unlimited ? (
                    <InfinityIcon className="w-4 h-4" />
                  ) : (
                    <Crown className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold">Gói hội viên & Lượt đăng</span>
                    {unlimited ? (
                      <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                        ADMIN
                      </span>
                    ) : !loadingMembership && membership ? (
                      <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                        {getTierShortLabel(membership.tier)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {unlimited
                      ? "Không giới hạn lượt đăng (∞)"
                      : loadingMembership || (!membership && !membershipError)
                      ? "Đang tải thông tin gói & lượt đăng..."
                      : membership
                      ? `Còn ${membership.remainingUses} lượt khả dụng${
                          membership.reservedUses > 0
                            ? ` • ${membership.reservedUses} chờ duyệt`
                            : ""
                        }${expired ? " • Đã hết hạn" : ""}`
                      : "Tạm thời chưa tải được hạn mức • Xem chi tiết"}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
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
              href="/settings/profile"
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
