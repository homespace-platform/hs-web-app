"use client";
import RentalOnboardingPanel from "@/components/rental-request/RentalOnboardingPanel";

/** Both obligations keep their individual receipts, including a deposit paid days earlier. */
export default function InitialPaymentHistory({ rentalRequestId, contractNumber, defaultOpen = false, compact = false }: {
  rentalRequestId: string; contractNumber?: string; defaultOpen?: boolean; compact?: boolean;
}) {
  return <details open={defaultOpen} className={compact ? "rounded-xl border p-3" : "rounded-xl border p-4"}>
    <summary className="cursor-pointer text-sm font-semibold">Cọc & tiền thuê tháng đầu {contractNumber && `· ${contractNumber}`}</summary>
    <div className="mt-3"><RentalOnboardingPanel rentalRequestId={rentalRequestId} /></div>
  </details>;
}
