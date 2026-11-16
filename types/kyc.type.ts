export type KycStatus =
  | "NOT_VERIFIED"
  | "PENDING"
  | "REVIEW_REQUIRED"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";

/** DIDIT is retained only for historical verification records returned by Core. */
export type KycProvider = "VNPT" | "DIDIT" | "ADMIN";

export type KycStatusResponse = {
  status: KycStatus;
  verifiedAt: string | null;
  provider: KycProvider;
  sessionId: string | null;
  sessionUrl: string | null;
  rejectionReason?: string | null;
};

export type VnptKycSession = { sessionId: string; expiresAt: string; maxImageMb: number };
export const VNPT_KYC_STEPS = ["upload", "card", "ocr", "ocr-front", "face", "compare", "mask"] as const;
export type VnptKycStep = (typeof VNPT_KYC_STEPS)[number];
