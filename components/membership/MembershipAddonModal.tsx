"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useFeatureGate } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/lib/permissions";
import membershipService from "@/services/membership.service";
import PaymentProviderPicker from "./PaymentProviderPicker";
import {
  cancelOrderOnQuoteChange,
  clearPendingMembershipOrderId,
  formatExactVnd,
  getMembershipErrorMessage,
  getPendingMembershipOrderId,
  isMembershipPendingOrderError,
  isMembershipRecentlyPaidError,
  isOrderCancelledStatus,
  savePendingMembershipOrderId,
  submitSePayCheckoutForm,
  validateCheckoutResponse,
} from "@/lib/membership";
import RepeatPurchaseConfirm from "./RepeatPurchaseConfirm";
import type { MembershipAddonOffer, MembershipPaymentProvider } from "@/types/membership.type";

interface Props {
  /** Server price of the Starter plan; null hides the comparison hint. */
  starterPriceVnd: number | null;
  onClose: () => void;
}

/** One-off extra uses; the ETH page, result page and order status are the plan checkout's. */
export default function MembershipAddonModal({ starterPriceVnd, onClose }: Props) {
  const purchaseGate = useFeatureGate(PERMISSIONS.MEMBERSHIP_PURCHASE);
  const [offer, setOffer] = useState<MembershipAddonOffer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [provider, setProvider] = useState<MembershipPaymentProvider>("SEPAY");
  const router = useRouter();
  const [offerError, setOfferError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [repeatMessage, setRepeatMessage] = useState<string | null>(null);

  const loadOffer = useCallback(() => {
    membershipService.getAddonOffer().then(
      (next) => {
        setOffer(next);
        setOfferError(null);
      },
      (error) => setOfferError(getMembershipErrorMessage(error, "Chưa tải được giá lượt mua thêm.")),
    );
  }, []);

  useEffect(loadOffer, [loadOffer]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [submitting, onClose]);

  const total = offer ? offer.unitPriceVnd * quantity : 0;
  const providerName = provider === "ETH" ? "MetaMask" : "SePay";

  async function handleCheckout(repeat?: boolean) {
    if (!offer || submitting) return;
    setSubmitting(true);
    setCheckoutError(null);
    setPendingOrderId(null);
    try {
      const checkout = await membershipService.checkoutAddon(quantity, provider, repeat === true);
      const priceChange = await cancelOrderOnQuoteChange(checkout, total, (id) =>
        membershipService.cancelOrder(id),
      );
      if (priceChange.quoteChanged) {
        loadOffer();
        setPendingOrderId(priceChange.preservedOrderId);
        setCheckoutError(priceChange.message);
        setSubmitting(false);
        return;
      }

      const validation = validateCheckoutResponse(checkout, provider);
      if (!validation.valid) {
        if (checkout.orderId) {
          const cancelled = await membershipService.cancelOrder(checkout.orderId).then(
            (order) => isOrderCancelledStatus(order.status),
            () => false,
          );
          if (cancelled) {
            clearPendingMembershipOrderId();
          } else {
            savePendingMembershipOrderId(checkout.orderId);
            setPendingOrderId(checkout.orderId);
          }
        }
        setCheckoutError(validation.errorMessage);
        setSubmitting(false);
        return;
      }

      savePendingMembershipOrderId(checkout.orderId);
      if (provider === "ETH") {
        router.push(`/dashboard/membership/eth?orderId=${encodeURIComponent(checkout.orderId)}`);
        return;
      }
      toast.loading("Đang chuyển hướng tới cổng thanh toán SePay...", { id: "sepay-redirect" });
      submitSePayCheckoutForm(checkout);
    } catch (error: unknown) {
      if (isMembershipRecentlyPaidError(error)) {
        setRepeatMessage(getMembershipErrorMessage(error));
        setSubmitting(false);
        return;
      }
      setRepeatMessage(null);
      setCheckoutError(
        getMembershipErrorMessage(error, "Không thể khởi tạo giao dịch thanh toán. Vui lòng thử lại."),
      );
      if (isMembershipPendingOrderError(error)) setPendingOrderId(getPendingMembershipOrderId());
      setSubmitting(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => {
        if (!submitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-addon-title"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border bg-card p-6 space-y-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id="membership-addon-title" className="text-lg font-extrabold text-foreground">
            Mua thêm lượt đăng tin
          </h3>
          <button
            type="button"
            aria-label="Đóng"
            disabled={submitting}
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {offer ? (
          <div className="space-y-3 text-xs">
            <p className="text-muted-foreground">
              {formatExactVnd(offer.unitPriceVnd)}/lượt. Mỗi lượt dùng trong{" "}
              <strong className="text-foreground">{offer.validDays} ngày</strong>, quá hạn sẽ mất.
              Lượt gói được dùng trước; đổi gói không mất lượt mua thêm.
            </p>
            <label className="flex items-center justify-between gap-3 font-bold text-foreground">
              Số lượt
              <select
                value={quantity}
                disabled={submitting}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="rounded-xl border border-border bg-background px-3 py-2"
              >
                {Array.from({ length: offer.maxQuantity }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <p className="flex items-center justify-between border-t border-border pt-3 text-sm font-bold text-foreground">
              Tổng thanh toán
              <span data-testid="addon-total" className="text-lg font-extrabold text-primary">
                {formatExactVnd(total)}
              </span>
            </p>
            {starterPriceVnd !== null && total > starterPriceVnd && (
              <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                Gói Starter ({formatExactVnd(starterPriceVnd)}) rẻ hơn số lượt bạn đang chọn.
              </p>
            )}
          </div>
        ) : offerError ? (
          <div role="alert" className="space-y-2 text-xs text-rose-600">
            <p>{offerError}</p>
            <button type="button" onClick={loadOffer} className="rounded-xl border border-border px-3 py-1.5 font-bold text-foreground cursor-pointer">
              Thử lại
            </button>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải giá...
          </p>
        )}

        {offer && <PaymentProviderPicker value={provider} disabled={submitting} onChange={setProvider} />}

        {checkoutError && (
          <div role="alert" className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            <p className="font-bold">{checkoutError}</p>
            {pendingOrderId && (
              <Link href={`/dashboard/membership/return?orderId=${encodeURIComponent(pendingOrderId)}`} onClick={onClose} className="font-extrabold text-primary hover:underline">
                Kiểm tra đơn đang chờ
              </Link>
            )}
          </div>
        )}

        <button
          type="button"
          disabled={!offer || submitting || !purchaseGate.allowed}
          title={purchaseGate.title}
          onClick={() => handleCheckout()}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {offer ? `Thanh toán ${formatExactVnd(total)} qua ${providerName}` : `Thanh toán qua ${providerName}`}
        </button>
      </div>
    </div>
    {repeatMessage && (
      <RepeatPurchaseConfirm message={repeatMessage} sending={submitting}
        onCancel={() => setRepeatMessage(null)} onConfirm={() => handleCheckout(true)} />
    )}
    </>,
    document.body,
  );
}
