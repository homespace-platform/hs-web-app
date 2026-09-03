import axiosClient from "@/lib/axios-client";
import type { ApiResponse, PageResponse } from "@/types/api.type";
import type {
  CreateRentalRequestPayload,
  RentalRequestResponse,
  RentalRequestStatus,
} from "@/types/rental-request.type";

const rentalRequestService = {
  /**
   * Khách hàng gửi yêu cầu thuê nhà
   */
  async createRentalRequest(
    payload: CreateRentalRequestPayload
  ): Promise<RentalRequestResponse> {
    const response = await axiosClient.post<ApiResponse<RentalRequestResponse>>(
      "/api/v1/rental-requests",
      payload
    );
    return response.data.result!;
  },

  /**
   * Khách hàng lấy danh sách yêu cầu thuê của mình
   */
  async getMyRequests(params?: {
    status?: RentalRequestStatus | "ALL";
    page?: number;
    size?: number;
  }): Promise<PageResponse<RentalRequestResponse>> {
    const response = await axiosClient.get<PageResponse<RentalRequestResponse>>(
      "/api/v1/rental-requests/my-requests",
      {
        params: {
          status: params?.status && params.status !== "ALL" ? params.status : undefined,
          page: params?.page ?? 1,
          size: params?.size ?? 10,
        },
      }
    );
    return response.data;
  },

  /**
   * Lấy yêu cầu thuê của người dùng hiện tại đối với một bài đăng cụ thể
   */
  async getMyRequestByListing(
    listingId: string
  ): Promise<RentalRequestResponse | null> {
    try {
      const response = await axiosClient.get<ApiResponse<RentalRequestResponse | null>>(
        `/api/v1/rental-requests/by-listing/${listingId}`
      );
      return response.data.result ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Lấy chi tiết 1 yêu cầu thuê
   */
  async getRequestById(id: string): Promise<RentalRequestResponse> {
    const response = await axiosClient.get<ApiResponse<RentalRequestResponse>>(
      `/api/v1/rental-requests/${id}`
    );
    return response.data.result!;
  },

  /**
   * Khách hàng tự hủy yêu cầu thuê (khi còn PENDING)
   */
  async cancelRentalRequest(id: string): Promise<RentalRequestResponse> {
    const response = await axiosClient.put<ApiResponse<RentalRequestResponse>>(
      `/api/v1/rental-requests/${id}/cancel`
    );
    return response.data.result!;
  },

  /**
   * Chủ nhà xem danh sách yêu cầu thuê gửi đến các bài đăng của mình
   */
  async getOwnerRequests(params?: {
    listingId?: string;
    status?: RentalRequestStatus | "ALL";
    page?: number;
    size?: number;
  }): Promise<PageResponse<RentalRequestResponse>> {
    const response = await axiosClient.get<PageResponse<RentalRequestResponse>>(
      "/api/v1/rental-requests/owner",
      {
        params: {
          listingId: params?.listingId || undefined,
          status: params?.status && params.status !== "ALL" ? params.status : undefined,
          page: params?.page ?? 1,
          size: params?.size ?? 10,
        },
      }
    );
    return response.data;
  },

  /**
   * Chủ nhà chấp thuận yêu cầu thuê (Kích hoạt giữ chỗ 24h & tự động hủy các yêu cầu khác)
   */
  async acceptRentalRequest(id: string): Promise<RentalRequestResponse> {
    const response = await axiosClient.put<ApiResponse<RentalRequestResponse>>(
      `/api/v1/rental-requests/${id}/accept`
    );
    return response.data.result!;
  },

  /**
   * Chủ nhà từ chối yêu cầu thuê
   */
  async rejectRentalRequest(
    id: string,
    rejectReason?: string
  ): Promise<RentalRequestResponse> {
    const response = await axiosClient.put<ApiResponse<RentalRequestResponse>>(
      `/api/v1/rental-requests/${id}/reject`,
      { rejectReason }
    );
    return response.data.result!;
  },
};

export default rentalRequestService;
