import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type {
  CompleteListingMediaUploadResponse,
  CreateListingMediaUploadResponse,
  ListingMediaType,
} from "@/types/listing.type";

async function uploadListingMedia(file: File, mediaType: ListingMediaType): Promise<string> {
  const upload = await axiosClient.post<ApiResponse<CreateListingMediaUploadResponse>>(
    "/api/v1/listings/media/uploads",
    {
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      mediaType,
    },
  );
  const { uploadUrl, objectKey, publicUrl } = upload.data.result;

  const s3Response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!s3Response.ok) {
    throw new Error(`Không thể tải file lên S3 (${s3Response.status}).`);
  }

  const complete = await axiosClient.post<ApiResponse<CompleteListingMediaUploadResponse>>(
    "/api/v1/listings/media/complete",
    { objectKey },
  );
  return complete.data.result.publicUrl || publicUrl;
}

const listingMediaService = {
  uploadImage(file: File) {
    return uploadListingMedia(file, "IMAGE");
  },

  uploadVideo(file: File) {
    return uploadListingMedia(file, "VIDEO");
  },
};

export default listingMediaService;
