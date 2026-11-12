"use client";

import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import notificationService from "@/services/notification.service";
import appointmentService from "@/services/appointment.service";
import type { AppointmentResponse } from "@/types/appointment.type";

/** Coalesce socket/push recovery and refresh the open detail from its authorized API. */
export function useAppointmentNotifications({ authenticated, refresh, detailId, setDetail }: {
  authenticated: boolean;
  refresh: () => Promise<void>;
  detailId?: string;
  setDetail: Dispatch<SetStateAction<AppointmentResponse | null>>;
}) {
  useEffect(() => {
    if (!authenticated) return;
    let disposed = false;
    let running = false;
    let pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      pending = false;
      running = true;
      try {
        await refresh();
        if (detailId && !disposed) {
          try {
            const updated = await appointmentService.getAppointment(detailId);
            if (!disposed) setDetail((current) => current?.id === detailId ? updated : current);
          } catch {
            // Close stale actions if the detail can no longer be verified.
            if (!disposed) setDetail((current) => current?.id === detailId ? null : current);
          }
        }
      } finally {
        running = false;
        if (pending && !disposed) timer = setTimeout(() => void run(), 250);
      }
    };
    const unsubscribe = notificationService.subscribe((event) => {
      if (event.type !== "appointment-changed") return;
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
  }, [authenticated, refresh, detailId, setDetail]);
}
