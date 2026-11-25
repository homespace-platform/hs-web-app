"use client";

import { Loader2 } from "lucide-react";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import type { ContractResponse } from "@/types/contract.type";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";
import { canOfferContractFallback } from "@/lib/rental-contract-fallback";

/** Shows the automatic draft status while the contract is still missing. */
export default function RentalContractFallbackButton({ request, mode, contract, view, onCreate }: {
  request: RentalRequestResponse;
  mode: "RECEIVED" | "SENT";
  contract?: ContractResponse | null;
  view?: RentalOnboarding | null;
  busy: boolean;
  disabled: boolean;
  onCreate?: (request: RentalRequestResponse) => void;
}) {
  if (!onCreate || !canOfferContractFallback(request, mode, contract, view)) return null;
  return <button type="button" disabled aria-busy="true"
    className="inline-flex min-h-11 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground opacity-50 shadow-sm sm:flex-none">
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    Đang tạo hợp đồng tự động
  </button>;
}
