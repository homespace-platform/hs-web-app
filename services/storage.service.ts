import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type {
  CreateStorageUploadRequest,
  CreateStorageUploadResponse,
} from "@/types/storage.type";

async function uploadFile(file: File, request: CreateStorageUploadRequest): Promise<string> {
  const upload = await axiosClient.post<
    ApiResponse<CreateStorageUploadResponse>
  >("/api/v1/storage/uploads", request);
  const { storageId, uploadUrl } = upload.data.result;

  const s3Response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!s3Response.ok) {
    throw new Error(`Không thể tải ảnh lên S3 (${s3Response.status}).`);
  }

  await axiosClient.post<ApiResponse<unknown>>(
    `/api/v1/storage/${storageId}/complete`,
    {},
  );
  return storageId;
}

const storageService = {
  async uploadUserAvatar(file: File, userId: string): Promise<string> {
    return uploadFile(file, {
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      purpose: "USER_AVATAR",
      visibility: "PUBLIC",
      referenceType: "USER",
      referenceId: userId,
    });
  },

  async uploadListingMedia(file: File, referenceId = "listing"): Promise<string> {
    return uploadFile(file, {
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      purpose: "GENERAL",
      visibility: "PUBLIC",
      referenceType: "LISTING",
      referenceId,
    });
  },
};

export default storageService;
