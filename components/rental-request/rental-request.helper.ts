import type { RentalEstimateResponse } from "@/types/rental-request.type";

export const formatVND = (price: number): string =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price || 0);

export function clampValue(val: number, min: number, max: number): number {
  if (isNaN(val)) return min;
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

export function parseCurrency(text: string): number {
  const digits = (text || "").replace(/\D/g, "");
  const num = parseInt(digits, 10);
  return isNaN(num) ? 0 : num;
}

export function hasVehicleParkingAllowed(
  estimate?: RentalEstimateResponse | null
): boolean {
  if (!estimate) return false;
  return Boolean(estimate.motorbike?.allowed || estimate.car?.allowed);
}

export function hasPersonBasedCharges(
  estimate?: RentalEstimateResponse | null
): boolean {
  if (!estimate) return false;
  return estimate.predictableCharges?.some(
    (c) => c.billingMethod === "PER_PERSON_MONTH"
  ) ?? false;
}
