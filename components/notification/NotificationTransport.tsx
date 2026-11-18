"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { io } from "socket.io-client";
import { useAuth } from "@/features/auth/useAuth";
import keycloak from "@/lib/keycloak";
import { fetchMyPermissions, fetchOnboardingStatus } from "@/features/user/userSlice";
import { createThrottle, isPermissionChangeType } from "@/lib/permissions";
import { isKycChangeType } from "@/lib/profile-gate";
import { useAppDispatch } from "@/store/hooks";
import notificationService, { getSafeActionPath, isAgreementNotificationType, isAmendmentNotificationType, isInvoiceNotificationType, isRenewalNotificationType, isTerminationNotificationType, isReturnSettlementNotificationType, isRoutedPaymentType } from "@/services/notification.service";
import { startPush } from "@/services/notification-push.service";
import type { NotificationItem } from "@/types/notification.type";
import { useChatDemo } from "@/components/chat/ChatDemoProvider";
import NotificationPopup from "@/components/notification/NotificationPopup";

type Popup = Pick<NotificationItem, "id" | "category" | "type" | "metadata" | "title" | "body" | "priority" | "actionPath"> & { recipientId: string; chatAlert?: boolean; conversationId?: string };

export default function NotificationTransport() {
  const { authenticated, initialized, userId } = useAuth();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { conversations } = useChatDemo();
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
      } else if (event.type !== "appointment-changed" && event.type !== "listing-changed" && event.type !== "rental-request-changed" && event.type !== "membership-changed" && event.type !== "payment-changed" && event.type !== "invoice-changed" && event.type !== "agreement-changed") {
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
    const seenChatAlerts = new Set<string>();
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
      let connectedOnce = false;
      const allowRefetch = createThrottle(5_000);
      socket.on("connect", () => {
        recoverChanges();
        // AuthInitializer loads permissions on start; later connects may follow a missed change.
        if (connectedOnce && allowRefetch()) void dispatch(fetchMyPermissions());
        connectedOnce = true;
      });
      for (const event of [
        "notification:read",
        "notification:deleted",
        "notification:unread-count",
      ]) socket.on(event, scheduleRefresh);
      socket.on("notification:new", (value: unknown) => {
        if (disposed || !value || typeof value !== "object") return;
        const item = value as Partial<NotificationItem> & { popupAllowed?: boolean };
        if (item.category !== "CHAT") scheduleRefresh();
        // Invalidate listing data even in hidden tabs; only the popup is visibility-gated.
        if (isPermissionChangeType(item.type)) void dispatch(fetchMyPermissions());
        if (item.category === "ACCOUNT" && isKycChangeType(item.type)) void dispatch(fetchOnboardingStatus());
        if (item.category === "LISTING") {
          const listingId = item.metadata?.listingId;
          notificationService.notifyListingChanged(typeof listingId === "string" ? listingId : undefined);
        }
        if (item.category === "RENTAL_REQUEST") {
          const requestId = item.metadata?.requestId ?? item.metadata?.rentalRequestId;
          notificationService.notifyRentalRequestChanged(typeof requestId === "string" ? requestId : undefined);
          if(item.type?.startsWith("COMPLAINT_"))window.dispatchEvent(new CustomEvent("homespace:complaint-changed",{detail:requestId}));
        }
        if (item.category === "PAYMENT" && (item.type === "MEMBERSHIP_ACTIVATED" || item.type === "MEMBERSHIP_PAYMENT_REVIEW" || item.type === "MEMBERSHIP_EXPIRING_SOON" || item.type === "MEMBERSHIP_EXPIRED")) {
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
        if (item.popupAllowed === false) return;
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
      socket.on("chat:alert", (value: unknown) => {
        if (disposed || !value || typeof value !== "object") return;
        const { eventId, conversationId, messageId } = value as Record<string, unknown>;
        if (typeof eventId !== "string" || !eventId || typeof conversationId !== "string" || !conversationId
          || typeof messageId !== "string" || !messageId || seenChatAlerts.has(eventId)) return;
        if (document.visibilityState !== "visible") return;
        const actionPath = `/chat?channel=direct&conversationId=${encodeURIComponent(conversationId)}`;
        if (!getSafeActionPath(actionPath)) return;
        seenChatAlerts.add(eventId);
        // shortcut: retain 500 alert IDs; use server cursors if reconnect starts replaying older alerts.
        if (seenChatAlerts.size > 500) seenChatAlerts.delete(seenChatAlerts.values().next().value!);
        const popup: Popup = {
          id: `chat:${eventId}`, recipientId: userId, chatAlert: true, conversationId,
          category: "CHAT", type: "CHAT_ALERT", metadata: null, priority: "NORMAL",
          title: "Bạn có tin nhắn mới", body: "Mở trò chuyện để xem tin nhắn.",
          actionPath,
        };
        setPopups((current) => [...current, popup].slice(-3));
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
      // REST feed and Socket.IO remain usable if browser push setup fails.
    });

    return () => {
      disposed = true;
      clearTimeout(refreshTimer);
      clearTimeout(reconnectTimer);
      for (const timer of popupTimers) clearTimeout(timer);
      setPopups([]);
      clearInterval(tokenTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", recoverChanges);
      navigator.serviceWorker?.removeEventListener("message", onWorkerMessage);
      socket?.disconnect();
      stopPush?.();
    };
  }, [initialized, authenticated, userId, dispatch]);

  const visiblePopups = popups.filter((item) => item.recipientId === userId);
  if (!authenticated || visiblePopups.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3" aria-live="polite" aria-atomic="false">
      {visiblePopups.map((item) => {
        const conversationId = item.conversationId ?? item.metadata?.conversationId;
        const sender = item.category === "CHAT" ? conversations.find(({ id }) => id === conversationId) : undefined;
        return <NotificationPopup key={item.id} item={item}
          sender={item.category === "CHAT" ? { name: sender?.userName || "Người dùng HomeSpace", avatar: sender?.userAvatar } : undefined}
          onDismiss={() => setPopups((current) => current.filter(({ id }) => id !== item.id))} />;
      })}
    </div>
  );
}
