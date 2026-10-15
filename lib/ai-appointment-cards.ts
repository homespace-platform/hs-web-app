import type { AiAppointmentCard } from "@/types/ai.type";

export const MAX_APPOINTMENT_CARDS = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES = new Set(["OWNER", "RENTER"]);
const STATUSES = new Set(["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED", "EXPIRED"]);
const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

/** Opening a card jumps straight to this appointment on the page for the caller's role. */
export const APPOINTMENT_OPEN_PARAM = "appointmentId";
export const APPOINTMENT_STATUS_PARAM = "status";

/**
 * Role-correct route built by the application from the verified id and role. The model and the API never
 * supply a URL. The owner manages visits at /dashboard/viewing-schedules; the renter at .../my-bookings.
 * `status` is only a hint for where to look (the page re-validates it and the API re-checks permission).
 */
export function appointmentHref(card: Pick<AiAppointmentCard, "appointmentId" | "requesterRole" | "status">): string | null {
  if (!UUID.test(card.appointmentId) || !ROLES.has(card.requesterRole)) return null;
  const base = card.requesterRole === "OWNER" ? "/dashboard/viewing-schedules" : "/dashboard/viewing-schedules/my-bookings";
  const params = new URLSearchParams({ [APPOINTMENT_OPEN_PARAM]: card.appointmentId.toLowerCase() });
  if (STATUSES.has(card.status)) params.set(APPOINTMENT_STATUS_PARAM, card.status);
  return `${base}?${params.toString()}`;
}

/** Keep only well-formed, de-duplicated cards. Anything else is dropped, never rendered. */
export function safeAppointmentCards(cards: unknown): AiAppointmentCard[] {
  if (!Array.isArray(cards)) return [];
  const seen = new Set<string>();
  const result: AiAppointmentCard[] = [];
  for (const raw of cards) {
    if (!raw || typeof raw !== "object") continue;
    const card = raw as AiAppointmentCard;
    if (typeof card.appointmentId !== "string" || !UUID.test(card.appointmentId) || seen.has(card.appointmentId.toLowerCase())) continue;
    if (!ROLES.has(card.requesterRole) || typeof card.listingTitle !== "string" || !card.listingTitle) continue;
    if (typeof card.status !== "string" || typeof card.statusLabel !== "string") continue;
    seen.add(card.appointmentId.toLowerCase());
    result.push(card);
    if (result.length === MAX_APPOINTMENT_CARDS) break;
  }
  return result;
}

export function formatCardDate(value?: string | null): string | null {
  const match = typeof value === "string" ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

/** "Thứ Tư, 14/10/2026". The weekday is computed from the calendar date itself (no timezone involved). */
export function formatCardDay(value?: string | null): string | null {
  const text = formatCardDate(value);
  if (!text || typeof value !== "string") return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday}, ${text}`;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d/;

export function formatTimeRange(start?: string | null, end?: string | null): string | null {
  const from = typeof start === "string" && TIME.test(start) ? start.slice(0, 5) : null;
  const to = typeof end === "string" && TIME.test(end) ? end.slice(0, 5) : null;
  if (!from) return null;
  return to ? `${from}–${to}` : from;
}

export function formatReadAt(value?: string | null): string | null {
  if (!value) return null;
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return null;
  return time.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
}

/** The current schedule line. A proposed time is a separate line and never replaces it. */
export function currentScheduleText(card: AiAppointmentCard): string | null {
  const day = formatCardDay(card.date);
  const time = formatTimeRange(card.startTime, card.endTime);
  if (!day && !time) return null;
  return [day, time].filter(Boolean).join(", ");
}

export function proposedScheduleText(card: AiAppointmentCard): string | null {
  const day = formatCardDay(card.proposedDate);
  if (!day) return null;
  const time = formatTimeRange(card.proposedStartTime, card.proposedEndTime);
  return [day, time].filter(Boolean).join(", ");
}

/** Stored status and time phase are shown together without inventing attendance or a new status. */
export function appointmentStateText(card: AiAppointmentCard): string {
  if (card.statusSyncPending) return `${card.statusLabel} · đã qua giờ hẹn, hệ thống chưa cập nhật trạng thái`;
  if (card.status === "PENDING" || card.status === "CONFIRMED") {
    if (card.temporalPhase === "IN_PROGRESS") return `${card.statusLabel} · đang trong giờ hẹn`;
    if (card.temporalPhase === "PAST") return `${card.statusLabel} · đã qua giờ hẹn`;
  }
  return card.statusLabel;
}
