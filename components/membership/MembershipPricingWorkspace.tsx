"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import {
  getPlanBlockReason,
  isPaidTierCode,
  isUnlimitedMembership,
} from "@/lib/membership";
import {
  useMembershipPricing,
  type MembershipLoadedInfo,
} from "@/hooks/useMembershipPricing";
import membershipService from "@/services/membership.service";
import type { MembershipAddonOffer, MembershipPlan, PaidMembershipTierCode } from "@/types/membership.type";
import MembershipPlanCard from "./MembershipPlanCard";
import MembershipStatusCard from "./MembershipStatusCard";
import MembershipCheckoutModal from "./MembershipCheckoutModal";
import MembershipAddonModal from "./MembershipAddonModal";
import MembershipRules from "./MembershipRules";

const HEADER_ACTION =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function MembershipPricingWorkspace() {
  const pathname = usePathname();
  const isDashboardView = pathname?.startsWith("/dashboard");
  const { authenticated, login, profile } = useAuth();
  const plansGridRef = useRef<HTMLDivElement>(null);
  const autoOpenedTierRef = useRef<string | null>(null);

  const [requestedTier, setRequestedTier] = useState<PaidMembershipTierCode | null>(null);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<MembershipPlan | null>(null);
  const [addonOpen, setAddonOpen] = useState(false);
  const [addonOffer, setAddonOffer] = useState<MembershipAddonOffer | null>(null);

  const onLoaded = useCallback(
    ({ me, loadedPlans, unavailableByTier }: MembershipLoadedInfo) => {
      if (
        requestedTier &&
        autoOpenedTierRef.current !== requestedTier &&
        !unavailableByTier[requestedTier]
      ) {
        const blocked =
          !isUnlimitedMembership(me, profile) && Boolean(getPlanBlockReason(requestedTier, me));
        if (!blocked) {
          const matchedPlan = loadedPlans.find((p) => p.code === requestedTier);
          if (matchedPlan) {
            autoOpenedTierRef.current = requestedTier;
            setSelectedPlanForCheckout(matchedPlan);
          }
        }
      }
    },
    [profile, requestedTier],
  );

  const {
    plans,
    membership,
    unlimited,
    currentTier,
    plansError,
    loadingPlans,
    loadingMembership,
    loadData,
    getCardState,
  } = useMembershipPricing(onLoaded);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    // The modal itself only renders for signed-in, non-unlimited users.
    if (params.get("addon") === "1") setAddonOpen(true);
    const tierParam = params.get("tier") ?? params.get("plan");
    if (isPaidTierCode(tierParam)) {
      const normalized = tierParam.trim().toUpperCase() as PaidMembershipTierCode;
      setRequestedTier(normalized);
      requestAnimationFrame(() => {
        plansGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  // Price line only; if this fails the buy button stays and the modal reports the error.
  useEffect(() => {
    if (!authenticated || unlimited) return;
    membershipService.getAddonOffer().then(setAddonOffer, () => setAddonOffer(null));
  }, [authenticated, unlimited]);

  function handleSelectPlan(plan: MembershipPlan) {
    if (plan.code === "FREE" || plan.code === "ADMIN") return;
    if (!authenticated) {
      login(`/membership?tier=${encodeURIComponent(plan.code)}`);
      return;
    }
    setSelectedPlanForCheckout(plan);
  }

  return (
    <div className="space-y-8 pb-16 animate-in fade-in-50 duration-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Gói hội viên & Lượt đăng tin
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Chọn gói theo quy mô cho thuê. Lưu nháp và chỉnh sửa luôn miễn phí; thanh toán qua SePay hoặc Sepolia ETH.
          </p>
        </div>

        {authenticated && (
          <div className="flex shrink-0 flex-wrap gap-2">
            {!isDashboardView && (
              <Link href="/dashboard/membership" className={HEADER_ACTION}>
                Quản lý gói trong Dashboard
              </Link>
            )}
            <Link href="/dashboard/properties" className={HEADER_ACTION}>
              Quản lý tin đăng
            </Link>
            <button
              type="button"
              onClick={loadData}
              disabled={loadingPlans || loadingMembership}
              className={`${HEADER_ACTION} cursor-pointer disabled:opacity-60`}
            >
              {(loadingPlans || loadingMembership) && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Làm mới
            </button>
          </div>
        )}
      </div>

      {authenticated ? (
        <MembershipStatusCard
          membership={membership}
          profile={profile}
          loading={loadingMembership}
          planQuota={plans.find((plan) => plan.code === currentTier)?.publicationUses}
          addonOffer={addonOffer}
          onBuyAddon={() => setAddonOpen(true)}
        />
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Đăng nhập để xem lượt đăng tin còn lại và mua gói
            </h2>
            <p className="text-sm text-muted-foreground">
              Gói Free trọn đời có 3 lượt đăng tin miễn phí mỗi 30 ngày. Bảng giá xem được không cần đăng nhập.
            </p>
          </div>
          <button
            type="button"
            onClick={() => login(requestedTier ? `/membership?tier=${encodeURIComponent(requestedTier)}` : "/membership")}
            className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Đăng nhập
            <ArrowRight className="h-4 w-4" aria-hidden />
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
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground">Bảng gói lượt đăng tin</h2>
          <p className="text-sm text-muted-foreground">
            Mọi gói: lưu nháp và chỉnh sửa miễn phí; tin đã duyệt hiển thị đủ hạn riêng. Gói trả phí có hạn 30 ngày
            và thay thế nhau, không cộng dồn lượt gói cũ. Giá bằng VNĐ, đã gồm thuế theo quy định.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <MembershipPlanCard
              key={plan.code}
              plan={plan}
              state={getCardState(plan, requestedTier)}
              authenticated={authenticated}
              unlimited={unlimited}
              currentTier={currentTier}
              membership={membership}
              onSelect={handleSelectPlan}
              onFreeLogin={() => login("/membership")}
            />
          ))}
        </div>
      </div>

      <MembershipRules />

      {addonOpen && authenticated && !unlimited && (
        <MembershipAddonModal
          // Fallback catalogue prices are not the server's, so no comparison without it.
          starterPriceVnd={
            plansError || loadingPlans ? null : plans.find((p) => p.code === "STARTER")?.priceVnd ?? null
          }
          onClose={() => setAddonOpen(false)}
        />
      )}

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
