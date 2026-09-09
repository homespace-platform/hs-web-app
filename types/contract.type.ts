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
  | "ACTIVE"
  | "TERMINATED"
  | "CANCELLED";

export type ContractDocumentType = "DOCX" | "PDF";
export type DocumentPurpose = "PREVIEW" | "OFFICIAL";
export type DocumentGenerationStatus = "GENERATING" | "READY" | "FAILED" | "STALE";

export interface CreateContractDraftRequest {
  rentalRequestId: string;
  templateVersionId: string;
}

export interface UpdateContractRevisionRequest {
  landlord: Record<string, unknown>;
  tenant: Record<string, unknown>;
  property: Record<string, unknown>;
  lease: Record<string, unknown>;
  financial: Record<string, unknown>;
  charges: Record<string, unknown>[];
  equipments: Record<string, unknown>[];
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
  createdAt: string;
  updatedAt: string;
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
  charges: Record<string, unknown>[] | null;
  equipments: Record<string, unknown>[] | null;
  meters: Record<string, unknown> | null;
  specialTerms?: string | null;
  revisionNote?: string | null;
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
  APARTMENT: "Căn hộ / Chung cư",
  HOUSE: "Nhà nguyên căn",
  OFFICE: "Văn phòng",
  COMMERCIAL_SPACE: "Mặt bằng kinh doanh",
  ROOM: "Nhà trọ / Căn hộ dịch vụ",
};

export const CATEGORY_DESCRIPTIONS: Record<ListingCategory, string> = {
  APARTMENT: "Căn hộ chung cư, studio, duplex, penthouse, officetel",
  HOUSE: "Nhà phố, nhà trong hẻm, biệt thự, nhà cấp 4",
  OFFICE: "Văn phòng truyền thống, trọn gói, coworking, chia sẻ",
  COMMERCIAL_SPACE: "Cửa hàng, ki-ốt, showroom, shophouse, mặt bằng TTTM",
  ROOM: "Phòng trọ, phòng trong nhà, căn hộ dịch vụ, ký túc xá",
};

export const CATEGORY_OPTIONS: ListingCategory[] = [
  "APARTMENT",
  "HOUSE",
  "OFFICE",
  "COMMERCIAL_SPACE",
  "ROOM",
];
