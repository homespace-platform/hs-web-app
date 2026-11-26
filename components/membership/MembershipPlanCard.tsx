"use client";

import { ArrowRight } from "lucide-react";
import { formatVndPrice, getQuotaResetLabel } from "@/lib/membership";
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
    isTierUnavailable,
    serverQuote,
    isServerUpgradeDiscount,
    perUseCost,
    isHigherTier,
  } = state;
  const quotaResetLabel = getQuotaResetLabel(membership);

  const isRecommended = Boolean(plan.isPopular);
  const buttonBase =
    "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const primaryButton = `${buttonBase} cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90`;
  const secondaryButton = `${buttonBase} cursor-pointer border border-border bg-card text-foreground hover:bg-muted`;
  const staticBox = `${buttonBase} border border-border bg-muted text-foreground/75`;

  return (
    <div
      data-testid={testId ?? `membership-plan-card-${plan.code}`}
      className={`flex h-full flex-col rounded-2xl border bg-card p-5 ${
        isRecommended || isRequestedTier
          ? "border-primary ring-1 ring-primary"
          : isCurrentTier
          ? "border-foreground/50"
          : "border-border"
      } ${className}`}
    >
      {/* Fixed-height rows keep names, prices and buttons level across cards. */}
      <div className="flex flex-wrap items-center gap-2 md:min-h-6">
        {isCurrentTier && (
          <span className="rounded-full bg-foreground px-2.5 py-0.5 text-xs font-semibold text-background">
            Đang sử dụng
          </span>
        )}
        {isRecommended && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
            {plan.badge}
          </span>
        )}
      </div>
      <h3 className="mt-2 text-lg font-bold text-foreground">{plan.shortName}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground md:min-h-[4.5rem]">{plan.tagline}</p>

      <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-2xl font-bold tabular-nums text-foreground">{formatVndPrice(plan.priceVnd)}</span>
        <span className="text-sm text-muted-foreground">
          {isFree ? "/ trọn đời" : `/ ${plan.durationDays || 30} ngày`}
        </span>
      </p>

      <div className="mt-4 space-y-1 border-t border-border pt-4">
        <p className="text-base font-semibold text-foreground">
          {plan.publicationUses} lượt đăng tin{isFree ? " mỗi 30 ngày" : ""}
        </p>
        <p className="text-sm tabular-nums text-muted-foreground">
          {perUseCost > 0
            ? `Khoảng ${new Intl.NumberFormat("vi-VN").format(perUseCost)} ₫/lượt`
            : "Hồi lại mỗi 30 ngày, không cộng dồn"}
        </p>
      </div>

      <div className="mt-auto space-y-2 pt-5">
        {/* Server-quoted 24h upgrade price if applicable */}
        {isServerUpgradeDiscount && serverQuote && (
          <p className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">
            Ưu đãi nâng cấp 24h: chỉ bù <strong>{formatVndPrice(serverQuote.amountVnd)}</strong>, nhận{" "}
            <strong>{serverQuote.remainingUsesAfter} lượt</strong>.
          </p>
        )}

        {isFree ? (
          authenticated ? (
            <>
              {!unlimited && quotaResetLabel && (
                <p className="text-sm text-muted-foreground">{quotaResetLabel}</p>
              )}
              <div className={staticBox}>
                {currentTier === "FREE" && !unlimited
                  ? `Đang áp dụng (còn ${membership?.remainingUses ?? 3} lượt)`
                  : "Gói mặc định trọn đời"}
              </div>
            </>
          ) : (
            <button type="button" onClick={onFreeLogin} className={secondaryButton}>
              <span>Đăng nhập để dùng Free</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          )
        ) : unlimited ? (
          <>
            <p className="text-sm text-muted-foreground">ADMIN: đã có lượt không giới hạn.</p>
            <button type="button" onClick={() => onSelect(plan)} className={secondaryButton}>
              Kiểm thử mua gói {plan.shortName}
            </button>
          </>
        ) : isTierUnavailable ? (
          <button type="button" disabled className={`${staticBox} cursor-not-allowed`}>
            {unavailableReason}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelect(plan)}
            className={isRecommended || isRequestedTier ? primaryButton : secondaryButton}
          >
            <span>
              {!authenticated
                ? `Đăng nhập để mua ${plan.shortName}`
                : isCurrentTier
                ? `Mua lại ${plan.shortName}`
                : isServerUpgradeDiscount
                ? `Nâng cấp chỉ ${formatVndPrice(serverQuote!.amountVnd)}`
                : isHigherTier && currentTier !== "FREE"
                ? `Nâng cấp lên ${plan.shortName}`
                : `Mua gói ${plan.shortName}`}
            </span>
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
