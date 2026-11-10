export type MembershipTierCode = "FREE" | "STARTER" | "PRO" | "BUSINESS" | "ADMIN";

export type PaidMembershipTierCode = "STARTER" | "PRO" | "BUSINESS";

export type MembershipPaymentProvider = "SEPAY";

export interface MembershipPlanDto {
  code: MembershipTierCode;
  publicationUses: number;
  durationDays: number;
  priceVnd: number;
}

export interface MembershipPlan extends MembershipPlanDto {
  name: string;
  shortName: string;
  tagline: string;
  badge?: string;
  isPopular?: boolean;
  isOneTime?: boolean;
  features: string[];
}

export interface MembershipView {
  tier: MembershipTierCode;
  remainingUses: number;
  reservedUses: number;
  expiresAt: string | null;
  freeUsed: number;
  unlimited: boolean;
}

export type MembershipQuoteMode = "UPGRADE" | "NEW";

export interface MembershipQuote {
  tier: PaidMembershipTierCode;
  amountVnd: number;
  mode: MembershipQuoteMode;
  remainingUsesAfter: number;
  expiresAtAfter: string | null;
  upgradeDeadline: string | null;
  upgrade: boolean;
}

export interface MembershipCheckoutRequest {
  tier: PaidMembershipTierCode;
  provider: MembershipPaymentProvider;
}

export interface MembershipCheckoutResponse {
  orderId: string;
  paymentUrl: string;
  amountVnd: number;
  provider: MembershipPaymentProvider | null;
  formFields: Record<string, string>;
}

export type MembershipOrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "SUCCEEDED"
  | "COMPLETED"
  | "REVIEW"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | (string & {});

export interface MembershipOrderView {
  id: string;
  tier: PaidMembershipTierCode | MembershipTierCode;
  amountVnd: number;
  status: MembershipOrderStatus;
  provider: MembershipPaymentProvider | null;
  createdAt: string | null;
  paidAt: string | null;
}
