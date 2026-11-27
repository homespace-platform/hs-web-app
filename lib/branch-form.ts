import type { BranchCharge } from "@/services/branch.service";
import type { PropertyCategoryKey } from "@/app/dashboard/properties/new/types";

// The API returns the category upper-case ("ROOM"); form options and checks use lower-case.
export const toFormCategory = (category?: string | null) =>
  String(category || "house").toLowerCase() as PropertyCategoryKey;

// An owner's "not applicable" is still a decision: the server only treats the branch as complete when a row exists.
export function buildOptionalCharge(
  chargeType: string,
  billingMethod: string,
  amount: number | string,
  unit: string,
  sortOrder: number
): BranchCharge {
  const na = billingMethod === "NOT_APPLICABLE";
  return {
    chargeType,
    billingMethod,
    amount: na || billingMethod === "INCLUDED" ? undefined : Number(amount) || 0,
    currency: "VND",
    unit: na ? "" : unit,
    includedInRent: billingMethod === "INCLUDED",
    sortOrder,
  };
}
