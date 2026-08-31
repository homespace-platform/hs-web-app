import axios from "axios";
import axiosClient from "@/lib/axios-client";
import keycloak from "@/lib/keycloak";
import type { ApiResponse, PageResponse } from "@/types/api.type";
import type {
  CreateListingRequest,
  CreateListingResponse,
  ListingCategory,
  ListingDetailResponse,
  ListingOptionsResponse,
  ListingResponse,
  ListingStatus,
  MyListingSummaryResponse,
} from "@/types/listing.type";

export interface MyListingsQueryParams {
  page?: number;
  status?: ListingStatus;
  keyword?: string;
}

const listingService = {
  /**
   * Lấy danh mục tùy chọn (tiện ích, nội thất) công khai
   */
  async getPublicOptions(category: ListingCategory): Promise<ListingOptionsResponse> {
    const response = await axios.get<ApiResponse<ListingOptionsResponse>>(
      `${process.env.NEXT_PUBLIC_GATEWAY_BASE_URL}/api/v1/public/listing-catalog`,
      { params: { category } },
    );
    return response.data.result;
  },

  /**
   * Lấy danh sách tin đăng của tài khoản hiện tại (phân trang 10 items/trang)
   */
  async getMyListings(params: MyListingsQueryParams = {}): Promise<PageResponse<MyListingSummaryResponse>> {
    const { page = 1, status, keyword } = params;
    const response = await axiosClient.get<PageResponse<MyListingSummaryResponse>>(
      "/api/v1/listings/me",
      {
        params: {
          page,
          ...(status ? { status } : {}),
          ...(keyword && keyword.trim() ? { keyword: keyword.trim() } : {}),
        },
      },
    );
    return response.data;
  },

  /**
   * Lấy chi tiết bài đăng theo ID
   */
  async getById(listingId: string): Promise<ListingDetailResponse> {
    const response = await axiosClient.get<ApiResponse<ListingDetailResponse>>(
      `/api/v1/listings/${listingId}`,
    );
    return response.data.result;
  },

  /**
   * Tạo mới hoặc Cập nhật tin đăng (Upsert)
   */
  async upsert(request: CreateListingRequest): Promise<CreateListingResponse> {
    const response = await axiosClient.post<ApiResponse<CreateListingResponse>>(
      "/api/v1/listings/upsert",
      request,
    );
    return response.data.result;
  },

  /**
   * Ẩn bài đăng của chính chủ
   */
  async hide(listingId: string): Promise<ListingDetailResponse> {
    const response = await axiosClient.patch<ApiResponse<ListingDetailResponse>>(
      `/api/v1/listings/${listingId}/hide`,
    );
    return response.data.result;
  },

  /**
   * Đánh dấu bài đăng đã cho thuê
   */
  async markRented(listingId: string): Promise<ListingDetailResponse> {
    const response = await axiosClient.patch<ApiResponse<ListingDetailResponse>>(
      `/api/v1/listings/${listingId}/mark-rented`,
    );
    return response.data.result;
  },

  /**
   * Lấy danh sách tin đã publish (public)
   */
  async getPublished(): Promise<ListingResponse[]> {
    const response = await axios.get<PageResponse<ListingResponse>>(
      `${process.env.NEXT_PUBLIC_GATEWAY_BASE_URL}/api/v1/listings`,
      {
        params: { page: 1, size: 100 },
        headers: keycloak.token ? { Authorization: `Bearer ${keycloak.token}` } : undefined,
      },
    );
    return response.data.result ?? [];
  },
};

export default listingService;
