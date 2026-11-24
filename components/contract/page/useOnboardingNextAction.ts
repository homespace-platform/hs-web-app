"use client";

import { useCallback } from "react";
import { readOnboarding } from "@/lib/rental-onboarding-read";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";
import type { Role } from "@/lib/rental-labels";
import { usePolledRead } from "./usePolledRead";

/**
 * Pre-tenancy progress of a rental request: the server's single `nextAction` plus the whole onboarding view.
 * Reads with the side-effect free `get` (see readOnboarding). `accept` lets a mounted RentalOnboardingPanel hand over
 * its fresher snapshot.
 */
export function useOnboardingNextAction(rentalRequestId: string | undefined, role: Role, enabled = true) {
  const read = useCallback(() => readOnboarding(rentalRequestId as string), [rentalRequestId]);
  const { data, error, reload, accept } = usePolledRead<RentalOnboarding>(read, `${rentalRequestId}:${role}`, enabled && Boolean(rentalRequestId));
  return { view: data, nextAction: data?.nextAction ?? null, error, reload, accept };
}
