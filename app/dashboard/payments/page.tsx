"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  Ban,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Copy,
  ExternalLink,
  Landmark,
} from "lucide-react";
import paymentRequestService from "@/services/payment-request.service";
import notificationService from "@/services/notification.service";
import { useAuth } from "@/features/auth/useAuth";
import { contractDetailPath, invoiceDetailPath } from "@/lib/contract-routes";
import type { PaymentRequest, PaymentStatus } from "@/types/payment-request.type";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import PaymentDisputePanel from "@/components/payment/PaymentDisputePanel";
import SettlementPaymentPanel from "@/components/contract/detail/SettlementPaymentPanel";

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

const STATUS_BADGES: Record<
  PaymentStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  AWAITING_TRANSFER: {
    label: "Chờ chuyển khoản",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    icon: Clock,
  },
  TRANSFER_REPORTED: {
    label: "Đã báo chuyển — Chờ xác nhận",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    icon: Clock,
  },
  CONFIRMED: {
    label: "Đã xác nhận",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  REJECTED: {
    label: "Từ chối xác nhận",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    icon: Ban,
  },
  DISPUTED: {
    label: "Đang đối soát",
    className: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    icon: AlertCircle,
  },
  CANCELLED: {
    label: "Đã hủy",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    icon: Ban,
  },
  OVERDUE: {
    label: "Quá hạn — vẫn có thể thanh toán",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    icon: AlertCircle,
  },
  EXPIRED: {
    label: "Đã hết hạn",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    icon: Ban,
  },
};

const TYPE_LABELS: Record<PaymentRequest["type"], string> = {
  RESERVATION_DEPOSIT: "Tiền cọc giữ chỗ",
  INITIAL: "Tiền thuê tháng đầu / cọc",
  MONTHLY_RENT: "Hóa đơn tháng",
  UTILITY: "Chi phí dịch vụ",
  OTHER_CHARGE: "Khoản phí khác",
  INITIAL_PAYMENT_REFUND: "Hoàn tiền",
  DEPOSIT_REFUND: "Hoàn tiền cọc",
  DEPOSIT_ADJUSTMENT: "Điều chỉnh tiền cọc",
};

function paymentTypeLabel(p: PaymentRequest): string {
  if (p.type === "DEPOSIT_ADJUSTMENT") {
    return p.direction === "LANDLORD_TO_TENANT" ? "Hoàn chênh lệch cọc" : "Nộp bổ sung cọc";
  }
  return TYPE_LABELS[p.type] ?? "Khoản chuyển khoản khác";
}

const RENTAL_REQUEST_TYPES: ReadonlySet<PaymentRequest["type"]> = new Set([
  "INITIAL",
  "RESERVATION_DEPOSIT",
  "INITIAL_PAYMENT_REFUND",
]);

/**
 * Link to the existing authorized action flow. The landlord is the persisted payee of a
 * tenant→landlord payment and the persisted payer of a refund; never the selected dashboard role
 * or the query. No link unless the verified actor is a stored party.
 */
function paymentLink(p: PaymentRequest, actorId: string): { href: string; label: string } | null {
  const refund = p.direction === "LANDLORD_TO_TENANT";
  const landlordId = refund ? p.payerId : p.payeeId;
  const tenantId = refund ? p.payeeId : p.payerId;
  const owner = actorId === landlordId;
  if (!owner && actorId !== tenantId) return null;
  if (RENTAL_REQUEST_TYPES.has(p.type) && p.rentalRequestId) {
    return {
      href: `/dashboard/rental-requests${owner ? "" : "/my-requests"}?requestId=${encodeURIComponent(p.rentalRequestId)}`,
      label: "Xem yêu cầu thuê",
    };
  }
  if (!p.contractId) return null;
  if (["DEPOSIT_ADJUSTMENT", "DEPOSIT_REFUND"].includes(p.type) || p.type === "OTHER_CHARGE" && !p.invoiceId) {
    return { href: `${invoiceDetailPath(p.contractId)}?section=deposit`, label: "Xem quyết toán / cọc" };
  }
  if (p.type === "MONTHLY_RENT" || p.invoiceId) {
    return { href: invoiceDetailPath(p.contractId), label: "Xem hóa đơn" };
  }
  return { href: contractDetailPath(owner ? "landlord" : "tenant", p.contractId), label: "Xem hợp đồng" };
}

// Same shape the notification consumer accepts; only compared with ids of the caller's own list, never sent to an endpoint.
const PAYMENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const NOT_FOUND_MESSAGE = "Không tìm thấy yêu cầu chuyển khoản hoặc bạn không có quyền xem yêu cầu này.";

function PaymentsGate() {
  const searchParams = useSearchParams();
  const { initialized, authenticated, userId, login } = useAuth();
  const rawPaymentId = searchParams.get("paymentId")?.trim() ?? "";
  const targetId = PAYMENT_ID_PATTERN.test(rawPaymentId) ? rawPaymentId : "";

  if (!initialized) {
    return (
      <div className="flex min-h-56 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated || !userId) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-3xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <h1 className="text-lg sm:text-xl font-extrabold text-foreground">Đăng nhập để xem yêu cầu chuyển khoản</h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Yêu cầu chuyển khoản chỉ hiển thị cho các bên liên quan.
          </p>
          <button
            type="button"
            onClick={() => login(`${window.location.pathname}${window.location.search}${window.location.hash}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all cursor-pointer"
          >
            Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  // Keyed by the verified account only: a switch resets data; a query change just re-selects.
  return <PaymentsBody key={userId} actorId={userId} targetId={targetId} invalidTarget={Boolean(rawPaymentId) && !targetId} />;
}

function PaymentsBody({ actorId, targetId, invalidTarget }: { actorId: string; targetId: string; invalidTarget: boolean }) {
  const [payments, setPayments] = useState<PaymentRequest[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [openRefund, setOpenRefund] = useState<{ id: string; selection: string } | null>(null);
  const aliveRef = useRef(false);
  const inflightRef = useRef<Promise<void> | null>(null);
  const dirtyRef = useRef(false);
  const hiddenDirtyRef = useRef(false);
  const hasDataRef = useRef(false);
  const scrolledForRef = useRef("");

  // One authorized /mine GET at a time. A request made while one is in flight marks it dirty and
  // gets exactly one follow-up (not a parallel call); the returned promise covers the follow-up.
  const requestList = useCallback((): Promise<void> => {
    if (inflightRef.current) {
      dirtyRef.current = true;
      return inflightRef.current;
    }
    const run = (async () => {
      try {
        for (;;) {
          dirtyRef.current = false;
          try {
            const data = await paymentRequestService.getMyPaymentRequests();
            if (!aliveRef.current) return;
            hasDataRef.current = true;
            setPayments(data.filter(p => actorId === p.payerId || actorId === p.payeeId));
            setLoadError(false);
            setRefreshError(false);
          } catch {
            if (!aliveRef.current) return;
            // Keep the rows already shown; only an empty page gets the blocking error.
            if (hasDataRef.current) setRefreshError(true);
            else setLoadError(true);
          }
          // A notice that arrived during this GET (even a failed one) still gets one fresh read;
          // each pass needs a new notice, so failures cannot loop.
          if (!dirtyRef.current) return;
          if (document.visibilityState !== "visible") {
            hiddenDirtyRef.current = true;
            return;
          }
        }
      } finally {
        inflightRef.current = null;
      }
    })();
    inflightRef.current = run;
    return run;
  }, [actorId]);

  useEffect(() => {
    aliveRef.current = true;
    void requestList();
    return () => {
      aliveRef.current = false;
    };
  }, [requestList]);

  // Payment notices and reconnect/focus/push recovery: 250 ms coalesce, a hidden tab only marks dirty.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (document.visibilityState !== "visible") {
        hiddenDirtyRef.current = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        // The tab may have been hidden during the coalesce window.
        if (document.visibilityState !== "visible") {
          hiddenDirtyRef.current = true;
          return;
        }
        void requestList();
      }, 250);
    };
    const unsubscribe = notificationService.subscribe((event) => {
      if (event.type === "payment-changed") schedule();
    });
    const onVisible = () => {
      if (document.visibilityState === "visible" && hiddenDirtyRef.current) {
        hiddenDirtyRef.current = false;
        schedule();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [requestList]);

  const targetFound = Boolean(targetId && payments?.some((p) => p.id === targetId));
  useEffect(() => {
    if (!targetFound || scrolledForRef.current === targetId) return;
    const card = Array.from(document.querySelectorAll<HTMLElement>("[data-payment-id]"))
      .find((element) => element.dataset.paymentId === targetId);
    if (!card) return;
    scrolledForRef.current = targetId;
    card.scrollIntoView({ block: "center" });
    card.focus({ preventScroll: true });
  }, [targetFound, targetId]);

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`Đã sao chép ${label}`);
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Yêu cầu chuyển khoản trực tiếp
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Theo dõi các khoản chuyển khoản tiền thuê, đặt cọc giữ chỗ và hoàn cọc trực tiếp giữa chủ nhà và người thuê.
          </p>
        </div>
        <Link
          href="/settings/bank-accounts"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-2xs"
        >
          <Landmark className="w-4 h-4 text-primary" />
          <span>Tài khoản ngân hàng của bạn</span>
        </Link>
      </div>

      {/* Direct Transfer Principles Card */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-xs text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-blue-950 dark:text-blue-100">
              Quy chế giao dịch tại HomeSpace
            </p>
            <p className="leading-relaxed text-blue-800/90 dark:text-blue-300/90">
              HomeSpace <strong>KHÔNG</strong> phải ví điện tử và <strong>KHÔNG</strong> giữ tiền của các bên.
              Tất cả các khoản tiền thuê và đặt cọc được chuyển khoản <strong>trực tiếp 100%</strong> vào tài khoản ngân hàng của đối tác qua VietQR.
            </p>
          </div>
        </div>
      </div>

      {(invalidTarget || (targetId && payments && !targetFound)) && (
        <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {NOT_FOUND_MESSAGE}
        </div>
      )}

      {refreshError && payments && (
        <div role="status" className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          <span>Chưa cập nhật được dữ liệu mới nhất.</span>
          <button type="button" onClick={() => void requestList()} className="font-semibold text-primary hover:underline">
            Tải lại
          </button>
        </div>
      )}

      {payments === null && loadError ? (
        <div role="alert" className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <span>Không thể tải danh sách yêu cầu chuyển khoản.</span>
          <button
            type="button"
            onClick={() => { setLoadError(false); void requestList(); }}
            className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            Thử lại
          </button>
        </div>
      ) : payments === null ? (
        <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
          Đang tải dữ liệu...
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-card rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">
          <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm font-semibold text-foreground">Chưa có giao dịch chuyển khoản nào</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Khi bạn tạo hoặc chấp thuận một yêu cầu thuê nhà, hệ thống sẽ tự động tạo yêu cầu chuyển khoản và mã VietQR tương ứng.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {payments.map((p) => {
            const statusConfig = STATUS_BADGES[p.status] || STATUS_BADGES.AWAITING_TRANSFER;
            const StatusIcon = statusConfig.icon;

            return (
              <div
                key={p.id}
                data-payment-id={p.id}
                tabIndex={-1}
                aria-current={p.id === targetId ? "true" : undefined}
                className={`rounded-2xl border bg-card p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 outline-none ${
                  p.id === targetId ? "border-primary ring-2 ring-primary/40" : "border-border"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-muted px-2 py-0.5 rounded-lg text-foreground">
                      Ref: {p.transferReference}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {paymentTypeLabel(p)}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${statusConfig.className}`}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span>{statusConfig.label}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Số tiền chuyển:</span>
                    <span className="font-extrabold text-base text-primary">
                      {formatVND(p.totalAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Tài khoản thụ hưởng:</span>
                    {(() => {
                      const payee = p.payeeBankAccountSnapshot || p.payeeAccount;
                      return (
                        <>
                          <span className="font-semibold text-foreground block truncate">
                            {payee ? `${payee.bankCode} • ${payee.accountNumber}` : "—"}
                          </span>
                          <span className="text-[11px] text-muted-foreground block truncate">
                            {payee?.accountHolderName}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Thời gian:</span>
                    <span className="text-foreground">
                      {p.createdAt ? format(new Date(p.createdAt), "dd/MM/yyyy HH:mm") : "—"}
                    </span>
                    {p.confirmedAt && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">
                        Xác nhận: {format(new Date(p.confirmedAt), "dd/MM/yyyy HH:mm")}
                      </span>
                    )}
                  </div>
                </div>

                {!(openRefund?.id === p.id && openRefund.selection === targetId) && <PaymentDisputePanel payment={p} onUpdated={requestList} />}
                {p.type === "INITIAL_PAYMENT_REFUND" && (actorId === p.payerId || actorId === p.payeeId) && <>
                  <button type="button" className="text-xs font-semibold text-primary underline" onClick={() => setOpenRefund({ id: p.id, selection: targetId })}>Mở thao tác hoàn tiền</button>
                  {openRefund?.id === p.id && openRefund.selection === targetId && <SettlementPaymentPanel key={`${actorId}:${p.id}`} payment={p}
                    isLandlord={actorId === (p.direction === "LANDLORD_TO_TENANT" ? p.payerId : p.payeeId)} refresh={requestList} />}
                </>}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => copyText(p.transferReference, "nội dung chuyển khoản")}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="w-3 h-3" />
                      Sao chép nội dung CK
                    </button>
                  </div>
                  {(() => {
                    const link = paymentLink(p, actorId);
                    return link && (
                      <Link href={link.href}
                        className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                        <span>{link.label}</span><ExternalLink className="w-3 h-3" />
                      </Link>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-56 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <PaymentsGate />
    </Suspense>
  );
}
