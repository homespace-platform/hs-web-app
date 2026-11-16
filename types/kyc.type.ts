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

export type KycVerifiedDetails = {
  cccd: string | null;
  fullName: string | null;
  birthDate: string | null;
  permanentAddress: string | null;
  gender: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  issuePlace: string | null;
  faceMatchPercent: number | null;
  documentValid: boolean | null;
  frontBackIdentical: boolean | null;
  clearCorners: boolean | null;
  idQualityGood: boolean | null;
  issueDateQualityGood: boolean | null;
  unexpired: boolean | null;
  liveDocument: boolean | null;
  noWarnings: boolean | null;
  noOverlayImage: boolean | null;
  eyesOpen: boolean | null;
  faceNotBlurred: boolean | null;
  faceValid: boolean | null;
  faceNotCovered: boolean | null;
};

export type VnptKycSession = { sessionId: string; expiresAt: string; maxImageMb: number };
export const VNPT_KYC_STEPS = ["upload", "card", "ocr", "ocr-front", "face", "compare", "mask"] as const;
export type VnptKycStep = (typeof VNPT_KYC_STEPS)[number];
