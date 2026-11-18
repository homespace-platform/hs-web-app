import { useAppSelector } from "@/store/hooks";
import type { ProfileRequirement } from "@/lib/profile-gate";

const NONE: ProfileRequirement[] = [];

/** `ready` stays true until the status is loaded: UX only, the backend still enforces (code 1010). */
export function useProfileGate(): { ready: boolean; missing: ProfileRequirement[] } {
  const onboarding = useAppSelector((state) => state.user.onboarding);
  return { ready: onboarding?.serviceReady ?? true, missing: onboarding?.missing ?? NONE };
}
