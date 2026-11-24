"use client";

import { FileText, Loader2 } from "lucide-react";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import type { ContractResponse } from "@/types/contract.type";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";
import { canOfferContractFallback } from "@/lib/rental-contract-fallback";

/** Landlord's explicit retry that creates the lease draft; renders nothing unless the server state allows it. */
export default function RentalContractFallbackButton({ request, mode, contract, view, busy, disabled, onCreate }: {
  request: RentalRequestResponse;
  mode: "RECEIVED" | "SENT";
  contract?: ContractResponse | null;
  view?: RentalOnboarding | null;
  busy: boolean;
  disabled: boolean;
  onCreate?: (request: RentalRequestResponse) => void;
}) {
  if (!onCreate || !canOfferContractFallback(request, mode, contract, view)) return null;
  return <button type="button" disabled={disabled || busy} aria-busy={busy}
    title="Thử tạo bản nháp theo luồng hiện tại. Nếu chưa có mẫu đã phát hành, cần quản trị viên bổ sung mẫu."
    onClick={() => onCreate(request)}
    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none">
    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
    {busy ? "Đang tạo hợp đồng…" : "Tạo hợp đồng"}
  </button>;
}
