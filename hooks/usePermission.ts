import { toast } from "sonner";
import { hasPermission, type PermissionCode } from "@/lib/permissions";
import { getGateLock } from "@/lib/profile-gate";
import { useProfileGate } from "@/hooks/useProfileGate";
import { useAppSelector } from "@/store/hooks";

export function usePermission(code: PermissionCode): boolean {
  return useAppSelector((state) => hasPermission(state.user.permissions, code));
}

/**
 * Locked when the permission is missing (that message wins) or the profile is incomplete
 * (except favorites and eKYC start). `title` is the tooltip when locked; `guard(e)` returns
 * false (and toasts) when locked.
 */
export function useFeatureGate(code: PermissionCode) {
  const permitted = usePermission(code);
  const lock = getGateLock(code, permitted, useProfileGate());
  return {
    allowed: !lock,
    title: lock,
    guard: (event?: { preventDefault(): void }) => {
      if (!lock) return true;
      event?.preventDefault();
      toast.error(lock);
      return false;
    },
  };
}
