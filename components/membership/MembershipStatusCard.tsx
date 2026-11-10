"use client";

import React from "react";
import Link from "next/link";
import {
  Crown,
  Sparkles,
  ShieldCheck,
  CalendarClock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Infinity as InfinityIcon,
  Layers,
  Info,
  RefreshCw,
} from "lucide-react";
import {
  getTierLabel,
  getTierShortLabel,
  isMembershipExpired,
  isUnlimitedMembership,
} from "@/lib/membership";
import type { MembershipView } from "@/types/membership.type";
import type { UserProfile } from "@/types/user.type";

interface MembershipStatusCardProps {
  membership: MembershipView | null;
  profile?: UserProfile | null;
  loading?: boolean;
  compact?: boolean;
  showManageLink?: boolean;
  onRefresh?: () => void;
  onSelectUpgrade?: () => void;
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
  onSelectUpgrade,
}: MembershipStatusCardProps) {
  const unlimited = isUnlimitedMembership(membership, profile);
  const tierCode = unlimited ? "ADMIN" : membership?.tier ?? "FREE";
  const expired = !unlimited && isMembershipExpired(membership?.expiresAt);
  const remainingUses = membership?.remainingUses ?? 0;
  const reservedUses = membership?.reservedUses ?? 0;
  const freeUsed = membership?.freeUsed ?? 0;
  const lowQuota = !unlimited && remainingUses <= 1;

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
            : lowQuota || expired
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
                  : lowQuota || expired
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
                      remainingUses > 0
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    Còn {remainingUses} lượt đăng khả dụng
                  </span>
                )}

                {reservedUses > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    Đang giữ chỗ chờ duyệt: {reservedUses} lượt
                  </span>
                )}

                {!unlimited && membership?.expiresAt && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                      expired ? "text-rose-600 dark:text-rose-400 font-bold" : "text-muted-foreground"
                    }`}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    {expired ? "Đã hết hạn:" : "Hạn gói:"} {formatDateTimeVi(membership.expiresAt)}
                  </span>
                )}
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                {unlimited
                  ? "Tài khoản Quản trị viên có hạn mức đăng tin không giới hạn để kiểm thử và vận hành. Lưu nháp và chỉnh sửa luôn miễn phí."
                  : "Lưu tin nháp và chỉnh sửa nội dung miễn phí. Tạo mới gửi duyệt hoặc đăng lại tin cần 1 lượt. Tin đã hiển thị vẫn giữ nguyên tới hết hạn riêng của bài đăng ngay cả khi gói hết hạn."}
              </p>
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
            {showManageLink && (
              <Link
                href="/dashboard/membership"
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground shadow-2xs hover:bg-primary/90 transition-all"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{unlimited ? "Xem bảng gói hội viên" : remainingUses === 0 ? "Mua thêm lượt đăng" : "Mua / Nâng cấp gói"}</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/70 pb-5">
        <div className="flex items-start gap-3.5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-xs ${
              unlimited
                ? "bg-indigo-600 text-white"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {unlimited ? <InfinityIcon className="h-6 w-6" /> : <Crown className="h-6 w-6" />}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Gói đang kích hoạt
              </span>
              {unlimited && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Chế độ ADMIN / Kiểm thử không giới hạn
                </span>
              )}
              {!unlimited && expired && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Gói đã hết hạn
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
              {getTierLabel(tierCode)}
            </h2>
            <p className="text-xs text-muted-foreground">
              {unlimited
                ? "Tài khoản ADMIN được cấp quyền đăng và đăng lại tin không giới hạn số lượt."
                : tierCode === "FREE"
                ? `Bạn đã dùng ${freeUsed}/3 lượt đăng tin khởi đầu miễn phí.`
                : "Các gói hội viên thay thế nhau khi mua mới hoặc nâng cấp (không cộng dồn lượt cũ)."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Làm mới trạng thái</span>
            </button>
          )}
          {onSelectUpgrade && !unlimited && (
            <button
              type="button"
              onClick={onSelectUpgrade}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Chọn gói bên dưới</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Lượt đăng khả dụng</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {unlimited ? "Không giới hạn (∞)" : `${remainingUses} lượt`}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {unlimited
              ? "Áp dụng cho tài khoản Quản trị viên"
              : "Dùng để gửi duyệt tin mới hoặc đăng lại tin hết hạn"}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Lượt đang giữ chỗ</span>
            <Layers className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">
            {reservedUses} lượt
          </div>
          <p className="text-[11px] text-muted-foreground">
            Số lượt đang tạm giữ cho các bài đăng chờ duyệt
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Thời hạn hiệu lực gói</span>
            <CalendarClock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-base sm:text-lg font-extrabold text-foreground truncate">
            {unlimited
              ? "Vĩnh viễn (ADMIN)"
              : membership?.expiresAt
              ? formatDateTimeVi(membership.expiresAt)
              : "Không giới hạn ngày (3 lượt đầu)"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {expired
              ? "Gói hiện tại đã hết hạn sử dụng"
              : "Tin đã hiển thị vẫn duy trì tới hết hạn riêng của tin"}
          </p>
        </div>
      </div>

      {/* Key Policy Notes */}
      <div className="rounded-2xl border border-blue-200/70 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/25 p-4 text-xs text-blue-950 dark:text-blue-200 flex items-start gap-3">
        <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <p className="font-bold">Quy tắc sử dụng lượt đăng & bảo toàn hiển thị bài đăng:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-blue-900/90 dark:text-blue-200/90">
            <li>
              <strong>Lưu tin nháp và chỉnh sửa tin đăng hoàn toàn miễn phí.</strong> Chỉ khi tạo tin mới gửi duyệt hoặc đăng lại tin mới cần 1 lượt đăng khả dụng.
            </li>
            <li>
              <strong>Tin đang hiển thị (PUBLISHED) vẫn tiếp tục hiển thị công khai</strong> cho đến khi hết thời hạn hiển thị riêng của bài đăng đó, ngay cả khi gói hội viên của bạn hết hạn.
            </li>
            <li>
              <strong>Chính sách nâng cấp 24h:</strong> Trong vòng 24 giờ kể từ lần mua gói trả phí đầu tiên, nâng cấp lên gói cao hơn chỉ thanh toán phần chênh lệch giá và nhận số lượt của gói mới trừ đi số lượt đã dùng. Sau 24 giờ, mua gói mới sẽ tính nguyên giá và thay thế gói cũ (lượt cũ chưa dùng sẽ kết thúc).
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
