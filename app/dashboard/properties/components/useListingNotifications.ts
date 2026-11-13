"use client";

import { useEffect } from "react";
import notificationService from "@/services/notification.service";

/**
 * Coalesce listing-changed signals (socket, push and focus recovery) into one refresh.
 * An id-less signal means "something may have changed"; with `listingId` set, signals
 * for other listings are ignored.
 */
export function useListingNotifications({ enabled, refresh, listingId }: {
  enabled: boolean;
  refresh: () => Promise<void> | void;
  listingId?: string;
}) {
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let running = false;
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      pending = false;
      running = true;
      try {
        await refresh();
      } catch {
        // Callers own error state; a failed background refresh must not break the page.
      } finally {
        running = false;
        if (pending && !disposed) timer = setTimeout(() => void run(), 250);
      }
    };
    const unsubscribe = notificationService.subscribe((event) => {
      if (event.type !== "listing-changed") return;
      if (listingId && event.listingId && event.listingId !== listingId) return;
      pending = true;
      if (!running) {
        clearTimeout(timer);
        timer = setTimeout(() => void run(), 250);
      }
    });
    return () => {
      disposed = true;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [enabled, refresh, listingId]);
}
