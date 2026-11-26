"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Crown,
} from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { requireKyc } from "@/lib/kyc-gate";
import { useFeatureGate } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import { useMembershipPricing } from "@/hooks/useMembershipPricing";
import MembershipPlanCard from "@/components/membership/MembershipPlanCard";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function LandlordCta() {
  const router = useRouter();
  const { login, profile } = useAuth();
  const { authenticated, plans, membership, unlimited, currentTier, getCardState } =
    useMembershipPricing();
  const postGate = useFeatureGate(PERMISSIONS.LISTING_POST);

  const goPostListing = () => {
    if (!authenticated) {
      login("/dashboard/properties/new");
      return;
    }
    if (!postGate.guard()) return;
    requireKyc(profile, {
      router,
      redirect: true,
      onAllowed: () => router.push("/dashboard/properties/new"),
    });
  };

  const handleSelectPaidPlan = (tierCode: string) => {
    const targetPath = `/membership?tier=${encodeURIComponent(tierCode)}`;
    if (!authenticated) {
      login(targetPath);
      return;
    }
    router.push(targetPath);
  };

  return (
    <section
      id="landlord-cta"
      data-testid="home-membership-section"
      className="py-16 md:py-24"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section header + actions */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 hs-reveal">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-3 inline-flex items-center gap-2">
              <Crown aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Dành cho Chủ nhà & Đơn vị cho thuê</span>
            </p>
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-balance text-foreground">
              Bảng gói hội viên & Lượt đăng tin cho thuê
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Gói Free trọn đời có{" "}
              <strong className="font-semibold text-foreground">
                3 lượt đăng tin miễn phí
              </strong>{" "}
              mỗi 30 ngày (không cộng dồn). Tạo nháp và chỉnh sửa bài đăng hoàn toàn miễn phí — linh hoạt mua hoặc
              nâng cấp gói 30 ngày qua SePay khi cần mở rộng quy mô.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={goPostListing}
              title={postGate.title}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground font-semibold px-5 text-sm shadow-sm transition-colors duration-200 active:scale-[0.98] cursor-pointer ${FOCUS_RING}`}
            >
              <PlusCircle aria-hidden="true" className="w-4 h-4" />
              <span>Đăng tin ngay</span>
            </button>

            <Link
              href="/membership"
              className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold px-4 text-sm transition-colors duration-200 active:scale-[0.98] ${FOCUS_RING}`}
            >
              <span>Xem chi tiết bảng gói</span>
              <ArrowRight aria-hidden="true" className="w-4 h-4 text-primary" />
            </Link>

            {authenticated && (
              <Link
                href="/dashboard/membership"
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 text-primary font-semibold px-4 text-sm transition-colors duration-200 active:scale-[0.98] ${FOCUS_RING}`}
              >
                <Crown aria-hidden="true" className="w-4 h-4" />
                <span>Quản lý gói của tôi</span>
              </Link>
            )}
          </div>
        </div>

        {/* Plan cards: same card + state rules as the membership page */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch pt-3">
          {plans.map((plan) => (
            <MembershipPlanCard
              key={plan.code}
              plan={plan}
              state={getCardState(plan)}
              authenticated={authenticated}
              unlimited={unlimited}
              currentTier={currentTier}
              membership={membership}
              onSelect={(p) => handleSelectPaidPlan(p.code)}
              onFreeLogin={goPostListing}
              testId={`home-membership-plan-${plan.code}`}
              className="hs-reveal h-full"
            />
          ))}
        </div>

        {/* Policy pillars on a calm brand surface */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-3xl bg-primary-dark p-6 sm:p-8 text-white">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white/10 shrink-0">
              <ShieldCheck aria-hidden="true" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm mb-1">
                Xác thực KYC & Hợp đồng On-chain
              </h3>
              <p className="text-sm leading-6 text-white/80">
                Tăng độ tin cậy cho bài đăng, hỗ trợ đặt cọc và ký hợp đồng thuê minh bạch.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white/10 shrink-0">
              <Zap aria-hidden="true" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm mb-1">
                Ưu đãi nâng cấp 24h đầu tiên
              </h3>
              <p className="text-sm leading-6 text-white/80">
                Chỉ bù chênh lệch giá khi nâng cấp lên gói cao hơn trong 24 giờ kể từ lần mua đầu.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white/10 shrink-0">
              <Sparkles aria-hidden="true" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-sm mb-1">
                Lưu nháp miễn phí & Giữ hiển thị tin
              </h3>
              <p className="text-sm leading-6 text-white/80">
                Chỉ trừ lượt khi gửi duyệt hoặc đăng lại; tin đã duyệt hiển thị đủ hạn riêng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
