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
import {
  DEFAULT_MEMBERSHIP_PLANS,
  formatVndPrice,
  isUnlimitedMembership,
} from "@/lib/membership";

export default function LandlordCta() {
  const router = useRouter();
  const { authenticated, login, profile } = useAuth();
  const unlimited = isUnlimitedMembership(null, profile);

  const goPostListing = () => {
    if (!authenticated) {
      login("/dashboard/properties/upsert");
      return;
    }
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
      className="py-12 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 lg:p-10 shadow-sm space-y-8">
        {/* Section Header & Non-duplicative Actions */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5" />
              <span>Dành cho Chủ nhà & Đơn vị cho thuê</span>
            </div>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-foreground tracking-tight leading-tight">
              Bảng gói hội viên & Lượt đăng tin cho thuê
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Mỗi tài khoản mới có sẵn <strong>3 lượt đăng tin miễn phí</strong> dùng một lần.
              Tạo nháp và chỉnh sửa bài đăng hoàn toàn miễn phí — linh hoạt mua hoặc nâng cấp
              gói 30 ngày qua SePay khi cần mở rộng quy mô.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={goPostListing}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Đăng tin ngay</span>
            </button>

            <Link
              href="/membership"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground font-bold px-4 py-2.5 text-xs sm:text-sm transition-colors"
            >
              <span>Xem chi tiết bảng gói</span>
              <ArrowRight className="w-4 h-4 text-primary" />
            </Link>

            {authenticated && (
              <Link
                href="/dashboard/membership"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/15 text-primary font-bold px-4 py-2.5 text-xs sm:text-sm transition-colors"
              >
                <Crown className="w-4 h-4" />
                <span>Quản lý gói của tôi</span>
              </Link>
            )}
          </div>
        </div>

        {/* 4 Membership Plan Cards (Free / Starter / Pro / Business) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
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
                className={`relative flex flex-col justify-between rounded-3xl border p-6 transition-all duration-200 ${
                  plan.isPopular
                    ? "border-primary bg-background shadow-md ring-2 ring-primary/15"
                    : "border-border bg-background/60 hover:border-primary/40 hover:shadow-sm"
                }`}
              >
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

                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-primary">
                      {plan.shortName}
                    </span>
                    <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground min-h-[32px] leading-relaxed">
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-muted/35 p-4 space-y-2">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-2xl font-extrabold text-foreground">
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
                  </div>

                  <ul className="space-y-2 text-xs text-foreground/90">
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

                <div className="pt-5 mt-5 border-t border-border/60">
                  {isFree ? (
                    <button
                      type="button"
                      onClick={goPostListing}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/60 hover:bg-muted py-2.5 px-4 text-xs font-bold text-foreground transition-colors cursor-pointer"
                    >
                      <span>
                        {authenticated
                          ? "Bắt đầu đăng tin miễn phí"
                          : "Đăng nhập nhận 3 lượt miễn phí"}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : unlimited ? (
                    <div className="space-y-2">
                      <div className="w-full rounded-xl border border-indigo-500/30 bg-indigo-500/10 py-2 px-3 text-center text-[11px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-center gap-1.5">
                        <InfinityIcon className="h-3.5 w-3.5" />
                        <span>ADMIN: Không giới hạn lượt</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectPaidPlan(plan.code)}
                        className="w-full rounded-xl border border-border bg-card py-2 px-3 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        Xem gói {plan.shortName}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectPaidPlan(plan.code)}
                      className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-bold transition-all cursor-pointer ${
                        plan.isPopular
                          ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                          : "border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                      }`}
                    >
                      <span>
                        {authenticated
                          ? `Chọn mua gói ${plan.shortName}`
                          : `Đăng nhập để mua ${plan.shortName}`}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3 Key Landlord & Policy Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/70">
          <div className="flex items-start gap-3 rounded-2xl bg-muted/40 p-4 border border-border/60">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-foreground mb-1">
                Xác thực KYC & Hợp đồng On-chain
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tăng độ tin cậy cho bài đăng, hỗ trợ đặt cọc và ký hợp đồng thuê minh bạch.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-muted/40 p-4 border border-border/60">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-foreground mb-1">
                Ưu đãi nâng cấp 24h đầu tiên
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chỉ bù chênh lệch giá khi nâng cấp lên gói cao hơn trong 24 giờ kể từ lần mua đầu.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-muted/40 p-4 border border-border/60">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-foreground mb-1">
                Lưu nháp miễn phí & Giữ hiển thị tin
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chỉ trừ lượt khi gửi duyệt hoặc đăng lại; tin đã duyệt hiển thị đủ hạn riêng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
