"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  X,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  CalendarClock,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/useAuth";
import membershipService from "@/services/membership.service";
import {
  MEMBERSHIP_PAYMENT_PROVIDERS,
  cancelOrderOnQuoteChange,
  clearPendingMembershipOrderId,
  formatExactVnd,
  getMembershipErrorMessage,
  getPendingMembershipOrderId,
  getTierLabel,
  isMembershipPendingOrderError,
  isOrderCancelledStatus,
  savePendingMembershipOrderId,
  submitSePayCheckoutForm,
  validateCheckoutResponse,
} from "@/lib/membership";
import type {
  MembershipPaymentProvider,
  MembershipPlan,
  MembershipQuote,
  MembershipView,
  PaidMembershipTierCode,
} from "@/types/membership.type";

interface MembershipCheckoutModalProps {
  isOpen: boolean;
  plan: MembershipPlan | null;
  currentMembership: MembershipView | null;
  onClose: () => void;
}

function formatDateTimeVi(iso?: string | null): string {
  if (!iso) return "30 ngày kể từ lúc kích hoạt";
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

export default function MembershipCheckoutModal({
  isOpen,
  plan,
  currentMembership,
  onClose,
}: MembershipCheckoutModalProps) {
  const { authenticated, login } = useAuth();
  const [quote, setQuote] = useState<MembershipQuote | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [hasPendingOrderConflict, setHasPendingOrderConflict] = useState(false);
  const [preservedOrderId, setPreservedOrderId] = useState<string | null>(null);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);
  const [selectedProvider, setSelectedProvider] =
    useState<MembershipPaymentProvider>("SEPAY");

  const targetTier = (plan?.code && plan.code !== "FREE" && plan.code !== "ADMIN"
    ? plan.code
    : null) as PaidMembershipTierCode | null;

  const fetchServerQuote = useCallback(async () => {
    if (!targetTier || !authenticated) return;
    setLoadingQuote(true);
    setQuoteError(null);
    setCheckoutError(null);
    setHasPendingOrderConflict(false);
    try {
      const serverQuote = await membershipService.getQuote(targetTier);
      setQuote(serverQuote);
    } catch (error: unknown) {
      setQuote(null);
      setQuoteError(
        getMembershipErrorMessage(
          error,
          "Không thể lấy báo giá từ máy chủ. Vui lòng thử lại để xem số tiền chính xác.",
        ),
      );
    } finally {
      setLoadingQuote(false);
    }
  }, [authenticated, targetTier]);

  useEffect(() => {
    if (isOpen && targetTier && authenticated) {
      setSelectedProvider("SEPAY");
      fetchServerQuote();
    } else {
      setQuote(null);
      setQuoteError(null);
      setCheckoutError(null);
      setHasPendingOrderConflict(false);
      setPreservedOrderId(null);
      setSubmittingCheckout(false);
      setSelectedProvider("SEPAY");
    }
  }, [isOpen, targetTier, authenticated, fetchServerQuote]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submittingCheckout) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, submittingCheckout, onClose]);

  if (!isOpen || !plan || !targetTier) return null;

  const isUpgradeMode = Boolean(quote?.upgrade || quote?.mode === "UPGRADE");
  const hasUnusedOldQuotaWarning =
    !isUpgradeMode &&
    currentMembership &&
    !currentMembership.unlimited &&
    (currentMembership.remainingUses > 0 || currentMembership.tier !== "FREE");

  const priceDifferenceSaved =
    isUpgradeMode && quote && plan.priceVnd > quote.amountVnd
      ? plan.priceVnd - quote.amountVnd
      : 0;

  const consumedUsesInWindow =
    isUpgradeMode && quote && plan.publicationUses >= quote.remainingUsesAfter
      ? plan.publicationUses - quote.remainingUsesAfter
      : 0;

  async function handleConfirmCheckout() {
    if (!authenticated) {
      login(targetTier ? `/membership?tier=${encodeURIComponent(targetTier)}` : "/membership");
      return;
    }
    if (!targetTier || !quote || submittingCheckout) return;
    setSubmittingCheckout(true);
    setCheckoutError(null);
    setHasPendingOrderConflict(false);
    try {
      const checkoutRes = await membershipService.checkout(
        targetTier,
        selectedProvider,
      );

      // If server re-quote under lock changed the price (e.g., 24h window just expired),
      // cancel the newly created pending order via existing service first so it does not
      // block retry, then refresh the quote and ask the user to review the updated amount.
      const quoteChangeResult = await cancelOrderOnQuoteChange(
        checkoutRes,
        quote.amountVnd,
        (orderId) => membershipService.cancelOrder(orderId),
      );
      if (quoteChangeResult.quoteChanged) {
        await fetchServerQuote();
        if (quoteChangeResult.cancelled) {
          setPreservedOrderId(null);
          toast.warning(
            quoteChangeResult.message ??
              `Số tiền thanh toán từ máy chủ đã cập nhật thành ${formatExactVnd(checkoutRes.amountVnd)}. Đơn tạm đã được hủy, vui lòng kiểm tra lại và xác nhận.`,
          );
        } else {
          const fallbackMsg = `Số tiền thanh toán đã thay đổi thành ${formatExactVnd(checkoutRes.amountVnd)}, nhưng chưa thể tự động hủy đơn hàng #${checkoutRes.orderId}. Vui lòng kiểm tra trạng thái đơn hàng trước khi thử lại.`;
          const errMsg = quoteChangeResult.message ?? fallbackMsg;
          setPreservedOrderId(quoteChangeResult.preservedOrderId);
          setCheckoutError(errMsg);
          setHasPendingOrderConflict(
            Boolean(quoteChangeResult.preservedOrderId),
          );
          toast.error(errMsg);
        }
        setSubmittingCheckout(false);
        return;
      }

      const validation = validateCheckoutResponse(
        checkoutRes,
        selectedProvider,
      );
      if (!validation.valid) {
        let cancelSucceeded = false;
        if (checkoutRes.orderId) {
          try {
            const cancelledOrder = await membershipService.cancelOrder(
              checkoutRes.orderId,
            );
            cancelSucceeded = isOrderCancelledStatus(cancelledOrder.status);
          } catch {
            cancelSucceeded = false;
          }
          if (cancelSucceeded) {
            clearPendingMembershipOrderId();
            setPreservedOrderId(null);
          } else {
            savePendingMembershipOrderId(checkoutRes.orderId);
            setPreservedOrderId(checkoutRes.orderId);
            setHasPendingOrderConflict(true);
          }
        }
        const invalidMsg =
          validation.errorMessage ??
          "Máy chủ không trả về thông tin biểu mẫu thanh toán SePay hợp lệ.";
        setCheckoutError(invalidMsg);
        toast.error(invalidMsg);
        setSubmittingCheckout(false);
        return;
      }

      if (checkoutRes.orderId) {
        savePendingMembershipOrderId(checkoutRes.orderId);
        setPreservedOrderId(checkoutRes.orderId);
      }

      toast.loading("Đang chuyển hướng tới cổng thanh toán SePay...", {
        id: "sepay-redirect",
      });
      submitSePayCheckoutForm(checkoutRes);
    } catch (error: unknown) {
      const errMsg = getMembershipErrorMessage(
        error,
        "Không thể khởi tạo giao dịch thanh toán SePay. Vui lòng thử lại.",
      );
      setCheckoutError(errMsg);
      setHasPendingOrderConflict(isMembershipPendingOrderError(error));
      toast.error(errMsg);
      setSubmittingCheckout(false);
    }
  }

  const savedPendingOrderId = preservedOrderId || getPendingMembershipOrderId();

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in-50"
      onClick={() => {
        if (!submittingCheckout) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-checkout-modal-title"
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-5 bg-muted/20">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Xác nhận đơn hàng hội viên</span>
            </div>
            <h3
              id="membership-checkout-modal-title"
              className="text-lg font-extrabold text-foreground"
            >
              {isUpgradeMode ? `Nâng cấp lên ${plan.name}` : `Đăng ký ${plan.name}`}
            </h3>
          </div>
          <button
            type="button"
            disabled={submittingCheckout}
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {loadingQuote && (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-xs font-semibold">
                Đang lấy báo giá chính xác từ máy chủ HomeSpace...
              </p>
            </div>
          )}

          {!loadingQuote && quoteError && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-5 text-center space-y-3">
              <AlertTriangle className="h-7 w-7 text-rose-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  Không thể tải báo giá từ máy chủ
                </p>
                <p className="text-xs text-rose-700 dark:text-rose-300">{quoteError}</p>
              </div>
              <button
                type="button"
                onClick={fetchServerQuote}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}

          {!loadingQuote && quote && (
            <>
              {/* Mode Badge & Explanation */}
              {isUpgradeMode ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-800/60 dark:bg-emerald-950/30 p-4 space-y-1.5 text-xs text-emerald-950 dark:text-emerald-200">
                  <div className="flex items-center gap-2 font-extrabold text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>Áp dụng ưu đãi nâng cấp trong 24 giờ đầu tiên</span>
                  </div>
                  <p className="leading-relaxed text-emerald-900/90 dark:text-emerald-200/90">
                    Bạn chỉ cần thanh toán <strong>phần chênh lệch giá</strong> so với gói đã mua.
                    Gói mới sẽ thay thế gói hiện tại với số lượt bằng{" "}
                    <strong>
                      định mức gói {plan.shortName} ({plan.publicationUses} lượt) trừ đi số lượt đã sử dụng ({consumedUsesInWindow} lượt)
                    </strong>.
                  </p>
                  {quote.upgradeDeadline && (
                    <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 pt-0.5">
                      Thời hạn ưu đãi nâng cấp 24h: tới {formatDateTimeVi(quote.upgradeDeadline)}
                    </p>
                  )}
                </div>
              ) : (
                hasUnusedOldQuotaWarning && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-amber-300 bg-amber-50/90 dark:border-amber-800/70 dark:bg-amber-950/40 p-4 space-y-1.5 text-xs text-amber-950 dark:text-amber-200"
                  >
                    <div className="flex items-center gap-2 font-extrabold text-amber-900 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>Cảnh báo thay thế gói — Không cộng dồn lượt cũ</span>
                    </div>
                    <p className="leading-relaxed text-amber-900/90 dark:text-amber-200/90">
                      Giao dịch này áp dụng <strong>nguyên giá gói</strong> (ngoài khung nâng cấp 24h đầu tiên hoặc mua mới).
                      Khi gói <strong>{plan.shortName}</strong> kích hoạt, gói hiện tại (
                      {getTierLabel(currentMembership?.tier)}) sẽ kết thúc và{" "}
                      <strong>
                        {currentMembership?.remainingUses ?? 0} lượt chưa sử dụng của gói cũ sẽ chấm dứt
                      </strong>{" "}
                      (các gói thay thế nhau, không cộng dồn).
                    </p>
                  </div>
                )
              )}

              {/* Server-Quoted Summary Table */}
              <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Gói hiện tại:</span>
                  <span className="font-bold text-foreground">
                    {getTierLabel(currentMembership?.tier)} (Còn {currentMembership?.remainingUses ?? 0} lượt)
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Gói đăng ký mới:</span>
                  <span className="font-bold text-primary">{plan.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Giá niêm yết của gói:</span>
                  <span className={priceDifferenceSaved > 0 ? "line-through text-muted-foreground" : "font-semibold text-foreground"}>
                    {formatExactVnd(plan.priceVnd)}
                  </span>
                </div>

                {priceDifferenceSaved > 0 && (
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
                    <span>Khấu trừ gói cũ (trong 24h đầu):</span>
                    <span className="font-bold">-{formatExactVnd(priceDifferenceSaved)}</span>
                  </div>
                )}

                <div className="border-t border-border pt-3 flex items-center justify-between">
                  <span className="font-bold text-foreground text-sm">
                    Số tiền thanh toán (Server báo giá):
                  </span>
                  <span
                    data-testid="server-quoted-amount"
                    className="text-lg font-extrabold text-primary"
                  >
                    {formatExactVnd(quote.amountVnd)}
                  </span>
                </div>
              </div>

              {/* Quota & Expiry After Purchase */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Số lượt khả dụng sau thanh toán</span>
                  </div>
                  <p
                    data-testid="server-quoted-remaining-uses"
                    className="text-base font-extrabold text-foreground"
                  >
                    {quote.remainingUsesAfter} lượt đăng tin
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isUpgradeMode
                      ? `Định mức ${plan.publicationUses} lượt trừ số lượt đã dùng`
                      : `Thay thế bằng toàn bộ ${quote.remainingUsesAfter} lượt của gói mới`}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    <span>Thời hạn gói sau kích hoạt</span>
                  </div>
                  <p className="text-sm font-extrabold text-foreground">
                    {formatDateTimeVi(quote.expiresAtAfter)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Chu kỳ {plan.durationDays || 30} ngày
                  </p>
                </div>
              </div>

              {/* Payment Provider Selection */}
              <div
                role="radiogroup"
                aria-label="Chọn cổng thanh toán"
                data-testid="payment-provider-selection"
                className="space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-foreground">
                    Phương thức thanh toán
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Thanh toán trực tuyến an toàn
                  </span>
                </div>

                <div className="space-y-2">
                  {MEMBERSHIP_PAYMENT_PROVIDERS.map((providerOpt) => {
                    const isSelected = selectedProvider === providerOpt.code;
                    return (
                      <button
                        key={providerOpt.code}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={submittingCheckout}
                        data-testid={`payment-provider-option-${providerOpt.code}`}
                        onClick={() => {
                          if (submittingCheckout) return;
                          setSelectedProvider(providerOpt.code);
                        }}
                        className={`w-full rounded-2xl border p-3.5 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/15 cursor-pointer"
                            : "border-border bg-card hover:border-primary/40 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/40 bg-background"
                              }`}
                            >
                              {isSelected && (
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              )}
                            </span>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-extrabold text-foreground">
                                  {providerOpt.label}
                                </span>
                                <span className="inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                                  {providerOpt.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {providerOpt.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Security & Business Assurance */}
              <div className="rounded-xl bg-muted/50 p-3 text-[11px] text-muted-foreground flex items-start gap-2.5 leading-relaxed">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <span>
                  Số tiền thanh toán được xác định trực tiếp bởi máy chủ HomeSpace. Trình duyệt sẽ gửi biểu mẫu thanh toán an toàn (POST) sang cổng <strong>SePay</strong> và kết quả đơn hàng được xác thực từ máy chủ sau khi hoàn tất.
                </span>
              </div>

              {checkoutError && (
                <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-4 space-y-2 text-xs text-rose-900 dark:text-rose-200">
                  <div className="flex items-start gap-2 font-bold">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>{checkoutError}</span>
                  </div>
                  {hasPendingOrderConflict && savedPendingOrderId && (
                    <div className="pt-1">
                      <Link
                        href={`/dashboard/membership/return?orderId=${encodeURIComponent(savedPendingOrderId)}`}
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 font-extrabold text-primary hover:underline"
                      >
                        <span>Kiểm tra trạng thái đơn đang chờ (#{savedPendingOrderId.slice(0, 8)}...)</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-border bg-muted/20 px-6 py-4">
          <button
            type="button"
            disabled={submittingCheckout}
            onClick={onClose}
            className="h-10 rounded-xl border border-border bg-card px-4 text-xs font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
          >
            Hủy
          </button>

          <button
            type="button"
            data-testid="confirm-membership-checkout-button"
            disabled={
              loadingQuote ||
              Boolean(quoteError) ||
              !quote ||
              submittingCheckout ||
              selectedProvider !== "SEPAY"
            }
            onClick={handleConfirmCheckout}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {submittingCheckout ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang chuyển tới SePay...</span>
              </>
            ) : (
              <>
                <span>
                  {quote
                    ? `Thanh toán ${formatExactVnd(quote.amountVnd)} qua SePay`
                    : "Thanh toán qua SePay"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : null;
}
