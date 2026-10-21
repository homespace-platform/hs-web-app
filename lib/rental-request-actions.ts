import type { RentalRequestResponse } from "@/types/rental-request.type";
import type { ContractResponse } from "@/types/contract.type";

/** Display hint only. The server locks and rechecks both payments before cancelling. */
export function canCancelRentalRequest(request: Pick<RentalRequestResponse,"status"|"initialPayment">,
  contract?: Pick<ContractResponse,"status"> | null, livePaymentStatus?: string) {
  if(contract && contract.status !== "DRAFT")return false;
  if(request.status === "PENDING")return true;
  if(request.status !== "ACCEPTED" || request.initialPayment?.canCancelImmediately !== true)return false;
  const status=livePaymentStatus || request.initialPayment.status;
  return ["AWAITING_TRANSFER","EXPIRED","CANCELLED","OVERDUE"].includes(status)
    || status === "CONFIRMED" && request.initialPayment.totalAmount === 0;
}
