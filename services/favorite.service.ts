import axiosClient from "@/lib/axios-client";
import type { ApiResponse, PageResponse } from "@/types/api.type";
import type { PublicListingSummaryResponse } from "@/types/listing.type";

export interface ToggleFavoriteResult {
  listingId: string;
  isFavorite: boolean;
}

const favoriteService = {
  /**
   * Toggle yêu thích một bài đăng (Lưu nếu chưa lưu, Bỏ lưu nếu đã lưu)
   */
  async toggleFavorite(listingId: string): Promise<boolean> {
    const response = await axiosClient.post<ApiResponse<ToggleFavoriteResult>>(
      `/api/v1/favorites/${listingId}/toggle`
    );
    return response.data.result.isFavorite;
  },

  /**
   * Xóa một bài đăng khỏi danh sách yêu thích
   */
  async removeFavorite(listingId: string): Promise<void> {
    await axiosClient.delete<ApiResponse<void>>(
      `/api/v1/favorites/${listingId}`
    );
  },

  /**
   * Lấy danh sách ID các bài đăng người dùng đã lưu
   */
  async getFavoriteListingIds(): Promise<string[]> {
    const response = await axiosClient.get<ApiResponse<string[]>>(
      "/api/v1/favorites/ids"
    );
    return response.data.result ?? [];
  },

  /**
   * Lấy danh sách bài đăng yêu thích phân trang
   */
  async getMyFavorites(page: number = 1, size: number = 12): Promise<PageResponse<PublicListingSummaryResponse>> {
    const response = await axiosClient.get<PageResponse<PublicListingSummaryResponse>>(
      "/api/v1/favorites",
      {
        params: { page, size },
      }
    );
    return response.data;
  },
};

export default favoriteService;
