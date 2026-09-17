export type RentalRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED_BY_SYSTEM"
  | "CANCELLED_BY_RENTER"
  | "EXPIRED"
  | "COMPLETED";

export interface CreateRentalRequestPayload {
  listingId: string;
  moveInDate: string; // "YYYY-MM-DD"
  leaseMonths: number;
  occupantCount?: number;
  motorbikeCount?: number;
  carCount?: number;
  renterName: string;
  renterPhone: string;
  renterEmail?: string;
  depositAmount?: number | null;
  negotiatedDepositAmount?: number | null;
  renterNote?: string;
}

export interface RentalRequestResponse {
  id: string;
  listingId: string;
  listingTitle: string;
  listingAddress: string;
  listingThumbnail: string | null;
  listingPrice: number | null;
  ownerId: string;
  renterId: string;
  renterName: string;
  renterPhone: string;
  renterEmail: string | null;
  moveInDate: string;
  leaseMonths: number;
  occupantCount: number;
  motorbikeCount: number;
  carCount: number;
  monthlyRentPrice: number;
  effectiveMonthlyRent?: number | null;
  estimatedMonthlyCharges?: number | null;
  estimatedMonthlyTotal?: number | null;
  depositAmount: number | null;
  estimatedInitialTotal?: number | null;
  estimatedLeaseTotal?: number | null;
  costBreakdownSnapshot?: string | null;
  excludedChargesSnapshot?: string | null;
  renterNote: string | null;
  status: RentalRequestStatus;
  rejectReason: string | null;
  acceptedAt: string | null;
  holdExpiresAt: string | null;
  initialPayment?: import("./rental-payment.type").InitialPaymentSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface PredictableChargeItem {
  chargeType: string;
  displayName: string;
  billingMethod: string;
  unitAmount: number;
  quantity: number;
  amount: number;
  includedInRent: boolean;
  note: string;
}

export interface ExcludedChargeItem {
  chargeType: string;
  displayName: string;
  billingMethod: string;
  unitAmount?: number | null;
  reason: string;
}

export interface VehicleSlotEstimate {
  allowed: boolean;
  requested: number;
  capacity: number;
  reserved: number;
  available: number;
  monthlyAmount: number;
  note: string;
}

export interface RentalEstimatePayload {
  listingId: string;
  moveInDate: string;
  leaseMonths: number;
  occupantCount: number;
  motorbikeCount: number;
  carCount: number;
  negotiatedDepositAmount?: number | null;
}

export interface RentalEstimateResponse {
  listingId: string;
  occupantCount: number;
  occupantLimit: number | null;
  motorbike: VehicleSlotEstimate;
  car: VehicleSlotEstimate;
  effectiveMonthlyRent: number;
  predictableCharges: PredictableChargeItem[];
  predictableMonthlyChargesTotal: number;
  estimatedMonthlyTotal: number;
  depositAmount: number;
  estimatedInitialTotal: number;
  estimatedLeaseTotal: number;
  excludedCharges: ExcludedChargeItem[];
  disclaimer: string;
}
