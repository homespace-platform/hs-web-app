"use client";

import { PolicyNotice } from "@/components/common/PolicyDialog";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap,
  Clock,
  FileText,
  ArrowRight,
  RefreshCw,
  Crown,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import {
  TIER_RANK,
  isMembershipExpired,
  isPaidTierCode,
  isUnlimitedMembership,
} from "@/lib/membership";
import {
  useMembershipPricing,
  type MembershipLoadedInfo,
} from "@/hooks/useMembershipPricing";
import type { MembershipPlan, PaidMembershipTierCode } from "@/types/membership.type";
import MembershipPlanCard from "./MembershipPlanCard";
import MembershipStatusCard from "./MembershipStatusCard";
import MembershipCheckoutModal from "./MembershipCheckoutModal";

export default function MembershipPricingWorkspace() {
  const pathname = usePathname();
  const isDashboardView = pathname?.startsWith("/dashboard");
  const { authenticated, login, profile } = useAuth();
  const plansGridRef = useRef<HTMLDivElement>(null);
  const autoOpenedTierRef = useRef<string | null>(null);

  const [requestedTier, setRequestedTier] = useState<PaidMembershipTierCode | null>(null);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<MembershipPlan | null>(null);

  const onLoaded = useCallback(
    ({ me, loadedPlans, unavailableByTier }: MembershipLoadedInfo) => {
      if (
        requestedTier &&
        autoOpenedTierRef.current !== requestedTier &&
        !unavailableByTier[requestedTier]
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
    const tierParam = params.get("tier") ?? params.get("plan");
    if (isPaidTierCode(tierParam)) {
      const normalized = tierParam.trim().toUpperCase() as PaidMembershipTierCode;
      setRequestedTier(normalized);
      requestAnimationFrame(() => {
        plansGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

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
          <PolicyNotice tone="neutral" className="max-w-2xl" title="Gói lượt đăng tin" summary="Linh hoạt lựa chọn gói lượt đăng tin phù hợp quy mô vận hành."><p>Linh hoạt lựa chọn gói lượt đăng tin phù hợp quy mô vận hành. Lưu nháp và chỉnh sửa luôn miễn phí, thanh toán tức thì qua SePay.</p></PolicyNotice>
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
            <PolicyNotice tone="info" title="Lượt đăng tin miễn phí" summary="Mỗi tài khoản mới được tặng sẵn 3 lượt đăng tin miễn phí dùng một lần."><p>Mỗi tài khoản mới được tặng sẵn <strong>3 lượt đăng tin miễn phí</strong> dùng một lần. Bạn có thể xem trước bảng giá công khai và đăng nhập khi chọn mua gói.</p></PolicyNotice>
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

      {/* Business Rules & Policy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Zap className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Nâng cấp trong 24h đầu tiên
          </h3>
          <PolicyNotice tone="neutral" title="Nâng cấp trong 24h đầu tiên" summary="Nâng cấp lên gói cao hơn trong 24 giờ đầu chỉ thanh toán phần chênh lệch giá."><p>Trong vòng 24 giờ kể từ giao dịch mua gói trả phí đầu tiên, nếu nâng cấp lên gói cao hơn, bạn chỉ thanh toán <strong>phần chênh lệch giá</strong>. Số lượt mới sẽ bằng định mức gói mục tiêu trừ đi số lượt đã sử dụng.</p></PolicyNotice>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Thay thế gói & Giữ hiển thị tin
          </h3>
          <PolicyNotice tone="neutral" title="Quy tắc đổi gói hội viên" actionLabel="Xem quy tắc" summary="Các gói hội viên thay thế nhau chứ không cộng dồn."><p>Các gói hội viên thay thế nhau chứ không cộng dồn. Sau 24h đầu, mua gói mới sẽ tính nguyên giá và kết thúc lượt cũ chưa dùng. <strong>Tin đã đăng hiển thị vẫn giữ nguyên cho tới khi hết hạn riêng của tin đó</strong> dù gói hết hạn.</p></PolicyNotice>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-2 shadow-2xs">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <FileText className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Nháp & Chỉnh sửa miễn phí 100%
          </h3>
          <PolicyNotice tone="neutral" title="Nháp & Chỉnh sửa miễn phí 100%" summary="Hệ thống chỉ trừ 1 lượt khi gửi duyệt tin mới hoặc đăng lại."><p>Bạn có thể tạo tin nháp, lưu trữ và chỉnh sửa thông tin bài đăng hoàn toàn miễn phí. Hệ thống chỉ trừ 1 lượt khi bạn bấm <strong>Gửi duyệt tin mới</strong> hoặc <strong>Đăng lại / Gửi duyệt lại</strong> tin.</p></PolicyNotice>
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
