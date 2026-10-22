"use client";

import { FileText, Loader2 } from "lucide-react";
import type { RentalRequestResponse } from "@/types/rental-request.type";
import type { ContractResponse } from "@/types/contract.type";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";
import { canOfferContractFallback } from "@/lib/rental-contract-fallback";

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
    className="px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
    {busy ? "Đang tạo hợp đồng…" : "Tạo hợp đồng"}
  </button>;
}
