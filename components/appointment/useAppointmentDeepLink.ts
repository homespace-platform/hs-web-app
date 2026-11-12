"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import appointmentService from "@/services/appointment.service";
import type { AppointmentResponse } from "@/types/appointment.type";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALL_STATUSES = ["CONFIRMED", "PENDING", "COMPLETED", "CANCELLED", "REJECTED", "EXPIRED"];

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

/** Open the latest, authorized detail when a chat/notification link changes on this page. */
export function useAppointmentDeepLink(options: {
  authenticated: boolean;
  userId: string | null;
  side: "OWNER" | "RENTER";
  onOpen: (appointment: AppointmentResponse | null, tab: string | null) => void;
}) {
  const search = useSearchParams().toString();
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, userId, side, onOpen } = options;
  const clearDeepLink = useCallback(() => {
    const params = new URLSearchParams(search);
    if (!params.has("appointmentId")) return;
    params.delete("appointmentId");
    params.delete("status");
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
  }, [pathname, router, search]);
  useEffect(() => {
    if (!authenticated || !userId) return;
    onOpen(null, null);
    const link = parseDeepLink(search);
    if (!link) return;
    let disposed = false;
    void appointmentService.getAppointment(link.id).then((appointment) => {
      if (disposed) return;
      if ((side === "OWNER" ? appointment.ownerId : appointment.renterId) !== userId) {
        toast.info("Lịch hẹn không thuộc phía tài khoản bạn đang xem.");
        return;
      }
      onOpen(appointment, tabForStatus(appointment.status));
    }).catch((error: unknown) => {
      if (disposed) return;
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 404) {
        toast.info("Lịch hẹn không còn tồn tại hoặc bạn không có quyền xem.");
      } else {
        toast.error("Không thể mở lịch hẹn lúc này. Vui lòng thử lại.");
      }
    });
    return () => { disposed = true; };
  }, [authenticated, userId, side, search, onOpen]);
  return clearDeepLink;
}
