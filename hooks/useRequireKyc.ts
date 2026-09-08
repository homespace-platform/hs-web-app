"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/useAuth";
import { isKycSatisfied, requireKyc } from "@/lib/kyc-gate";

export function useRequireKyc() {
  const { profile } = useAuth();
  const router = useRouter();

  const kycOk = isKycSatisfied(profile);

  const gate = useCallback(
    (onAllowed?: () => void, opts?: { redirect?: boolean }) =>
      requireKyc(profile, {
        router,
        redirect: opts?.redirect ?? false,
        onAllowed,
      }),
    [profile, router],
  );

  return { kycOk, profile, gate };
}
