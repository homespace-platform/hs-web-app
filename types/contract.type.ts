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
