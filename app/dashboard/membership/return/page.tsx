"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ArrowRight,
  Building2,
  Crown,
  PlusCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import membershipService from "@/services/membership.service";
import notificationService from "@/services/notification.service";
import { useAuth } from "@/features/auth/useAuth";
import {
  type CancelOrderOutcome,
  canCancelMembershipOrder,
  clearPendingMembershipOrderId,
  formatExactVnd,
  getMembershipErrorMessage,
  getOrderStatusPresentation,
  getPaymentProviderDisplayName,
  getPendingMembershipOrderId,
  getTierLabel,
  isOrderCancelledStatus,
  isOrderFailedStatus,
  isOrderPaidStatus,
  isOrderPendingStatus,
  isOrderReviewStatus,
  normalizeOrderProvider,
  resolveCancelOrderOutcome,
} from "@/lib/membership";
import type {
  MembershipOrderView,
  MembershipPaymentProvider,
  MembershipView,
} from "@/types/membership.type";

// Thrown by a notice-driven read that must not start a GET while the tab is hidden.
const HIDDEN_REFRESH = new Error("Membership refresh deferred while hidden");

const MAX_POLL_ATTEMPTS = 15;
const POLL_INTERVAL_MS = 2500;

function formatDateTimeVi(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function MembershipReturnContent() {
  const searchParams = useSearchParams();
  const { initialized, authenticated, userId, login } = useAuth();

  // Extract order identifier ONLY for looking up trusted backend status.
  // Never derive payment success from callback query parameters.
  const queryOrderId =
    searchParams.get("orderId")?.trim() ||
    searchParams.get("order_id")?.trim() ||
    searchParams.get("invoice_number")?.trim() ||
    "";

  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!authenticated || !userId) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-3xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <h1 className="text-lg sm:text-xl font-extrabold text-foreground">
            Đăng nhập để xem kết quả thanh toán
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Kết quả đơn hàng hội viên chỉ hiển thị cho tài khoản đã đặt đơn.
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

  // Keyed by account + order: switching either remounts, so no state, ref, timer or in-flight
  // promise of the previous account/order can paint or apply (refs reset with the instance).
  return <MembershipReturnBody key={`${userId}:${queryOrderId}`} queryOrderId={queryOrderId} />;
}

function MembershipReturnBody({ queryOrderId }: { queryOrderId: string }) {
  const [resolvedOrderId, setResolvedOrderId] = useState<string>(queryOrderId);
  const [rawOrder, setOrder] = useState<MembershipOrderView | null>(null);
  // Never render a response that belongs to another order id (query changed while mounted).
  const order = rawOrder && rawOrder.id === (queryOrderId || resolvedOrderId) ? rawOrder : null;
  const [membership, setMembership] = useState<MembershipView | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelOutcomeNotice, setCancelOutcomeNotice] = useState<CancelOrderOutcome | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollGenerationRef = useRef(0);
  const stopPollingRef = useRef(false);
  const cancellingRef = useRef(false);
  const recheckingRef = useRef(false);
  const confirmCancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const activeOrderIdRef = useRef("");
  const latestStatusRef = useRef<string | null>(null);
  // Responses apply in request order, so a slow older GET cannot overwrite a newer result.
  const fetchSeqRef = useRef(0);
  const appliedSeqRef = useRef(0);
  // At most one order GET in flight; poll, manual recheck and notices share it.
  const inflightRef = useRef<{ id: string; promise: Promise<MembershipOrderView> } | null>(null);

  const stopPolling = useCallback(() => {
    stopPollingRef.current = true;
    pollGenerationRef.current += 1;
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPolling(false);
  }, []);

  useEffect(() => {
    if (queryOrderId) {
      setResolvedOrderId(queryOrderId);
    } else {
      const savedId = getPendingMembershipOrderId();
      if (savedId) {
        setResolvedOrderId(savedId);
      } else {
        setResolvedOrderId("");
        setLoading(false);
      }
    }
  }, [queryOrderId]);

  const fetchTrustedOrder = useCallback(async (targetId: string, requestGen?: number, silent = false) => {
    // A notice-driven read must start after the notice, so wait out any older GET first.
    if (silent && inflightRef.current?.id === targetId) {
      await inflightRef.current.promise.catch(() => undefined);
      if (activeOrderIdRef.current !== targetId || cancellingRef.current) {
        throw new Error("Stale membership order refresh");
      }
      // Visibility may have changed while waiting; the pipe keeps the notice dirty for recovery.
      if (document.visibilityState !== "visible") throw HIDDEN_REFRESH;
    }
    // Sequence is taken when joining, so it follows GET start order (one flight at a time).
    const seq = ++fetchSeqRef.current;
    let flight = inflightRef.current;
    if (!flight || flight.id !== targetId) {
      const promise: Promise<MembershipOrderView> = membershipService.getOrder(targetId).finally(() => {
        if (inflightRef.current?.promise === promise) inflightRef.current = null;
      });
      flight = inflightRef.current = { id: targetId, promise };
    }
    const orderData = await flight.promise;

    if (activeOrderIdRef.current !== targetId || seq < appliedSeqRef.current) {
      return orderData;
    }

    if (
      typeof requestGen === "number" &&
      (requestGen !== pollGenerationRef.current ||
        stopPollingRef.current ||
        cancellingRef.current)
    ) {
      return orderData;
    }

    appliedSeqRef.current = seq;
    const wasPaid = isOrderPaidStatus(latestStatusRef.current);
    latestStatusRef.current = orderData.status;
    setOrder(orderData);
    setErrorMessage(null);

    if (!canCancelMembershipOrder(orderData)) {
      setShowCancelConfirm(false);
    }

    if (isOrderPaidStatus(orderData.status)) {
      clearPendingMembershipOrderId();
      // A silent re-read of an already-paid order does not need another membership fetch.
      if (!(silent && wasPaid)) {
        try {
          const updatedMe = await membershipService.getMyMembership();
          if (activeOrderIdRef.current === targetId) setMembership(updatedMe);
        } catch {
          // Ignore secondary membership refresh failure
        }
      }
    } else if (!isOrderPendingStatus(orderData.status)) {
      clearPendingMembershipOrderId();
    }

    return orderData;
  }, []);

  useEffect(() => {
    activeOrderIdRef.current = resolvedOrderId;
    latestStatusRef.current = null;
    if (!resolvedOrderId) return;

    let cancelled = false;
    let attempts = 0;
    stopPollingRef.current = false;
    cancellingRef.current = false;
    setOrder(null);
    setMembership(null);
    setErrorMessage(null);
    setShowCancelConfirm(false);
    setCancelError(null);
    setCancelOutcomeNotice(null);

    async function pollLoop() {
      if (cancelled || stopPollingRef.current || cancellingRef.current) return;
      const currentGen = ++pollGenerationRef.current;
      attempts += 1;
      setPollCount(attempts);
      setPolling(true);

      try {
        const latestOrder = await fetchTrustedOrder(resolvedOrderId, currentGen);
        if (
          cancelled ||
          stopPollingRef.current ||
          cancellingRef.current ||
          currentGen !== pollGenerationRef.current
        ) {
          return;
        }

        setLoading(false);

        if (
          isOrderPendingStatus(latestOrder.status) &&
          attempts < MAX_POLL_ATTEMPTS
        ) {
          pollTimerRef.current = setTimeout(pollLoop, POLL_INTERVAL_MS);
        } else {
          setPolling(false);
        }
      } catch (error: unknown) {
        if (
          cancelled ||
          stopPollingRef.current ||
          cancellingRef.current ||
          currentGen !== pollGenerationRef.current
        ) {
          return;
        }
        setLoading(false);
        setPolling(false);
        setErrorMessage(
          getMembershipErrorMessage(
            error,
            "Không thể truy vấn trạng thái đơn hàng từ máy chủ HomeSpace.",
          ),
        );
      }
    }

    setLoading(true);
    pollLoop();

    return () => {
      cancelled = true;
      activeOrderIdRef.current = "";
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [resolvedOrderId, fetchTrustedOrder]);

  // Silent refresh for this order on a membership notice or reconnect/focus/push recovery
  // (a late IPN can land after the poll budget). 250 ms coalesce, one in flight, at most one
  // follow-up; a hidden tab only marks dirty until visible. Failures stay silent.
  useEffect(() => {
    if (!resolvedOrderId) return;
    const targetId = resolvedOrderId;
    let disposed = false;
    let running = false;
    let queued = false;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      if (running) {
        queued = true;
        return;
      }
      running = true;
      try {
        do {
          queued = false;
          if (document.visibilityState !== "visible") {
            dirty = true;
            break;
          }
          // REVIEW is final; the cancel response is authoritative while a cancel is in flight.
          if (cancellingRef.current || isOrderReviewStatus(latestStatusRef.current)) break;
          try {
            const latest = await fetchTrustedOrder(targetId, undefined, true);
            if (!disposed && activeOrderIdRef.current === targetId && !isOrderPendingStatus(latest.status)) {
              stopPolling();
            }
          } catch (error) {
            // Silent: the page keeps its current order card.
            if (error === HIDDEN_REFRESH) {
              dirty = true;
              break;
            }
          }
        } while (queued && !disposed);
      } finally {
        running = false;
      }
    };
    const schedule = () => {
      if (document.visibilityState !== "visible") {
        dirty = true;
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!disposed) void run();
      }, 250);
    };

    const unsubscribe = notificationService.subscribe((event) => {
      if (event.type !== "membership-changed") return;
      if (event.orderId && event.orderId !== targetId) return;
      schedule();
    });
    const onVisible = () => {
      if (document.visibilityState === "visible" && dirty) {
        dirty = false;
        schedule();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      disposed = true;
      clearTimeout(timer);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [resolvedOrderId, fetchTrustedOrder, stopPolling]);

  useEffect(() => {
    if (!showCancelConfirm) return;
    confirmCancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !cancellingRef.current) {
        setShowCancelConfirm(false);
        setCancelError(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCancelConfirm]);

  async function handleManualRecheck() {
    if (!resolvedOrderId || recheckingRef.current || cancellingRef.current) return;
    recheckingRef.current = true;
    setRechecking(true);
    setErrorMessage(null);
    try {
      const latestOrder = await fetchTrustedOrder(resolvedOrderId);
      if (!isOrderPendingStatus(latestOrder.status)) {
        stopPolling();
      }
    } catch (error: unknown) {
      setErrorMessage(
        getMembershipErrorMessage(
          error,
          "Không thể kiểm tra lại trạng thái đơn hàng. Vui lòng thử lại.",
        ),
      );
    } finally {
      recheckingRef.current = false;
      setRechecking(false);
    }
  }

  async function handleConfirmCancelOrder() {
    if (!order || !canCancelMembershipOrder(order) || cancellingRef.current) {
      return;
    }

    const targetOrderId = order.id;
    cancellingRef.current = true;
    setCancelling(true);
    setCancelError(null);
    setCancelOutcomeNotice(null);

    // Pause/invalidate active polling so in-flight GET does not overwrite the cancel response
    stopPolling();

    try {
      const updatedOrder = await membershipService.cancelOrder(targetOrderId);
      if (activeOrderIdRef.current !== targetOrderId) return;
      const outcome = resolveCancelOrderOutcome(updatedOrder);

      // The cancel response is the newest truth: drop any older in-flight GET.
      appliedSeqRef.current = ++fetchSeqRef.current;
      inflightRef.current = null; // a pre-cancel GET must not be joined after this point
      latestStatusRef.current = updatedOrder.status;
      setOrder(updatedOrder);
      setErrorMessage(null);
      setShowCancelConfirm(false);
      setCancelOutcomeNotice(outcome);

      if (outcome.shouldStopPolling) {
        stopPolling();
      }

      if (outcome.shouldClearPendingOrder) {
        clearPendingMembershipOrderId();
      }

      if (isOrderPaidStatus(updatedOrder.status)) {
        try {
          const updatedMe = await membershipService.getMyMembership();
          setMembership(updatedMe);
        } catch {
          // Ignore secondary membership refresh failure
        }
      }
    } catch (error: unknown) {
      setCancelError(
        getMembershipErrorMessage(
          error,
          "Không thể hủy đơn hàng hội viên lúc này. Vui lòng thử lại.",
        ),
      );
    } finally {
      cancellingRef.current = false;
      setCancelling(false);
    }
  }

  if (!resolvedOrderId && !loading) {
    return (
      <div className="mx-auto max-w-xl py-12">
        <div className="rounded-3xl border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-foreground">
            Không tìm thấy mã đơn hàng hội viên
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Trang kết quả thanh toán cần mã đơn hàng (<code>orderId</code>) để đối soát trực tiếp trạng thái giao dịch với máy chủ HomeSpace.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard/membership"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
            >
              <Crown className="h-4 w-4" />
              <span>Về trang Gói hội viên</span>
            </Link>
            <Link
              href="/dashboard/properties"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <span>Quản lý tin đăng</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const activeProvider: MembershipPaymentProvider | null = order
    ? normalizeOrderProvider(order.provider)
    : "SEPAY";
  const providerLabel = getPaymentProviderDisplayName(activeProvider);
  const statusMeta = getOrderStatusPresentation(order?.status, activeProvider);
  const isPaid = Boolean(order && isOrderPaidStatus(order.status));
  const isCancelled = Boolean(order && isOrderCancelledStatus(order.status));
  const isFailed = Boolean(order && isOrderFailedStatus(order.status));
  const isReview = Boolean(order && isOrderReviewStatus(order.status));
  const isPending = !order || isOrderPendingStatus(order.status);
  const isTrustedPending = canCancelMembershipOrder(order);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16 animate-in fade-in-50 duration-200">
      {/* Trusted Verification Banner */}
      <div className="rounded-2xl border border-blue-200/80 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/30 p-4 text-xs text-blue-950 dark:text-blue-200 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-bold">Xác thực trạng thái đơn hàng từ máy chủ HomeSpace</p>
          <p className="text-blue-900/90 dark:text-blue-200/90">
            Hệ thống không bao giờ xác nhận thanh toán chỉ dựa vào tham số trên thanh địa chỉ (URL). Trạng thái dưới đây được truy vấn trực tiếp từ máy chủ đơn hàng của HomeSpace sau khi đối soát kết quả thanh toán với {providerLabel}.
          </p>
        </div>
      </div>

      {/* Main Result Card */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
        {loading && !order ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h1 className="text-base sm:text-lg font-extrabold text-foreground">
              Đang xác thực đơn hàng #{resolvedOrderId}...
            </h1>
            <p className="text-xs text-muted-foreground max-w-md">
              Vui lòng đợi trong giây lát khi máy chủ HomeSpace đồng bộ kết quả thanh toán từ {providerLabel}.
            </p>
          </div>
        ) : errorMessage && !order ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
              <XCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-extrabold text-foreground">
                Chưa thể tải thông tin đơn hàng
              </h1>
              <p className="text-xs text-rose-600 dark:text-rose-400">{errorMessage}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleManualRecheck}
                disabled={rechecking || cancelling}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60 cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${rechecking || polling ? "animate-spin" : ""}`} />
                <span>Thử kiểm tra lại</span>
              </button>
              <Link
                href="/dashboard/membership"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <span>Quay lại Gói hội viên</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Status Header */}
            <div className="flex flex-col items-center text-center space-y-3 border-b border-border pb-6">
              {isPaid ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
              ) : isFailed ? (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <XCircle className="h-9 w-9" />
                </div>
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Clock className="h-9 w-9 animate-pulse" />
                </div>
              )}

              <span
                data-testid="trusted-order-status-badge"
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold ${
                  isPaid
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : isFailed
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                }`}
              >
                {(polling || rechecking) && isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                <span>{statusMeta.label}</span>
              </span>

              <h1 className="text-xl sm:text-2xl font-extrabold text-foreground">
                {isPaid
                  ? "Kích hoạt gói hội viên thành công!"
                  : isReview
                  ? "Đơn hàng đang chờ bộ phận vận hành đối soát"
                  : isCancelled
                  ? "Đơn hàng hội viên đã được hủy"
                  : isFailed
                  ? "Giao dịch không thành công"
                  : "Đang xử lý xác nhận thanh toán..."}
              </h1>

              <p className="text-xs sm:text-sm text-muted-foreground max-w-lg leading-relaxed">
                {statusMeta.description}
              </p>

              {isPending && polling && (
                <p className="text-[11px] font-semibold text-primary">
                  Đang tự động kiểm tra với máy chủ (lần {pollCount}/{MAX_POLL_ATTEMPTS})...
                </p>
              )}
            </div>

            {/* Cancel Outcome / Race Resolution Banner */}
            {cancelOutcomeNotice && (
              <div
                role="status"
                data-testid="cancel-outcome-notice"
                className={`rounded-2xl border p-4 text-xs flex items-start gap-3 leading-relaxed ${
                  cancelOutcomeNotice.noticeTone === "success"
                    ? "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : cancelOutcomeNotice.noticeTone === "warning"
                    ? "border-amber-300 bg-amber-50/90 text-amber-950 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200"
                    : "border-blue-200 bg-blue-50/80 text-blue-950 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-200"
                }`}
              >
                {cancelOutcomeNotice.noticeTone === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : cancelOutcomeNotice.noticeTone === "warning" ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                ) : (
                  <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                )}
                <span>{cancelOutcomeNotice.noticeMessage}</span>
              </div>
            )}

            {/* Order Details Box */}
            {order && (
              <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Mã đơn hàng (Order ID):</span>
                  <span className="font-mono font-bold text-foreground">{order.id}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Gói đăng ký:</span>
                  <span className="font-bold text-primary">{getTierLabel(order.tier)}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Số tiền đơn hàng:</span>
                  <span className="text-sm font-extrabold text-foreground">
                    {formatExactVnd(order.amountVnd)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Cổng thanh toán:</span>
                  <span
                    data-testid="trusted-order-provider"
                    className="font-bold text-foreground"
                  >
                    {providerLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Trạng thái máy chủ:</span>
                  <span
                    data-testid="trusted-order-status-code"
                    className="font-mono font-bold text-foreground"
                  >
                    {order.status}
                  </span>
                </div>

                {order.createdAt && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Thời gian tạo đơn:</span>
                    <span className="text-foreground">{formatDateTimeVi(order.createdAt)}</span>
                  </div>
                )}

                {order.paidAt && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Thời gian xác nhận thanh toán:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatDateTimeVi(order.paidAt)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Updated Membership Summary when PAID */}
            {isPaid && membership && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-800/60 dark:bg-emerald-950/30 p-4 space-y-2 text-xs">
                <p className="font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-emerald-600" />
                  <span>Hạn mức hội viên hiện tại của bạn:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="rounded-xl bg-white/80 dark:bg-card p-3 border border-emerald-200/60 dark:border-emerald-900/50">
                    <span className="text-muted-foreground block text-[11px]">
                      Lượt đăng tin khả dụng
                    </span>
                    <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                      {membership.unlimited
                        ? "Không giới hạn (ADMIN)"
                        : `${membership.remainingUses} lượt`}
                    </span>
                  </div>
                  <div className="rounded-xl bg-white/80 dark:bg-card p-3 border border-emerald-200/60 dark:border-emerald-900/50">
                    <span className="text-muted-foreground block text-[11px]">
                      Hạn sử dụng gói
                    </span>
                    <span className="text-sm font-bold text-foreground">
                      {formatDateTimeVi(membership.expiresAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Confirmation Dialog for Canceling Pending Order */}
            {isTrustedPending && showCancelConfirm && (
              <div
                id="cancel-order-confirmation-dialog"
                role="alertdialog"
                aria-labelledby="cancel-order-confirm-title"
                aria-describedby="cancel-order-confirm-desc"
                data-testid="cancel-order-confirmation"
                className="rounded-2xl border border-amber-300 bg-amber-50/90 dark:border-amber-800/70 dark:bg-amber-950/40 p-4 sm:p-5 space-y-3.5 text-xs text-amber-950 dark:text-amber-200"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="space-y-1.5 leading-relaxed">
                    <h2
                      id="cancel-order-confirm-title"
                      className="text-sm font-extrabold text-amber-950 dark:text-amber-100"
                    >
                      Xác nhận hủy đơn hàng hội viên đang chờ?
                    </h2>
                    <div id="cancel-order-confirm-desc" className="space-y-1 text-amber-900/95 dark:text-amber-200/95">
                      <p>
                        Thao tác này chỉ <strong>hủy đơn hàng trên HomeSpace</strong> (chuyển sang trạng thái <code>CANCELLED</code>). {activeProvider === "ETH" ? "Nếu đã lấy báo giá ETH, hệ thống chỉ cho hủy khi báo giá hết hạn và blockchain xác nhận chưa thanh toán." : `Bạn có thể tạo giao dịch mới ngay khi gặp lỗi thanh toán qua ${providerLabel}.`}
                      </p>
                      <p>
                        Lưu ý quan trọng: Thao tác này <strong>không thể hủy hoặc hoàn trả giao dịch thu tiền phía {providerLabel}</strong> nếu bạn đã thanh toán. {activeProvider === "ETH" ? "Nếu đã gửi giao dịch qua MetaMask, hãy tiếp tục đối soát thay vì hủy đơn." : `Nếu ${providerLabel} xác nhận trừ tiền thành công muộn sau khi hủy, đơn hàng sẽ chuyển sang trạng thái REVIEW để đối soát thủ công.`}
                      </p>
                    </div>
                  </div>
                </div>

                {cancelError && (
                  <div
                    role="alert"
                    data-testid="cancel-order-error"
                    className="rounded-xl border border-rose-300 bg-rose-50 dark:border-rose-800/70 dark:bg-rose-950/50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 dark:text-rose-300"
                  >
                    {cancelError}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    data-testid="dismiss-cancel-order-button"
                    disabled={cancelling}
                    onClick={() => {
                      setShowCancelConfirm(false);
                      setCancelError(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-60 cursor-pointer"
                  >
                    <span>Giữ lại & Tiếp tục chờ</span>
                  </button>
                  <button
                    ref={confirmCancelButtonRef}
                    type="button"
                    data-testid="confirm-cancel-order-button"
                    disabled={cancelling}
                    onClick={handleConfirmCancelOrder}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Đang hủy đơn hàng...</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Xác nhận hủy đơn HomeSpace</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {isPending && (
                <button
                  type="button"
                  onClick={handleManualRecheck}
                  disabled={rechecking || cancelling}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${rechecking || polling ? "animate-spin" : ""}`} />
                  <span>Kiểm tra lại trạng thái</span>
                </button>
              )}
              {isPending && order?.provider === "ETH" && (
                <Link
                  href={`/dashboard/membership/eth?orderId=${encodeURIComponent(order.id)}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary px-5 py-2.5 text-xs font-bold text-primary hover:bg-primary/5"
                >
                  <span>Tiếp tục thanh toán / đối soát MetaMask</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              {isTrustedPending && (
                <button
                  type="button"
                  data-testid="cancel-pending-order-button"
                  onClick={() => {
                    setCancelError(null);
                    setShowCancelConfirm(true);
                  }}
                  disabled={cancelling || showCancelConfirm}
                  aria-expanded={showCancelConfirm}
                  aria-controls="cancel-order-confirmation-dialog"
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-5 py-2.5 text-xs font-bold text-rose-700 shadow-xs hover:bg-rose-100 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 transition-all disabled:opacity-60 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Hủy đơn hàng</span>
                </button>
              )}

              {isPaid && (
                <Link
                  href="/dashboard/properties/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Đăng tin mới ngay</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              {isFailed && (
                <Link
                  href="/dashboard/membership"
                  data-testid="new-membership-checkout-link"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 transition-all"
                >
                  <Crown className="h-4 w-4" />
                  <span>
                    {isCancelled ? "Chọn gói & Tạo đơn thanh toán mới" : "Chọn lại gói & Thanh toán lại"}
                  </span>
                </Link>
              )}

              <Link
                href="/dashboard/properties"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <Building2 className="h-4 w-4 text-primary" />
                <span>Quản lý tin đăng</span>
              </Link>

              <Link
                href="/dashboard/membership"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <span>Bảng gói hội viên</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MembershipReturnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-xs font-semibold">Đang tải kết quả giao dịch...</span>
        </div>
      }
    >
      <MembershipReturnContent />
    </Suspense>
  );
}
