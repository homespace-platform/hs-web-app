"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/useAuth";
import membershipService from "@/services/membership.service";
import {
  DEFAULT_MEMBERSHIP_PLANS,
  TIER_RANK,
  getMembershipErrorMessage,
  getPlanBlockReason,
  isMembershipDowngradeError,
  isPaidTierCode,
  isUnlimitedMembership,
} from "@/lib/membership";
import type {
  MembershipPlan,
  MembershipQuote,
  MembershipView,
  PaidMembershipTierCode,
} from "@/types/membership.type";

export interface MembershipPlanCardState {
  isFree: boolean;
  isCurrentTier: boolean;
  isRequestedTier: boolean;
  unavailableReason?: string;
  isTierUnavailable: boolean;
  serverQuote?: MembershipQuote;
  isServerUpgradeDiscount: boolean;
  perUseCost: number;
  isHigherTier: boolean;
}

export interface MembershipLoadedInfo {
  me: MembershipView;
  loadedPlans: MembershipPlan[];
  unavailableByTier: Partial<Record<PaidMembershipTierCode, string>>;
}

/** Single source of plans + my membership + upgrade quotes, shared by the workspace and the landing. */
export function useMembershipPricing(onLoaded?: (info: MembershipLoadedInfo) => void) {
  const { authenticated, profile } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>(DEFAULT_MEMBERSHIP_PLANS);
  const [membership, setMembership] = useState<MembershipView | null>(null);
  const [quotesByTier, setQuotesByTier] = useState<Partial<Record<PaidMembershipTierCode, MembershipQuote>>>({});
  const [unavailableByTier, setUnavailableByTier] = useState<Partial<Record<PaidMembershipTierCode, string>>>({});
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  const unlimited = isUnlimitedMembership(membership, profile);

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

      onLoaded?.({ me, loadedPlans, unavailableByTier: nextUnavailable });
    } catch {
      // Keep null if me fails; UI handles gracefully
    } finally {
      setLoadingMembership(false);
    }
  }, [authenticated, onLoaded]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentTier = membership?.tier ?? "FREE";

  function getCardState(plan: MembershipPlan, requestedTier: string | null = null): MembershipPlanCardState {
    const isFree = plan.code === "FREE";
    const isCurrentTier = authenticated && !unlimited && currentTier === plan.code;
    const paidCode = isPaidTierCode(plan.code) ? plan.code : null;
    const serverQuote = paidCode ? quotesByTier[paidCode] : undefined;
    const blockReason =
      authenticated && !unlimited ? getPlanBlockReason(plan.code, membership) : undefined;
    const unavailableReason = blockReason ?? (paidCode ? unavailableByTier[paidCode] : undefined);
    return {
      isFree,
      isCurrentTier,
      isRequestedTier: requestedTier === plan.code,
      unavailableReason,
      isTierUnavailable: Boolean(unavailableReason),
      serverQuote,
      isServerUpgradeDiscount: Boolean(
        serverQuote &&
          !isCurrentTier &&
          (serverQuote.upgrade || serverQuote.mode === "UPGRADE") &&
          serverQuote.amountVnd < plan.priceVnd,
      ),
      perUseCost:
        plan.priceVnd > 0 && plan.publicationUses > 0
          ? Math.round(plan.priceVnd / plan.publicationUses)
          : 0,
      isHigherTier: TIER_RANK[plan.code] > TIER_RANK[currentTier],
    };
  }

  return {
    authenticated,
    profile,
    plans,
    membership,
    unlimited,
    currentTier,
    plansError,
    loadingPlans,
    loadingMembership,
    loadData,
    getCardState,
  };
}
