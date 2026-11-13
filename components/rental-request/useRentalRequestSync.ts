"use client";

import { useEffect, useRef } from "react";
import notificationService from "@/services/notification.service";

const DEBOUNCE_MS = 250;

/**
 * Runs `refresh` when a rental-request notification arrives (or on an optional poll),
 * through one bounded pipe: 250ms debounce, one in-flight call, at most one follow-up.
 * `requestId` scopes the hook to one request (id-less recovery events always match);
 * omit it for lists. Visibility is checked at schedule time and again right before each
 * refresh (timer and queued follow-up); a hidden tab only marks dirty and refreshes on return.
 * `refresh` must be silent: no loading state and no resetting of unsaved form state.
 */
export function useRentalRequestSync(
  refresh: () => Promise<unknown> | void,
  options: { enabled?: boolean; requestId?: string | null; pollMs?: number } = {},
) {
  const { enabled = true, requestId = null, pollMs = 0 } = options;
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  useEffect(() => {
    if (!enabled) return;
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
          // Re-check right before the API call: the tab may have hidden since it was scheduled/queued.
          if (document.visibilityState !== "visible") {
            dirty = true;
            break;
          }
          try {
            await refreshRef.current();
          } catch {
            // The refresh owner surfaces its own errors; keep the pipe alive.
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
      }, DEBOUNCE_MS);
    };

    const unsubscribe = notificationService.subscribe((event) => {
      if (event.type !== "rental-request-changed") return;
      if (requestId && event.requestId && event.requestId !== requestId) return;
      schedule();
    });
    const onVisible = () => {
      if (document.visibilityState === "visible" && dirty) {
        dirty = false;
        schedule();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    const poll = pollMs > 0 ? setInterval(schedule, pollMs) : undefined;

    return () => {
      disposed = true;
      clearTimeout(timer);
      clearInterval(poll);
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, requestId, pollMs]);
}
