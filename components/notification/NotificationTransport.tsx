"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import { io } from "socket.io-client";
import { useAuth } from "@/features/auth/useAuth";
import keycloak from "@/lib/keycloak";
import notificationService, { getCategoryMeta, getNotificationTag, getSafeActionPath, isAgreementNotificationType, isAmendmentNotificationType, isInvoiceNotificationType, isMoveInHandoverNotificationType, isRenewalNotificationType, isTerminationNotificationType, isReturnSettlementNotificationType, isRoutedPaymentType } from "@/services/notification.service";
import { startPush } from "@/services/notification-push.service";
import type { NotificationItem } from "@/types/notification.type";

type Popup = Pick<NotificationItem, "id" | "category" | "type" | "metadata" | "title" | "body" | "priority" | "actionPath"> & { recipientId: string };

export default function NotificationTransport() {
  const { authenticated, initialized, userId } = useAuth();
  const pathname = usePathname();
  const [popups, setPopups] = useState<Popup[]>([]);

  useEffect(() => {
    if (!initialized || !authenticated || !userId) return;
    let count = 0;
    const updateTitle = () => {
      const base = document.title.replace(/^\(\d+\)\s*/, "");
      const next = count > 0 ? `(${count}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    const unsubscribe = notificationService.subscribe((event) => {
      if (event.type === "unread-count") {
        count = event.count;
        updateTitle();
      } else if (event.type !== "appointment-changed" && event.type !== "listing-changed" && event.type !== "rental-request-changed" && event.type !== "membership-changed" && event.type !== "payment-changed" && event.type !== "invoice-changed" && event.type !== "handover-changed" && event.type !== "agreement-changed") {
        void notificationService.getUnreadCount().catch(() => {});
      }
    });
    void notificationService.getUnreadCount().catch(() => {});
    return () => {
      unsubscribe();
      count = 0;
      updateTitle();
    };
  }, [initialized, authenticated, userId, pathname]);

  useEffect(() => {
    if (!initialized || !authenticated || !userId) return;
    let disposed = false;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let stopPush: (() => void) | undefined;
    const popupTimers = new Set<ReturnType<typeof setTimeout>>();
    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => notificationService.notifyRemoteChanged(), 150);
    };
    // Push carries no resource data; reconnect/focus also recover changes missed offline.
    const recoverChanges = () => {
      scheduleRefresh();
      notificationService.notifyAppointmentChanged();
      notificationService.notifyListingChanged();
      notificationService.notifyRentalRequestChanged();
      notificationService.notifyMembershipChanged();
      notificationService.notifyPaymentChanged();
      notificationService.notifyInvoiceChanged();
      notificationService.notifyHandoverChanged();
      notificationService.notifyAgreementChanged();
    };

    const baseUrl = process.env.NEXT_PUBLIC_NOTIFICATION_SOCKET_URL;
    const socket = baseUrl
      ? io(`${baseUrl.replace(/\/$/, "")}/notifications`, {
          path: "/socket.io",
          transports: ["websocket"],
          autoConnect: false,
          auth: async (callback) => {
            try {
              await keycloak.updateToken(30);
              callback({ token: keycloak.token });
            } catch {
              callback({ token: "" });
            }
          },
        })
      : null;

    if (socket) {
      socket.on("connect", recoverChanges);
      for (const event of [
        "notification:read",
        "notification:deleted",
        "notification:unread-count",
      ]) socket.on(event, scheduleRefresh);
      socket.on("notification:new", (value: unknown) => {
        scheduleRefresh();
        if (!value || typeof value !== "object") return;
        const item = value as Partial<NotificationItem>;
        // Invalidate listing data even in hidden tabs; only the popup is visibility-gated.
        if (item.category === "LISTING") {
          const listingId = item.metadata?.listingId;
          notificationService.notifyListingChanged(typeof listingId === "string" ? listingId : undefined);
        }
        if (item.category === "RENTAL_REQUEST") {
          const requestId = item.metadata?.requestId;
          notificationService.notifyRentalRequestChanged(typeof requestId === "string" ? requestId : undefined);
        }
        if (item.category === "PAYMENT" && (item.type === "MEMBERSHIP_ACTIVATED" || item.type === "MEMBERSHIP_PAYMENT_REVIEW")) {
          const orderId = item.metadata?.orderId;
          notificationService.notifyMembershipChanged(typeof orderId === "string" ? orderId : undefined);
        }
        if (item.category === "PAYMENT" && isRoutedPaymentType(item.type)) {
          const paymentId = item.metadata?.paymentId;
          notificationService.notifyPaymentChanged(typeof paymentId === "string" ? paymentId : undefined);
        }
        if (item.category === "PAYMENT" && isInvoiceNotificationType(item.type)) {
          const { contractId, invoiceId } = item.metadata ?? {};
          notificationService.notifyInvoiceChanged(typeof contractId === "string" ? contractId : undefined, typeof invoiceId === "string" ? invoiceId : undefined);
        }
        if (item.category === "CONTRACT" && isMoveInHandoverNotificationType(item.type)) {
          const { contractId } = item.metadata ?? {};
          notificationService.notifyHandoverChanged(typeof contractId === "string" ? contractId : undefined);
          // Lease activation (READY goes to the landlord instead of FULLY_SIGNED): the root lease page they may have open changed too.
          if (item.type === "MOVE_IN_HANDOVER_READY") notificationService.notifyAgreementChanged(typeof contractId === "string" ? contractId : undefined);
        }
        if (item.category === "CONTRACT" && isAgreementNotificationType(item.type)) {
          const { agreementId } = item.metadata ?? {};
          notificationService.notifyAgreementChanged(typeof agreementId === "string" ? agreementId : undefined);
        }
        if (item.category === "CONTRACT" && (isAmendmentNotificationType(item.type) || isRenewalNotificationType(item.type) || isTerminationNotificationType(item.type) || isReturnSettlementNotificationType(item.type))) {
          const { contractId } = item.metadata ?? {};
          notificationService.notifyAgreementChanged(typeof contractId === "string" ? contractId : undefined);
        }
        if (document.visibilityState !== "visible") return;
        if (item.category === "APPOINTMENT") {
          const bookingId = item.metadata?.bookingId;
          notificationService.notifyAppointmentChanged(typeof bookingId === "string" ? bookingId : undefined);
        }
        if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.body !== "string") return;
        const popup = { ...item, recipientId: userId } as Popup;
        setPopups((current) => current.some(({ id }) => id === popup.id)
          ? current
          : [...current, popup].slice(-3));
        const timer = setTimeout(() => {
          setPopups((current) => current.filter(({ id }) => id !== popup.id));
          popupTimers.delete(timer);
        }, 8_000);
        popupTimers.add(timer);
      });
      socket.on("disconnect", (reason) => {
        if (reason === "io server disconnect" && !disposed) {
          reconnectTimer = setTimeout(() => socket.connect(), 1000);
        }
      });
      socket.connect();
    }

    const refreshSocketToken = () => {
      if (!socket) return;
      const previous = keycloak.token;
      void keycloak.updateToken(60).then(() => {
        if (disposed) return;
        if (keycloak.token !== previous || !socket.connected) {
          socket.disconnect().connect();
        }
      }).catch(() => socket.disconnect());
    };
    const tokenTimer = setInterval(refreshSocketToken, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") recoverChanges();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", recoverChanges);
    const onWorkerMessage = (event: MessageEvent) => {
      if (event.data?.event === "notifications.changed") recoverChanges();
    };
    navigator.serviceWorker?.addEventListener("message", onWorkerMessage);

    void startPush(recoverChanges).then((stop) => {
      if (disposed) stop();
      else stopPush = stop;
    }).catch(() => {
      window.dispatchEvent(new CustomEvent("hs:notification-push-status", { detail: "error" }));
      // REST feed and Socket.IO remain usable if browser push setup fails.
    });

    return () => {
      disposed = true;
      clearTimeout(refreshTimer);
      clearTimeout(reconnectTimer);
      for (const timer of popupTimers) clearTimeout(timer);
      clearInterval(tokenTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", recoverChanges);
      navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
      socket?.disconnect();
      stopPush?.();
    };
  }, [initialized, authenticated, userId]);

  const visiblePopups = popups.filter((item) => item.recipientId === userId);
  if (!authenticated || visiblePopups.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3" aria-live="polite" aria-atomic="false">
      {visiblePopups.map((item) => (
        <div key={item.id} className="pointer-events-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-900">
          <div className={`h-1 ${item.priority === "URGENT" ? "bg-rose-500" : "bg-blue-600"}`} />
          <div className="flex gap-3 p-4">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${item.priority === "URGENT" ? "bg-rose-50 text-rose-600 dark:bg-rose-950" : "bg-blue-50 text-blue-600 dark:bg-blue-950"}`}>
              <Bell className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>HomeSpace</span><span aria-hidden="true">·</span><span>{getCategoryMeta(item.category).label}</span>
                {(item.category === "LISTING" || item.category === "RENTAL_REQUEST" || item.category === "ACCOUNT" || item.category === "PAYMENT" || item.category === "CONTRACT") && getNotificationTag(item) !== getCategoryMeta(item.category).tag && (<><span aria-hidden="true">·</span><span>{getNotificationTag(item)}</span></>)}
              </div>
              <p className="line-clamp-2 font-semibold text-slate-900 dark:text-white">{item.title}</p>
              <p className="mt-1 line-clamp-3 text-sm leading-5 text-slate-600 dark:text-slate-300">{item.body}</p>
              <Link href={getSafeActionPath(item.actionPath) ?? "/notifications"} onClick={() => setPopups((current) => current.filter(({ id }) => id !== item.id))} className="mt-3 inline-block text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
                Xem thông báo →
              </Link>
            </div>
            <button type="button" onClick={() => setPopups((current) => current.filter(({ id }) => id !== item.id))} aria-label="Đóng thông báo" className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
