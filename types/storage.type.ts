export type StoragePurpose = "USER_AVATAR" | "PROPERTY_IMAGE";

export type StorageVisibility = "PUBLIC" | "PRIVATE";

export type CreateStorageUploadRequest = {
  fileName: string;
  contentType: string;
  size: number;
  purpose: StoragePurpose;
  visibility: StorageVisibility;
  referenceType: string;
  referenceId: string;
};

export type CreateStorageUploadResponse = {
  storageId: string;
  uploadUrl: string;
  method: "PUT";
  objectKey: string;
  expiresAt: string;
};
