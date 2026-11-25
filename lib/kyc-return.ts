import type { KycStatus } from "@/types/kyc.type";

/** Shared /kyc contract with the mobile app and admin portal. Do not change values here alone. */
export type KycClient = "web" | "app";
export type AppKycStatus = KycStatus | "CANCELLED" | "ERROR";
export type KycParams =
  | { client: "web"; returnTo: string }
  /** `state === null` means the link is invalid (missing/malformed state). */
  | { client: "app"; state: string | null };

export const DEFAULT_RETURN_TO = "/settings/account-security";
export const APP_RETURN_BASE = "homespace://kyc/result";
const APP_STATUSES: ReadonlySet<string> = new Set([
  "VERIFIED", "REJECTED", "REVIEW_REQUIRED", "EXPIRED", "PENDING", "CANCELLED", "ERROR",
]);
const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_RETURN_TO = 300;
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

export function isValidState(value: unknown): value is string {
  return typeof value === "string" && STATE_PATTERN.test(value);
}

/** Same-origin relative path only: one leading "/", no "//", no "\", no control chars, never /kyc itself (loop). */
function isSafePath(value: string): boolean {
  if (value.length === 0 || value.length > MAX_RETURN_TO) return false;
  if (value[0] !== "/" || value[1] === "/" || value.includes("\\") || CONTROL_CHARS.test(value)) return false;
  if (/^\/kyc(?:[/?#]|$)/i.test(value)) return false;
  try {
    return new URL(value, "http://kyc.invalid").origin === "http://kyc.invalid";
  } catch {
    return false;
  }
}

/** Validates, decodes once and validates again, so %2f%2f / %5c cannot smuggle a redirect. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !isSafePath(value)) return DEFAULT_RETURN_TO;
  try {
    return isSafePath(decodeURIComponent(value)) ? value : DEFAULT_RETURN_TO;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

/** Unknown params are ignored; an unknown `client` is treated as web. */
export function parseKycParams(search: string | URLSearchParams | null | undefined): KycParams {
  const params = new URLSearchParams(search ?? "");
  if (params.get("client") === "app") {
    const state = params.get("state");
    return { client: "app", state: isValidState(state) ? state : null };
  }
  return { client: "web", returnTo: safeReturnTo(params.get("returnTo")) };
}

/**
 * Backend status -> value sent to the app. NOT_VERIFIED/unknown is PENDING only while a session exists,
 * otherwise null (the flow keeps the user on the start screen instead of redirecting).
 */
export function toAppStatus(status: unknown, hasSession = false): AppKycStatus | null {
  if (typeof status === "string" && APP_STATUSES.has(status)) return status as AppKycStatus;
  return hasSession ? "PENDING" : null;
}

/** Only for a validated state and a known status; anything else yields null (never redirect). */
export function buildAppReturnUrl(state: unknown, status: unknown): string | null {
  if (!isValidState(state) || typeof status !== "string" || !APP_STATUSES.has(status)) return null;
  return `${APP_RETURN_BASE}?state=${encodeURIComponent(state)}&status=${status}`;
}

/** Statuses after which the flow is over and the user is sent back. */
export function isKycTerminal(status: unknown): boolean {
  return status === "VERIFIED" || status === "REJECTED" || status === "REVIEW_REQUIRED"
    || status === "EXPIRED" || status === "CANCELLED" || status === "ERROR";
}
