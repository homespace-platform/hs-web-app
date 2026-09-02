import axiosClient from "@/lib/axios-client";
import type { ApiResponse, PageResponse } from "@/types/api.type";
import type { PublicListingSummaryResponse } from "@/types/listing.type";

const historyService = {
  /**
   * Ghi nhận lượt xem bài đăng (tự động cập nhật timestamp nếu xem lại)
   */
  async recordView(listingId: string): Promise<void> {
    await axiosClient.post<ApiResponse<void>>(`/api/v1/history/${listingId}`);
  },

  /**
   * Lấy danh sách ID các tin đã xem gần đây (tối đa 40)
   */
  async getHistoryListingIds(): Promise<string[]> {
    const response = await axiosClient.get<ApiResponse<string[]>>(
      "/api/v1/history/ids"
    );
    return response.data.result ?? [];
  },

  /**
   * Lấy tổng số lượng tin đã xem (0 - 40)
   */
  async getHistoryCount(): Promise<number> {
    const response = await axiosClient.get<ApiResponse<number>>(
      "/api/v1/history/count"
    );
    return response.data.result ?? 0;
  },

  /**
   * Lấy danh sách bài đăng đã xem phân trang (tối đa 40 tin, mới nhất -> cũ nhất)
   */
  async getMyHistory(
    page: number = 1,
    size: number = 12
  ): Promise<PageResponse<PublicListingSummaryResponse>> {
    const response = await axiosClient.get<PageResponse<PublicListingSummaryResponse>>(
      "/api/v1/history",
      {
        params: { page, size },
      }
    );
    return response.data;
  },

  /**
   * Xóa một bài đăng khỏi lịch sử xem
   */
  async removeHistoryItem(listingId: string): Promise<void> {
    await axiosClient.delete<ApiResponse<void>>(`/api/v1/history/${listingId}`);
  },

  /**
   * Xóa toàn bộ lịch sử xem tin của người dùng
   */
  async clearMyHistory(): Promise<void> {
    await axiosClient.delete<ApiResponse<void>>("/api/v1/history");
  },
};

export default historyService;
