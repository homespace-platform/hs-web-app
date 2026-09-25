import axiosClient from "@/lib/axios-client";
import type { ApiResponse, PageResponse } from "@/types/api.type";
import type {
  CreateStorageUploadRequest,
  CreateStorageUploadResponse,
  StorageObjectResponse,
  StorageUrlResponse,
} from "@/types/storage.type";

const USER_AVATAR_REFERENCE_TYPE = "USER";
const USER_AVATAR_PURPOSE = "USER_AVATAR";
const READY_STATUS = "READY";

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function resolveContentType(file: File): string {
  const reportedType = file.type.trim().toLowerCase();
  if (reportedType && reportedType !== "application/octet-stream") {
    return reportedType;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";
}

async function uploadFile(file: File, request: CreateStorageUploadRequest): Promise<string> {
  const contentType = resolveContentType(file);
  const upload = await axiosClient.post<
    ApiResponse<CreateStorageUploadResponse>
  >("/api/v1/storage/uploads", { ...request, contentType });
  const { storageId, uploadUrl } = upload.data.result;

  const s3Response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!s3Response.ok) {
    throw new Error(
      `Không thể tải tệp ${file.name} lên kho lưu trữ (${s3Response.status}).`,
    );
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
      purpose: USER_AVATAR_PURPOSE,
      visibility: "PUBLIC",
      referenceType: USER_AVATAR_REFERENCE_TYPE,
      referenceId: userId,
    });
  },

  async listUserAvatars(
    userId: string,
    page = 1,
    size = 20,
  ): Promise<StorageObjectResponse[]> {
    const response = await axiosClient.get<PageResponse<StorageObjectResponse>>(
      "/api/v1/storage",
      {
        params: {
          referenceType: USER_AVATAR_REFERENCE_TYPE,
          referenceId: userId,
          purpose: USER_AVATAR_PURPOSE,
          status: READY_STATUS,
          page,
          size,
        },
      },
    );
    return response.data.result;
  },

  async getViewUrl(storageId: string): Promise<string> {
    const response = await axiosClient.get<ApiResponse<StorageUrlResponse>>(
      `/api/v1/storage/${storageId}/view-url`,
    );
    return response.data.result.url;
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

  async uploadContractDocx(file: File): Promise<string> {
    const contentType =
      file.type ||
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return uploadFile(file, {
      fileName: file.name,
      contentType,
      size: file.size,
      purpose: "CONTRACT_DOCUMENT",
      visibility: "PRIVATE",
      referenceType: "CONTRACT_TEMPLATE",
      referenceId: "draft",
    });
  },

  async uploadChatAttachment(file: File, conversationId: string) {
    const storageId = await uploadFile(file, {
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      purpose: "CHAT_ATTACHMENT",
      visibility: "AUTHENTICATED",
      referenceType: "CHAT_CONVERSATION",
      referenceId: conversationId,
    });
    return {
      storageId,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    };
  },

  async uploadPaymentProof(file: File, paymentRequestId: string): Promise<string> {
    return uploadFile(file, {
      fileName: file.name,
      contentType: file.type || "image/jpeg",
      size: file.size,
      purpose: "PAYMENT_PROOF",
      visibility: "PRIVATE",
      referenceType: "PAYMENT_REQUEST",
      referenceId: paymentRequestId,
    });
  },
};

export default storageService;
