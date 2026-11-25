import { toast } from "sonner";
import type { UserProfile } from "@/types/user.type";

const KYC_PATH = "/kyc";

/** /kyc that returns to the current page; /kyc validates returnTo itself. */
export function kycHref(): string {
  if (typeof window === "undefined") return KYC_PATH;
  return `${KYC_PATH}?returnTo=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`;
}

type NavLike = { push: (href: string) => void };

/** Every role needs a verified identity for KYC-gated actions. */
export function isKycSatisfied(profile: UserProfile | null | undefined): boolean {
  return profile?.kycVerified === true;
}

export function notifyKycRequired(router?: NavLike) {
  toast.error("Vui lòng xác minh danh tính (KYC) trước khi thực hiện thao tác này.", {
    action: {
      label: "Xác minh ngay",
      onClick: () => router?.push(kycHref()),
    },
  });
}

/**
 * If KYC is satisfied, runs `onAllowed` (or returns true).
 * Otherwise shows toast, optionally navigates to /kyc, returns false.
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
    options.router.push(kycHref());
  }
  return false;
}
