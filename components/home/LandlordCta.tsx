"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Check,
  Crown,
  Infinity as InfinityIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { requireKyc } from "@/lib/kyc-gate";
import { useFeatureGate } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import {
  DEFAULT_MEMBERSHIP_PLANS,
  formatVndPrice,
  isUnlimitedMembership,
} from "@/lib/membership";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function LandlordCta() {
  const router = useRouter();
  const { authenticated, login, profile } = useAuth();
  const unlimited = isUnlimitedMembership(null, profile);
  const postGate = useFeatureGate(PERMISSIONS.LISTING_POST);

  const goPostListing = () => {
    if (!authenticated) {
      login("/dashboard/properties/upsert");
      return;
    }
    if (!postGate.guard()) return;
    requireKyc(profile, {
      router,
      redirect: true,
      onAllowed: () => router.push("/dashboard/properties/upsert"),
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
              Mỗi tài khoản mới có sẵn{" "}
              <strong className="font-semibold text-foreground">
                3 lượt đăng tin miễn phí
              </strong>{" "}
              dùng một lần. Tạo nháp và chỉnh sửa bài đăng hoàn toàn miễn phí — linh hoạt mua hoặc
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

        {/* Plan cards (Free / Starter / Pro / Business) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch pt-3">
          {DEFAULT_MEMBERSHIP_PLANS.map((plan) => {
            const isFree = plan.code === "FREE";
            const perUseCost =
              plan.priceVnd > 0 && plan.publicationUses > 0
                ? Math.round(plan.priceVnd / plan.publicationUses)
                : 0;

            return (
              <div
                key={plan.code}
                data-testid={`home-membership-plan-${plan.code}`}
                className={`hs-reveal relative flex h-full flex-col rounded-3xl border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none ${
                  plan.isPopular
                    ? "border-primary ring-2 ring-primary shadow-lg shadow-primary/10"
                    : "border-border shadow-sm"
                }`}
              >
                {plan.badge && (
                  <span
                    className={`absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                      plan.isPopular
                        ? "bg-primary text-primary-foreground"
                        : "bg-foreground text-background"
                    }`}
                  >
                    <Sparkles aria-hidden="true" className="h-3 w-3" />
                    {plan.badge}
                  </span>
                )}

                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {plan.shortName}
                  </span>
                  <h3 className="font-heading text-lg font-bold text-foreground">{plan.name}</h3>
                </div>

                <div className="mt-4 flex items-baseline gap-1.5 flex-wrap">
                  <span className="font-heading text-3xl font-bold tabular-nums text-foreground">
                    {formatVndPrice(plan.priceVnd)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {isFree ? "/ một lần" : `/ ${plan.durationDays || 30} ngày`}
                  </span>
                </div>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.tagline}</p>

                <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-muted px-4 py-3 text-sm">
                  <span className="font-semibold text-foreground tabular-nums">
                    {plan.publicationUses} lượt đăng tin
                  </span>
                  {perUseCost > 0 ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      ~{new Intl.NumberFormat("vi-VN").format(perUseCost)} ₫/lượt
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-verified">
                      Tặng khi mở tài khoản
                    </span>
                  )}
                </div>

                <ul className="mt-5 space-y-2.5 text-sm leading-6 text-foreground">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <Check
                        aria-hidden="true"
                        className="mt-1 h-4 w-4 shrink-0 text-verified"
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-6">
                  {isFree ? (
                    <button
                      type="button"
                      onClick={goPostListing}
                      title={postGate.title}
                      className={`w-full min-h-11 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted hover:bg-muted/70 px-4 text-sm font-semibold text-foreground transition-colors duration-200 active:scale-[0.98] cursor-pointer ${FOCUS_RING}`}
                    >
                      <span>
                        {authenticated
                          ? "Bắt đầu đăng tin miễn phí"
                          : "Đăng nhập nhận 3 lượt miễn phí"}
                      </span>
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  ) : unlimited ? (
                    <div className="space-y-2">
                      <div className="w-full rounded-xl border border-primary/30 bg-primary/10 py-2 px-3 text-center text-xs font-semibold text-primary flex items-center justify-center gap-1.5">
                        <InfinityIcon aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>ADMIN: Không giới hạn lượt</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectPaidPlan(plan.code)}
                        className={`w-full min-h-11 rounded-xl border border-border bg-card px-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 active:scale-[0.98] cursor-pointer ${FOCUS_RING}`}
                      >
                        Xem gói {plan.shortName}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectPaidPlan(plan.code)}
                      className={`w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-200 active:scale-[0.98] cursor-pointer ${FOCUS_RING} ${
                        plan.isPopular
                          ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary-dark"
                          : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                      }`}
                    >
                      <span>
                        {authenticated
                          ? `Chọn mua gói ${plan.shortName}`
                          : `Đăng nhập để mua ${plan.shortName}`}
                      </span>
                      <ArrowRight aria-hidden="true" className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
