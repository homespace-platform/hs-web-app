import { toast } from "sonner";
import type { UserProfile } from "@/types/user.type";

const KYC_SETTINGS_PATH = "/settings/account-security";

type NavLike = { push: (href: string) => void };

/** True when profile may perform KYC-gated actions (Admin trusted or Didit verified). */
export function isKycSatisfied(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  if (profile.kycVerified === true) return true;
  if (profile.kycOptional === true) return true;
  if (String(profile.role ?? "").toUpperCase() === "ADMIN") return true;
  return false;
}

export function notifyKycRequired(router?: NavLike) {
  toast.error("Vui lòng xác minh danh tính (KYC) trước khi thực hiện thao tác này.", {
    action: {
      label: "Xác minh ngay",
      onClick: () => router?.push(KYC_SETTINGS_PATH),
    },
  });
}

/**
 * If KYC is satisfied, runs `onAllowed` (or returns true).
 * Otherwise shows toast, optionally navigates to KYC settings, returns false.
 */
export function requireKyc(
  profile: UserProfile | null | undefined,
  options?: {
    router?: NavLike;
    redirect?: boolean;
    onAllowed?: () => void;
  },
): boolean {
  if (!profile) {
    toast.info("Đang tải thông tin tài khoản. Vui lòng thử lại trong giây lát.");
    return false;
  }
  if (isKycSatisfied(profile)) {
    options?.onAllowed?.();
    return true;
  }
  notifyKycRequired(options?.router);
  if (options?.redirect !== false && options?.router) {
    options.router.push(KYC_SETTINGS_PATH);
  }
  return false;
}

export { KYC_SETTINGS_PATH };
