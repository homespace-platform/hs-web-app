import { FEATURE_LOCKED_MESSAGE, PERMISSIONS, type PermissionCode } from "@/lib/permissions";

export type ProfileRequirement = "PROFILE" | "ADDRESS" | "BANK_ACCOUNT" | "KYC";

/** Canonical display order; label and settings section for each missing item. */
export const PROFILE_REQUIREMENTS: ReadonlyArray<{ code: ProfileRequirement; label: string; href: string }> = [
  { code: "PROFILE", label: "Thông tin cá nhân", href: "/settings/profile" },
  { code: "ADDRESS", label: "Địa chỉ", href: "/settings/profile#address" },
  { code: "BANK_ACCOUNT", label: "Tài khoản ngân hàng", href: "/settings/bank-accounts" },
  { code: "KYC", label: "Xác minh danh tính (KYC)", href: "/settings/account-security" },
];

/** Stays usable while the profile is incomplete: favorites and starting eKYC. */
const PROFILE_GATE_EXEMPT: ReadonlySet<PermissionCode> = new Set([PERMISSIONS.FAVORITE_USE, PERMISSIONS.KYC_SUBMIT]);

/** Dispatched by the axios client on a 1010 denial; AuthInitializer refetches the status. */
export const PROFILE_GATE_STALE_EVENT = "hs:profile-gate-stale";

export type OnboardingStatusInput = {
  completedSteps?: string[];
  requiredSteps?: string[];
  passwordSet?: boolean;
  missingRequirements?: string[];
  serviceReady?: boolean;
};

export type ProfileGateState = {
  passwordSet: boolean;
  missing: ProfileRequirement[];
  serviceReady: boolean;
};

const isRequirement = (value: unknown): value is ProfileRequirement =>
  PROFILE_REQUIREMENTS.some((item) => item.code === value);

/** Uses the new backend fields; falls back to the legacy steps (no KYC info, so KYC never blocks). */
export function normalizeOnboardingStatus(raw: OnboardingStatusInput): ProfileGateState {
  const completed = raw.completedSteps ?? [];
  const missing = Array.isArray(raw.missingRequirements)
    ? raw.missingRequirements.filter(isRequirement)
    : (raw.requiredSteps ?? []).filter((step): step is ProfileRequirement =>
        isRequirement(step) && step !== "KYC" && !completed.includes(step));
  return {
    passwordSet: typeof raw.passwordSet === "boolean" ? raw.passwordSet : completed.includes("PASSWORD"),
    missing: PROFILE_REQUIREMENTS.map((item) => item.code).filter((code) => missing.includes(code)),
    serviceReady: typeof raw.serviceReady === "boolean" ? raw.serviceReady : missing.length === 0,
  };
}

export function missingItems(missing: readonly ProfileRequirement[]) {
  return PROFILE_REQUIREMENTS.filter((item) => missing.includes(item.code));
}

export function missingLabels(missing: readonly ProfileRequirement[]): string {
  return missingItems(missing).map((item) => item.label).join(", ") || "hồ sơ";
}

/** Tooltip/toast for a locked action, or undefined when allowed. The permission lock keeps priority. */
export function getGateLock(
  code: PermissionCode,
  permissionAllowed: boolean,
  profile: { ready: boolean; missing: readonly ProfileRequirement[] },
): string | undefined {
  if (!permissionAllowed) return FEATURE_LOCKED_MESSAGE;
  if (profile.ready || PROFILE_GATE_EXEMPT.has(code)) return undefined;
  return `Cần cập nhật: ${missingLabels(profile.missing)}`;
}

/** Backend 403 with ApiResponse code 1010 (profile incomplete); the server message is kept. */
export function isProfileIncomplete(response: { status?: number; data?: unknown } | null | undefined): boolean {
  const data = response?.data as { code?: unknown } | null | undefined;
  return response?.status === 403 && typeof data === "object" && data !== null && Number(data.code) === 1010;
}

/** Settings link for the first missing item in a 1010 response, defaulting to the profile section. */
export function profileGateHref(response: { data?: unknown } | null | undefined): string {
  const missing = (response?.data as { result?: { missing?: unknown } } | null | undefined)?.result?.missing;
  const list = Array.isArray(missing) ? missing.filter(isRequirement) : [];
  return missingItems(list)[0]?.href ?? PROFILE_REQUIREMENTS[0].href;
}

/** Notification types meaning KYC state changed (category ACCOUNT). */
export function isKycChangeType(type: unknown): boolean {
  return type === "KYC_VERIFIED" || type === "KYC_REJECTED" || type === "KYC_RETRY_REQUIRED";
}
