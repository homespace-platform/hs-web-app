import { toast } from "sonner";
import { FEATURE_LOCKED_MESSAGE, hasPermission, type PermissionCode } from "@/lib/permissions";
import { useAppSelector } from "@/store/hooks";

export function usePermission(code: PermissionCode): boolean {
  return useAppSelector((state) => hasPermission(state.user.permissions, code));
}

/** `title` is the tooltip when locked; `guard(e)` returns false (and toasts) when locked. */
export function useFeatureGate(code: PermissionCode) {
  const allowed = usePermission(code);
  return {
    allowed,
    title: allowed ? undefined : FEATURE_LOCKED_MESSAGE,
    guard: (event?: { preventDefault(): void }) => {
      if (allowed) return true;
      event?.preventDefault();
      toast.error(FEATURE_LOCKED_MESSAGE);
      return false;
    },
  };
}
