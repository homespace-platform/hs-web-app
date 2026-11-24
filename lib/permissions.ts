export const FEATURE_LOCKED_MESSAGE = "Tính năng này đang bị tạm khóa cho tài khoản của bạn";

export const PERMISSIONS = {
  LISTING_POST: "LISTING_POST",
  APPOINTMENT_BOOK: "APPOINTMENT_BOOK",
  APPOINTMENT_MANAGE: "APPOINTMENT_MANAGE",
  RENTAL_REQUEST_CREATE: "RENTAL_REQUEST_CREATE",
  RENTAL_REQUEST_MANAGE: "RENTAL_REQUEST_MANAGE",
  CONTRACT_MANAGE: "CONTRACT_MANAGE",
  CONTRACT_SIGN: "CONTRACT_SIGN",
  COMPLAINT_CREATE: "COMPLAINT_CREATE",
  MEMBERSHIP_PURCHASE: "MEMBERSHIP_PURCHASE",
  FAVORITE_USE: "FAVORITE_USE",
  KYC_SUBMIT: "KYC_SUBMIT",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** UX only: when permissions are not loaded (null) nothing is hidden; the backend still enforces. */
export function hasPermission(permissions: readonly string[] | null | undefined, code: PermissionCode): boolean {
  return !permissions || permissions.includes(code);
}

/** Dispatched by the axios client on a 1009 denial; AuthInitializer refetches permissions. */
export const PERMISSIONS_STALE_EVENT = "hs:permissions-stale";

/** Notification types meaning the user's effective permissions may have changed. */
export function isPermissionChangeType(type: unknown): boolean {
  return type === "ROLE_PERMISSIONS_CHANGED" || type === "ACCOUNT_ROLE_CHANGED";
}

/** Returns a gate that lets one call through per `ms` window (loop guard for refetch triggers). */
export function createThrottle(ms: number, now: () => number = Date.now): () => boolean {
  let last = -Infinity;
  return () => {
    const t = now();
    if (t - last < ms) return false;
    last = t;
    return true;
  };
}

/** Backend 403 with ApiResponse code 1009 PERMISSION_DENIED (method security); 1003 is an ownership/business denial and keeps its own message. */
export function isPermissionDenied(response: { status?: number; data?: unknown } | null | undefined): boolean {
  const data = response?.data as { code?: unknown } | null | undefined;
  return response?.status === 403 && typeof data === "object" && data !== null && Number(data.code) === 1009;
}
