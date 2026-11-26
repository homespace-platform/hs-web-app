"use client";

import { PolicyNotice } from "@/components/common/PolicyDialog";
import React from "react";
import Link from "next/link";
import {
  Crown,
  Sparkles,
  ShieldCheck,
  CalendarClock,
  ArrowUpRight,
  Infinity as InfinityIcon,
  RefreshCw,
} from "lucide-react";
import {
  formatVndPrice,
  formatVnDateTime,
  getAddonBalanceLabel,
  getPublishableUses,
  getQuotaResetLabel,
  getTierLabel,
  getTierShortLabel,
  isUnlimitedMembership,
} from "@/lib/membership";
import type { MembershipAddonOffer, MembershipView } from "@/types/membership.type";
import type { UserProfile } from "@/types/user.type";

interface MembershipStatusCardProps {
  membership: MembershipView | null;
  profile?: UserProfile | null;
  loading?: boolean;
  compact?: boolean;
  showManageLink?: boolean;
  onRefresh?: () => void;
  /** Full view only: uses included in the current plan, and the server's extra-use offer. */
  planQuota?: number;
  addonOffer?: MembershipAddonOffer | null;
  /** Overrides the "buy extra uses" link, e.g. so the editor keeps its form data. */
  onBuyAddon?: () => void;
}

function formatDateTimeVi(iso?: string | null): string {
  if (!iso) return "Không giới hạn thời gian";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function MembershipStatusCard({
  membership,
  profile,
  loading = false,
  compact = false,
  showManageLink = true,
  onRefresh,
  planQuota,
  addonOffer,
  onBuyAddon,
}: MembershipStatusCardProps) {
  const unlimited = isUnlimitedMembership(membership, profile);
  const tierCode = unlimited ? "ADMIN" : membership?.tier ?? "FREE";
  const quotaResetLabel = unlimited ? null : getQuotaResetLabel(membership);
  const remainingUses = membership?.remainingUses ?? 0;
  const reservedUses = membership?.reservedUses ?? 0;
  const freeUsed = membership?.freeUsed ?? 0;
  const addonRemaining = membership?.addonRemaining ?? 0;
  const addonReserved = membership?.addonReserved ?? 0;
  const addonLabel = unlimited ? null : getAddonBalanceLabel(membership);
  const publishableUses = getPublishableUses(membership);
  const lowQuota = !unlimited && publishableUses <= 1;
  const exhausted = !unlimited && membership !== null && publishableUses === 0;

  if (loading && !membership) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 animate-pulse shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-40 bg-muted rounded-md" />
            <div className="h-6 w-64 bg-muted rounded-md" />
          </div>
          <div className="h-9 w-36 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={`rounded-2xl border p-4 shadow-2xs transition-all ${
          unlimited
            ? "border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/50 dark:bg-indigo-950/30"
            : lowQuota
            ? "border-amber-200 bg-amber-50/70 dark:border-amber-900/50 dark:bg-amber-950/30"
            : "border-border bg-card"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                unlimited
                  ? "bg-indigo-600 text-white"
                  : lowQuota
                  ? "bg-amber-500 text-white"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {unlimited ? <InfinityIcon className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
            </div>

            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Gói hội viên:
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-extrabold text-primary">
                  {getTierShortLabel(tierCode)}
                </span>

                {unlimited ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600/15 border border-indigo-500/30 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Không giới hạn lượt (Chế độ ADMIN / Kiểm thử)
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      publishableUses > 0
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    Lượt gói còn: {remainingUses}
                  </span>
                )}

                {addonLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                    {addonLabel}
                  </span>
                )}

                {reservedUses + addonReserved > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    Đang giữ chỗ chờ duyệt: {reservedUses + addonReserved} lượt
                  </span>
                )}

                {!unlimited && membership?.expiresAt && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Hạn gói: {formatDateTimeVi(membership.expiresAt)}
                  </span>
                )}

                {quotaResetLabel && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {quotaResetLabel}
                  </span>
                )}
              </div>

              <PolicyNotice tone="neutral" title="Hạn mức đăng tin" text={unlimited
                  ? "Tài khoản Quản trị viên có hạn mức đăng tin không giới hạn để kiểm thử và vận hành. Lưu nháp và chỉnh sửa luôn miễn phí."
                  : "Lưu tin nháp và chỉnh sửa nội dung miễn phí. Tạo mới gửi duyệt hoặc đăng lại tin cần 1 lượt. Tin đã hiển thị vẫn giữ nguyên tới hết hạn riêng của bài đăng ngay cả khi gói hết hạn."} />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start lg:self-center">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Cập nhật hạn mức"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            {exhausted && (onBuyAddon ? (
              <button
                type="button"
                onClick={onBuyAddon}
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/10 cursor-pointer"
              >
                Mua thêm lượt
              </button>
            ) : (
              <Link
                href="/dashboard/membership?addon=1"
                className="inline-flex items-center gap-1.5 rounded-xl border border-primary px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/10"
              >
                Mua thêm lượt
              </Link>
            ))}
            {showManageLink && (
              <Link
                href="/dashboard/membership"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{unlimited ? "Xem bảng gói hội viên" : "Mua / Nâng cấp gói"}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isFreeTier = tierCode === "FREE";
  // The server's freeUsed is per FREE period; a paid plan's used count is what is neither left nor held.
  const planUsed = isFreeTier
    ? freeUsed
    : planQuota !== undefined
    ? Math.max(0, planQuota - remainingUses - reservedUses)
    : null;
  const addonExpiry = addonRemaining ? formatVnDateTime(membership?.addonExpiresAt) : null;
  const held = reservedUses + addonReserved;
  const validityLabel = unlimited
    ? "Vĩnh viễn (ADMIN)"
    : membership?.expiresAt
    ? `Hạn gói: ${formatDateTimeVi(membership.expiresAt)}`
    : quotaResetLabel;

  return (
    <section aria-label="Số dư lượt đăng tin" className="rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-base font-bold text-foreground">
          {membership || unlimited ? getTierLabel(tierCode) : "Chưa tải được thông tin gói"}
        </h2>
        {validityLabel && <p className="text-sm text-muted-foreground">{validityLabel}</p>}
      </div>

      {unlimited ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Tài khoản ADMIN được đăng và đăng lại tin không giới hạn số lượt.
        </p>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="space-y-1 px-5 py-4">
            <p className="text-sm text-muted-foreground">{isFreeTier ? "Lượt miễn phí còn lại" : "Lượt gói còn lại"}</p>
            <p className="text-3xl font-bold tabular-nums text-foreground">{membership ? remainingUses : "—"}</p>
            {membership && planUsed !== null && planQuota !== undefined && (
              <p className="text-sm text-muted-foreground">Đã dùng {planUsed}/{planQuota} lượt</p>
            )}
          </div>

          <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Lượt mua thêm</p>
              <p className="text-3xl font-bold tabular-nums text-foreground">{membership ? addonRemaining : "—"}</p>
              {addonExpiry && <p className="text-sm text-muted-foreground">Hạn gần nhất: {addonExpiry}</p>}
              {addonOffer && (
                <p className="text-sm text-muted-foreground">
                  {formatVndPrice(addonOffer.unitPriceVnd)}/lượt, dùng trong {addonOffer.validDays} ngày
                </p>
              )}
            </div>
            {onBuyAddon && (
              <button
                type="button"
                onClick={onBuyAddon}
                className="min-h-11 shrink-0 cursor-pointer self-start rounded-xl border border-primary px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-blue-300 lg:self-center"
              >
                Mua thêm lượt
              </button>
            )}
          </div>
        </div>
      )}

      {!unlimited && (
        <div className="space-y-1 border-t border-border px-5 py-3 text-sm text-muted-foreground">
          {held > 0 && (
            <p className="font-semibold text-foreground">{held} lượt đang giữ chỗ cho tin chờ duyệt.</p>
          )}
          <p>Lượt gói được dùng trước; lượt mua thêm giữ nguyên khi đổi gói.</p>
        </div>
      )}
    </section>
  );
}
