"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  Sparkles,
  Zap,
  Clock,
  FileText,
  ArrowRight,
  RefreshCw,
  Crown,
  Building2,
  Infinity as InfinityIcon,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import membershipService from "@/services/membership.service";
import {
  DEFAULT_MEMBERSHIP_PLANS,
  TIER_RANK,
  formatVndPrice,
  getMembershipErrorMessage,
  isMembershipDowngradeError,
  isMembershipExpired,
  isPaidTierCode,
  isUnlimitedMembership,
} from "@/lib/membership";
import type {
  MembershipPlan,
  MembershipQuote,
  MembershipView,
  PaidMembershipTierCode,
} from "@/types/membership.type";
import MembershipStatusCard from "./MembershipStatusCard";
import MembershipCheckoutModal from "./MembershipCheckoutModal";

export default function MembershipPricingWorkspace() {
  const pathname = usePathname();
  const isDashboardView = pathname?.startsWith("/dashboard");
  const { authenticated, login, profile } = useAuth();
  const plansGridRef = useRef<HTMLDivElement>(null);
  const autoOpenedTierRef = useRef<string | null>(null);

  const [plans, setPlans] = useState<MembershipPlan[]>(DEFAULT_MEMBERSHIP_PLANS);
  const [membership, setMembership] = useState<MembershipView | null>(null);
  const [quotesByTier, setQuotesByTier] = useState<Partial<Record<PaidMembershipTierCode, MembershipQuote>>>({});
  const [unavailableByTier, setUnavailableByTier] = useState<Partial<Record<PaidMembershipTierCode, string>>>({});
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [requestedTier, setRequestedTier] = useState<PaidMembershipTierCode | null>(null);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<MembershipPlan | null>(null);

  const unlimited = isUnlimitedMembership(membership, profile);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tierParam = params.get("tier") ?? params.get("plan");
    if (isPaidTierCode(tierParam)) {
      const normalized = tierParam.trim().toUpperCase() as PaidMembershipTierCode;
      setRequestedTier(normalized);
      requestAnimationFrame(() => {
        plansGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  const loadData = useCallback(async () => {
    setPlansError(null);

    // Avoid unauthenticated calls to protected /api/v1/membership/* endpoints
    if (!authenticated) {
      setPlans(DEFAULT_MEMBERSHIP_PLANS);
      setMembership(null);
      setQuotesByTier({});
      setUnavailableByTier({});
      setLoadingPlans(false);
      setLoadingMembership(false);
      return;
    }

    setLoadingPlans(true);
    let loadedPlans: MembershipPlan[] = DEFAULT_MEMBERSHIP_PLANS;
    try {
      loadedPlans = await membershipService.getPlans();
      setPlans(loadedPlans);
    } catch {
      setPlans(DEFAULT_MEMBERSHIP_PLANS);
      setPlansError("Đang hiển thị bảng giá tiêu chuẩn (không thể kết nối máy chủ danh mục gói).");
    } finally {
      setLoadingPlans(false);
    }

    setLoadingMembership(true);
    try {
      const me = await membershipService.getMyMembership();
      setMembership(me);

      // Preload server quotes for paid tiers so cards can display 24h upgrade price difference accurately
      const paidTiers: PaidMembershipTierCode[] = ["STARTER", "PRO", "BUSINESS"];
      const nextQuotes: Partial<Record<PaidMembershipTierCode, MembershipQuote>> = {};
      const nextUnavailable: Partial<Record<PaidMembershipTierCode, string>> = {};

      await Promise.all(
        paidTiers.map(async (tier) => {
          try {
            const q = await membershipService.getQuote(tier);
            nextQuotes[tier] = q;
          } catch (err) {
            if (isMembershipDowngradeError(err)) {
              nextUnavailable[tier] = getMembershipErrorMessage(err);
            }
          }
        }),
      );
      setQuotesByTier(nextQuotes);
      setUnavailableByTier(nextUnavailable);

      if (
        requestedTier &&
        autoOpenedTierRef.current !== requestedTier &&
        !nextUnavailable[requestedTier]
      ) {
        const meUnlimited = isUnlimitedMembership(me, profile);
        const meExpired = isMembershipExpired(me.expiresAt);
        const isLower =
          !meUnlimited &&
          me.tier !== "FREE" &&
          !meExpired &&
          TIER_RANK[requestedTier] < TIER_RANK[me.tier];
        if (!isLower) {
          const matchedPlan = loadedPlans.find((p) => p.code === requestedTier);
          if (matchedPlan) {
            autoOpenedTierRef.current = requestedTier;
            setSelectedPlanForCheckout(matchedPlan);
          }
        }
      }
    } catch {
      // Keep null if me fails; UI handles gracefully
    } finally {
      setLoadingMembership(false);
    }
  }, [authenticated, profile, requestedTier]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleSelectPlan(plan: MembershipPlan) {
    if (plan.code === "FREE" || plan.code === "ADMIN") return;
    if (!authenticated) {
      login(`/membership?tier=${encodeURIComponent(plan.code)}`);
      return;
    }
    setSelectedPlanForCheckout(plan);
  }

  function scrollToPlans() {
    plansGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const currentTier = membership?.tier ?? "FREE";
  const currentExpired = isMembershipExpired(membership?.expiresAt);

  return (
    <div className="space-y-8 pb-16 animate-in fade-in-50 duration-200">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Crown className="h-3.5 w-3.5" />
            <span>Dành cho Chủ nhà & Đơn vị cho thuê</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-foreground">
            Gói hội viên & Lượt đăng tin
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Linh hoạt lựa chọn gói lượt đăng tin phù hợp quy mô vận hành. Lưu nháp và chỉnh sửa luôn miễn phí, thanh toán tức thì qua SePay.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {authenticated ? (
            <>
              {!isDashboardView && (
                <Link
                  href="/dashboard/membership"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/15 transition-colors shadow-2xs"
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span>Quản lý gói trong Dashboard</span>
                </Link>
              )}
              <Link
                href="/dashboard/properties"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
              >
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>Quản lý tin đăng</span>
              </Link>
              <button
                type="button"
                onClick={loadData}
                disabled={loadingPlans || loadingMembership}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingPlans || loadingMembership ? "animate-spin text-primary" : ""}`} />
                <span>Làm mới</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => login(requestedTier ? `/membership?tier=${encodeURIComponent(requestedTier)}` : "/membership")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs cursor-pointer"
            >
              <span>Đăng nhập để mua gói</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Membership & Remaining Quota Card */}
      {authenticated ? (
        <MembershipStatusCard
          membership={membership}
          profile={profile}
          loading={loadingMembership}
          showManageLink={false}
          onRefresh={loadData}
          onSelectUpgrade={scrollToPlans}
        />
      ) : (
        <div className="rounded-3xl border border-primary/25 bg-primary/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Đăng nhập để xem số lượt đăng tin còn lại & thanh toán gói hội viên
            </h2>
            <p className="text-xs text-muted-foreground">
              Mỗi tài khoản mới được tặng sẵn <strong>3 lượt đăng tin miễn phí</strong> dùng một lần. Bạn có thể xem trước bảng giá công khai và đăng nhập khi chọn mua gói.
            </p>
          </div>
          <button
            type="button"
            onClick={() => login(requestedTier ? `/membership?tier=${encodeURIComponent(requestedTier)}` : "/membership")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer shrink-0"
          >
            <span>Đăng nhập ngay</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {plansError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 dark:border-amber-900/50 dark:bg-amber-950/30 px-4 py-3 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>{plansError}</span>
        </div>
      )}

      {/* Plans Grid */}
      <div ref={plansGridRef} className="space-y-4 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-foreground">
              Bảng gói lượt đăng tin
            </h2>
            <p className="text-xs text-muted-foreground">
              Các gói có thời hạn 30 ngày thay thế nhau khi kích hoạt (không cộng dồn lượt cũ).
            </p>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">
            Đơn vị tính: VNĐ (Đã bao gồm thuế theo quy định)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const isFree = plan.code === "FREE";
            const isCurrentTier =
              authenticated &&
              !unlimited &&
              currentTier === plan.code &&
              (isFree || !currentExpired);
            const isRequestedTier = requestedTier === plan.code;
            const paidCode = isPaidTierCode(plan.code) ? plan.code : null;
            const serverQuote = paidCode ? quotesByTier[paidCode] : undefined;
            const unavailableReason = paidCode ? unavailableByTier[paidCode] : undefined;
            const isLowerThanActivePaid =
              authenticated &&
              !unlimited &&
              !isFree &&
              currentTier !== "FREE" &&
              !currentExpired &&
              TIER_RANK[plan.code] < TIER_RANK[currentTier];
            const isTierUnavailable = Boolean(unavailableReason || isLowerThanActivePaid);
            const isServerUpgradeDiscount = Boolean(
              serverQuote &&
                (serverQuote.upgrade || serverQuote.mode === "UPGRADE") &&
                serverQuote.amountVnd < plan.priceVnd,
            );
            const perUseCost =
              plan.priceVnd > 0 && plan.publicationUses > 0
                ? Math.round(plan.priceVnd / plan.publicationUses)
                : 0;
            const isHigherTier = TIER_RANK[plan.code] > TIER_RANK[currentTier];

            return (
              <div
                key={plan.code}
                data-testid={`membership-plan-card-${plan.code}`}
                className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all duration-200 ${
                  plan.isPopular || isRequestedTier
                    ? "border-primary bg-card shadow-lg ring-2 ring-primary/15"
                    : isCurrentTier
                    ? "border-emerald-500/60 bg-card shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:shadow-md"
                }`}
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
                        onClick={() => login("/membership")}
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
                        onClick={() => handleSelectPlan(plan)}
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
                      onClick={() => handleSelectPlan(plan)}
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
          })}
        </div>
      </div>

      {/* Business Rules & Policy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Zap className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Nâng cấp trong 24h đầu tiên
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Trong vòng 24 giờ kể từ giao dịch mua gói trả phí đầu tiên, nếu nâng cấp lên gói cao hơn, bạn chỉ thanh toán <strong>phần chênh lệch giá</strong>. Số lượt mới sẽ bằng định mức gói mục tiêu trừ đi số lượt đã sử dụng.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Thay thế gói & Giữ hiển thị tin
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Các gói hội viên thay thế nhau chứ không cộng dồn. Sau 24h đầu, mua gói mới sẽ tính nguyên giá và kết thúc lượt cũ chưa dùng. <strong>Tin đã đăng hiển thị vẫn giữ nguyên cho tới khi hết hạn riêng của tin đó</strong> dù gói hết hạn.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <FileText className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Nháp & Chỉnh sửa miễn phí 100%
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Bạn có thể tạo tin nháp, lưu trữ và chỉnh sửa thông tin bài đăng hoàn toàn miễn phí. Hệ thống chỉ trừ 1 lượt khi bạn bấm <strong>Gửi duyệt tin mới</strong> hoặc <strong>Đăng lại / Gửi duyệt lại</strong> tin.
          </p>
        </div>
      </div>

      {/* Checkout Confirmation Modal */}
      <MembershipCheckoutModal
        isOpen={Boolean(selectedPlanForCheckout)}
        plan={selectedPlanForCheckout}
        currentMembership={membership}
        onClose={() => setSelectedPlanForCheckout(null)}
      />
    </div>
  );
}
