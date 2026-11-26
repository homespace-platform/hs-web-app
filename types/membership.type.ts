export type MembershipTierCode = "FREE" | "STARTER" | "PRO" | "BUSINESS" | "ADMIN";

export type PaidMembershipTierCode = "STARTER" | "PRO" | "BUSINESS";

export type MembershipPaymentProvider = "SEPAY" | "ETH";

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
}

export interface MembershipView {
  tier: MembershipTierCode;
  remainingUses: number;
  reservedUses: number;
  expiresAt: string | null;
  freeUsed: number;
  unlimited: boolean;
  /** Next FREE refill (ISO instant); only set while tier is FREE. */
  quotaResetsAt: string | null;
  /** One-off extra uses, kept apart from the plan balance (remainingUses). */
  addonRemaining: number;
  addonReserved: number;
  /** Earliest expiry among extra uses still remaining. */
  addonExpiresAt: string | null;
}

export interface MembershipAddonOffer {
  unitPriceVnd: number;
  validDays: number;
  maxQuantity: number;
}

export type MembershipOrderKind = "PLAN" | "ADDON";

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
  /** null for ADDON orders. */
  tier: PaidMembershipTierCode | MembershipTierCode | null;
  kind: MembershipOrderKind;
  quantity: number | null;
  amountVnd: number;
  status: MembershipOrderStatus;
  provider: MembershipPaymentProvider | null;
  createdAt: string | null;
  paidAt: string | null;
}

export interface MembershipEthChallenge {
  challengeId: string;
  message: string;
  expiresAt: string;
}

export interface MembershipEthQuote {
  paymentId: string;
  payer: string;
  recipient: string;
  amountVnd: number;
  ethVnd: number;
  amountWei: string;
  priceUpdatedAt: string;
  expiresAt: string;
  chainId: number;
  contractAddress: string;
  signature: string;
}

export interface MembershipEthStatus {
  orderStatus: MembershipOrderStatus;
  paymentId: string | null;
  txHash: string | null;
  amountWei: string | null;
  expiresAt: string | null;
  confirmedAt: string | null;
}
