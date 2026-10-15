"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { AppointmentResponse } from "@/types/appointment.type";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALL_STATUSES = ["CONFIRMED", "PENDING", "COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"];
const PAGE_SIZE = 50;
const MAX_PAGES = 20;

/** Tab that shows a status. EXPIRED has no tab, so the modal opens without switching. */
export function tabForStatus(status: string): string | null {
  if (status === "CONFIRMED") return "CALENDAR";
  if (["PENDING", "COMPLETED", "CANCELLED", "REJECTED"].includes(status)) return status;
  return null;
}

/** Read and validate `?appointmentId=&status=`. Anything malformed is ignored, never trusted. */
export function parseDeepLink(search: string): { id: string; hint: string | null } | null {
  const params = new URLSearchParams(search);
  const id = params.get("appointmentId");
  if (!id || !UUID.test(id)) return null;
  const status = params.get("status");
  return { id: id.toLowerCase(), hint: status && ALL_STATUSES.includes(status) ? status : null };
}

type Page = { result?: AppointmentResponse[]; totalPages?: number };

/** Search the caller's own appointments (the API enforces ownership) for the exact id, hinted status first. */
export async function findAppointment(
  id: string, hint: string | null, fetchPage: (status: string, page: number, size: number) => Promise<Page>,
): Promise<{ appointment: AppointmentResponse; status: string } | null> {
  const order = hint ? [hint, ...ALL_STATUSES.filter((s) => s !== hint)] : ALL_STATUSES;
  for (const status of order) {
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      const res = await fetchPage(status, page, PAGE_SIZE);
      const found = (res.result || []).find((a) => a.id.toLowerCase() === id);
      if (found) return { appointment: found, status };
      if (page >= (res.totalPages || 1)) break;
    }
  }
  return null;
}

/**
 * Opens the exact appointment named by the chat card. Runs once after login; the id is validated as a UUID and
 * the lookup goes through the normal role-scoped list API, so another user's id simply is not found.
 */
export function useAppointmentDeepLink(options: {
  authenticated: boolean;
  fetchPage: (status: string, page: number, size: number) => Promise<Page>;
  onOpen: (appointment: AppointmentResponse, tab: string | null) => void;
}) {
  const handled = useRef(false);
  const { authenticated, fetchPage, onOpen } = options;
  useEffect(() => {
    if (!authenticated || handled.current || typeof window === "undefined") return;
    const link = parseDeepLink(window.location.search);
    handled.current = true;
    if (!link) return;
    // No cancel flag: React strict mode re-runs this effect and `handled` already guards against a second lookup.
    findAppointment(link.id, link.hint, fetchPage).then((hit) => {
      if (!hit) { toast.info("Không tìm thấy lịch hẹn này trong tài khoản của bạn. Có thể lịch đã được xóa hoặc thuộc tài khoản khác."); return; }
      onOpen(hit.appointment, tabForStatus(hit.appointment.status || hit.status));
    }).catch(() => { toast.error("Không thể mở lịch hẹn lúc này. Vui lòng thử lại."); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);
}
