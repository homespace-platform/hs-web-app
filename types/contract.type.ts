import type { ListingCategory } from "@/types/listing.type";

export type ContractTemplateStatus = "ACTIVE" | "ARCHIVED";
export type TemplateVersionStatus = "DRAFT" | "PUBLISHED" | "DEPRECATED";
export type ContractTemplateSource = "SYSTEM" | "LANDLORD";

export interface TemplateFieldDefinition {
  key: string;
  label: string;
  group: string;
  dataType: string;
  description: string;
  example: string;
  required: boolean;
  requiredForCategories: ListingCategory[];
}

export interface TemplateFieldIssue {
  key: string;
  label: string;
}

export interface ContractTemplateResponse {
  id: string;
  name: string;
  description?: string | null;
  category?: ListingCategory | null;
  source?: ContractTemplateSource | null;
  ownerUserId?: string | null;
  status: ContractTemplateStatus;
  latestPublishedVersionId?: string | null;
  versionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContractTemplateVersionResponse {
  id: string;
  templateId: string;
  versionNumber: number;
  storageObjectId: string;
  originalFileName?: string | null;
  status: TemplateVersionStatus;
  placeholders: string[];
  validationWarnings: string[];
  invalidPlaceholders: string[];
  missingRequiredFields: TemplateFieldIssue[];
  publishedAt?: string | null;
  publishedBy?: string | null;
  createdAt: string;
}

export interface CreateContractTemplateRequest {
  name: string;
  description?: string;
  category: ListingCategory;
  storageObjectId: string;
  originalFileName?: string;
}

export interface CreateTemplateVersionRequest {
  storageObjectId: string;
  originalFileName?: string;
}

export type ContractStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "LANDLORD_SIGNATURE_PENDING"
  | "TENANT_SIGNATURE_PENDING"
  | "ACTIVE"
  | "TERMINATED"
  | "CANCELLED";

export type ContractPaymentStatus =
  | "UNPAID"
  | "PAID_MOCK"
  | "PAID"
  | "REFUNDED"
  | "FAILED";

export type ContractDocumentType = "DOCX" | "PDF";
export type DocumentPurpose = "PREVIEW" | "OFFICIAL" | "SIGNED_LANDLORD" | "SIGNED_FINAL";

export type SignatureRequestStatus =
  | "CREATED" | "PENDING_USER_CONFIRMATION" | "PROVIDER_SIGNED" | "EMBEDDING"
  | "SIGNED" | "REJECTED" | "EXPIRED" | "FAILED" | "CANCELLED";

export interface SignatureRequestResponse {
  id: string;
  contractId: string;
  revisionId: string;
  signerRole: "LANDLORD" | "TENANT";
  status: SignatureRequestStatus;
  docId?: string | null;
  signedDocumentId?: string | null;
  certificateSerial?: string | null;
  certificateSubject?: string | null;
  initiatedAt?: string | null;
  confirmedAt?: string | null;
  expiresAt?: string | null;
  failureReason?: string | null;
}

export interface SignatureStateResponse {
  signatureMode: "INTERNAL" | "SMARTCA";
  smartCaEnabled: boolean;
  activeRequest?: SignatureRequestResponse | null;
  allRequests: SignatureRequestResponse[];
}

export interface CertificateOptionResponse {
  serialNumber: string;
  subject: string;
  issuer?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
}
export type DocumentGenerationStatus = "GENERATING" | "READY" | "FAILED" | "STALE";

export interface CreateContractDraftRequest {
  rentalRequestId: string;
  templateVersionId: string;
}

export interface InitialPaymentSnapshot {
  status?: string;
  paidAt?: string;
  provider?: string;
  transactionCode?: string;
  monthlyRent?: number;
  monthlyCharges?: number;
  depositAmount?: number;
  totalAmount?: number;
  currency?: string;
}

export interface AmenitySnapshot {
  index?: number;
  code?: string;
  name?: string;
  scope?: string;
  costText?: string;
  conditionText?: string;
  sourceType?: string;
}

export interface PolicySnapshot {
  paymentDueDay?: string;
  paymentCycle?: string;
  noticeDaysBeforeTermination?: number;
  latePaymentPenaltyDays?: number;
  depositRefundDays?: number;
  sublettingAllowed?: boolean;
  petsAllowed?: boolean;
  smokingAllowed?: boolean;
  disputeResolution?: string;
}

export interface UpdateContractRevisionRequest {
  landlord: Record<string, unknown>;
  tenant: Record<string, unknown>;
  property: Record<string, unknown>;
  lease: Record<string, unknown>;
  financial: Record<string, unknown>;
  initialPayment?: Record<string, unknown>;
  amenities?: Record<string, unknown>[];
  charges: Record<string, unknown>[];
  equipments: Record<string, unknown>[];
  policies?: Record<string, unknown>;
  meters: Record<string, unknown>;
  specialTerms?: string | null;
  revisionNote?: string | null;
}

export interface ContractResponse {
  id: string;
  contractNumber: string;
  rentalRequestId: string;
  listingId: string;
  landlordId: string;
  tenantId: string;
  templateId: string;
  templateVersionId: string;
  currentRevisionId?: string | null;
  status: ContractStatus;
  paymentStatus: ContractPaymentStatus;
  rentalPaymentId?: string | null;
  paidAt?: string | null;
  landlordConfirmedAt?: string | null;
  signedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractPaymentCharge {
  name: string;
  amount: number;
}

export interface ContractPaymentBreakdownResponse {
  contractId: string;
  monthlyRent: number;
  deposit: number;
  charges: ContractPaymentCharge[];
  chargesTotal: number;
  totalAmount: number;
  excludedMeterCharges: string[];
  paymentStatus: ContractPaymentStatus;
  paidAt?: string | null;
}

export interface ContractRevisionResponse {
  id: string;
  contractId: string;
  revisionNumber: number;
  templateVersionId: string;
  landlord: Record<string, unknown> | null;
  tenant: Record<string, unknown> | null;
  property: Record<string, unknown> | null;
  lease: Record<string, unknown> | null;
  financial: Record<string, unknown> | null;
  initialPayment?: Record<string, unknown> | null;
  amenities?: Record<string, unknown>[] | null;
  charges: Record<string, unknown>[] | null;
  equipments: Record<string, unknown>[] | null;
  policies?: Record<string, unknown> | null;
  meters: Record<string, unknown> | null;
  specialTerms?: string | null;
  revisionNote?: string | null;
  schemaVersion?: number | null;
  createdAt: string;
}

export interface ContractDocumentResponse {
  id: string;
  contractId: string;
  revisionId: string;
  templateVersionId: string;
  documentType: ContractDocumentType;
  purpose: DocumentPurpose;
  storageObjectId?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  status: DocumentGenerationStatus;
  errorMessage?: string | null;
  generatedAt?: string | null;
  viewUrl?: string | null;
  downloadUrl?: string | null;
}

/** Trường bắt buộc của file mẫu Word mà bản nháp hiện tại còn để trống. */
export interface ContractMissingField {
  key: string;
  label: string;
  group: string;
  /** Nhóm snapshot cần sửa: landlord | tenant | property | lease | financial | meters | system */
  section: string;
}

export interface ContractCompletenessResponse {
  contractId: string;
  revisionId: string;
  complete: boolean;
  totalFields: number;
  filledFields: number;
  missingFields: ContractMissingField[];
  warnings: string[];
}

export const CATEGORY_NAMES: Record<ListingCategory, string> = {
  HOUSE: "Nhà nguyên căn",
  APARTMENT: "Căn hộ chung cư",
  ROOM: "Phòng trọ",
  OFFICE: "Văn phòng",
  COMMERCIAL_SPACE: "Mặt bằng kinh doanh",
};

export const CATEGORY_DESCRIPTIONS: Record<ListingCategory, string> = {
  HOUSE: "Nhà nguyên căn, nhà phố, biệt thự",
  APARTMENT: "Căn hộ chung cư",
  ROOM: "Phòng trọ",
  OFFICE: "Văn phòng",
  COMMERCIAL_SPACE: "Mặt bằng kinh doanh",
};

export const CATEGORY_OPTIONS: ListingCategory[] = [
  "HOUSE",
  "APARTMENT",
  "ROOM",
];
