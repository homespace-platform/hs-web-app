"use client";

import { ArrowRight, Check, Infinity as InfinityIcon, Sparkles } from "lucide-react";
import { formatVndPrice } from "@/lib/membership";
import type { MembershipPlanCardState } from "@/hooks/useMembershipPricing";
import type { MembershipPlan, MembershipView } from "@/types/membership.type";

interface Props {
  plan: MembershipPlan;
  state: MembershipPlanCardState;
  authenticated: boolean;
  unlimited: boolean;
  currentTier: string;
  membership: MembershipView | null;
  onSelect: (plan: MembershipPlan) => void;
  onFreeLogin: () => void;
  testId?: string;
  className?: string;
}

export default function MembershipPlanCard({
  plan,
  state,
  authenticated,
  unlimited,
  currentTier,
  membership,
  onSelect,
  onFreeLogin,
  testId,
  className = "",
}: Props) {
  const {
    isFree,
    isCurrentTier,
    isRequestedTier,
    unavailableReason,
    isLowerThanActivePaid,
    isTierUnavailable,
    serverQuote,
    isServerUpgradeDiscount,
    perUseCost,
    isHigherTier,
  } = state;

  return (
    <div
      data-testid={testId ?? `membership-plan-card-${plan.code}`}
      className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all duration-200 ${
        plan.isPopular || isRequestedTier
          ? "border-primary bg-card shadow-lg ring-2 ring-primary/15"
          : isCurrentTier
          ? "border-emerald-500/60 bg-card shadow-sm"
          : "border-border bg-card hover:border-primary/40 hover:shadow-md"
      } ${className}`}
    >
      {/* Top Badge */}
      {plan.badge && (
        <span
          className={`absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-extrabold shadow-xs ${
            plan.isPopular
              ? "bg-primary text-primary-foreground"
              : "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          {plan.badge}
        </span>
      )}

      <div className="space-y-5">
        {/* Plan Header */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
              {plan.shortName}
            </span>
            {isCurrentTier && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                Đang sử dụng
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
          <p className="text-xs text-muted-foreground min-h-[32px] leading-relaxed">
            {plan.tagline}
          </p>
        </div>

        {/* Price & Uses Box */}
        <div className="rounded-2xl border border-border/80 bg-muted/35 p-4 space-y-2">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-2xl sm:text-3xl font-extrabold text-foreground">
              {formatVndPrice(plan.priceVnd)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground">
              {isFree ? "/ một lần" : `/ ${plan.durationDays || 30} ngày`}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
            <span className="font-bold text-foreground">
              {plan.publicationUses} lượt đăng tin
            </span>
            {perUseCost > 0 ? (
              <span className="text-[11px] text-muted-foreground">
                ~{new Intl.NumberFormat("vi-VN").format(perUseCost)} ₫/lượt
              </span>
            ) : (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Tặng khi mở tài khoản
              </span>
            )}
          </div>

          {/* Server-quoted 24h upgrade pill if applicable */}
          {isServerUpgradeDiscount && serverQuote && (
            <div className="mt-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-2 text-[11px] text-emerald-900 dark:text-emerald-200 space-y-0.5">
              <p className="font-extrabold flex items-center gap-1">
                <Sparkles className="h-3 w-3 shrink-0" />
                Ưu đãi nâng cấp trong 24h:
              </p>
              <p>
                Chỉ bù chênh lệch{" "}
                <strong>{formatVndPrice(serverQuote.amountVnd)}</strong> • Nhận{" "}
                <strong>{serverQuote.remainingUsesAfter} lượt</strong> còn lại
              </p>
            </div>
          )}
        </div>

        {/* Feature List */}
        <ul className="space-y-2.5 text-xs text-foreground/90">
          {plan.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="h-2.5 w-2.5" />
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <div className="pt-6 mt-6 border-t border-border/60">
        {isFree ? (
          authenticated ? (
            <div className="w-full rounded-xl border border-border bg-muted/50 py-2.5 px-4 text-center text-xs font-bold text-muted-foreground">
              {currentTier === "FREE" && !unlimited
                ? `Đang áp dụng (Còn ${membership?.remainingUses ?? 3} lượt)`
                : "Gói khởi đầu mặc định"}
            </div>
          ) : (
            <button
              type="button"
              onClick={onFreeLogin}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 hover:bg-muted py-2.5 px-4 text-xs font-bold text-foreground transition-colors cursor-pointer"
            >
              <span>Đăng nhập nhận 3 lượt miễn phí</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )
        ) : unlimited ? (
          <div className="space-y-2">
            <div className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 py-2 px-3 text-center text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1.5">
              <InfinityIcon className="h-3.5 w-3.5" />
              <span>ADMIN: Đã có lượt không giới hạn</span>
            </div>
            <button
              type="button"
              onClick={() => onSelect(plan)}
              className="w-full rounded-xl border border-border bg-card py-2 px-3 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Kiểm thử mua gói {plan.shortName}
            </button>
          </div>
        ) : isTierUnavailable ? (
          <div
            title={unavailableReason}
            className="w-full rounded-xl border border-border bg-muted/50 py-2.5 px-3 text-center text-[11px] font-semibold text-muted-foreground"
          >
            {isLowerThanActivePaid
              ? "Đang sử dụng gói cao hơn"
              : isCurrentTier
              ? "Đang kích hoạt (Có thể nâng cấp gói cao hơn)"
              : "Chưa khả dụng ở trạng thái hiện tại"}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onSelect(plan)}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition-all cursor-pointer ${
              plan.isPopular || isRequestedTier
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
            }`}
          >
            <span>
              {!authenticated
                ? `Đăng nhập để mua ${plan.shortName}`
                : isServerUpgradeDiscount
                ? `Nâng cấp chỉ ${formatVndPrice(serverQuote!.amountVnd)}`
                : isCurrentTier
                ? `Mua lại / Gia hạn ${plan.shortName}`
                : isHigherTier && currentTier !== "FREE"
                ? `Nâng cấp lên ${plan.shortName}`
                : `Mua gói ${plan.shortName}`}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
