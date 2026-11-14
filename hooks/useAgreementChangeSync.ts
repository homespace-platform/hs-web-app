"use client";

import { useEffect, useRef } from "react";
import notificationService, { type NotificationSyncEvent } from "@/services/notification.service";

/**
 * Re-reads one mounted agreement view when a signing notice (or reconnect/focus/push recovery) says it may have changed.
 * `matches` receives the signal's agreement id (undefined = generic recovery); unknown ids are ignored, so a notice for
 * another document never triggers a request. Signals are coalesced (250 ms), a hidden tab only marks dirty and recovers
 * once on return. Callers own single-flight/ordering in `refresh`; failures are swallowed (the next signal retries).
 */
export function useAgreementChangeSync(matches: (agreementId?: string) => boolean, refresh: () => unknown, enabled = true): void {
  useNotificationChangeSync(event => event.type === "agreement-changed" && matches(event.agreementId), refresh, enabled);
}

// Share one debounce across root, payment and invoice signals that affect the same mounted view.
export function useNotificationChangeSync(matches: (event: NotificationSyncEvent) => boolean, refresh: () => unknown, enabled = true): void {
  const latest = useRef({ matches, refresh });
  useEffect(() => { latest.current = { matches, refresh }; });
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hiddenDirty = false;
    let disposed = false;
    const run = () => { void Promise.resolve().then(() => latest.current.refresh()).catch(() => {}); };
    const schedule = () => {
      if (document.visibilityState !== "visible") { hiddenDirty = true; return; }
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (disposed) return;
        if (document.visibilityState !== "visible") { hiddenDirty = true; return; }
        run();
      }, 250);
    };
    const unsubscribe = notificationService.subscribe((event) => {
      if (latest.current.matches(event)) schedule();
    });
    const onVisible = () => {
      if (document.visibilityState === "visible" && hiddenDirty) { hiddenDirty = false; schedule(); }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      clearTimeout(timer);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled]);
}
