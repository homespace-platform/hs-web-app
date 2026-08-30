import axios from "axios";
import axiosClient from "@/lib/axios-client";
import keycloak from "@/lib/keycloak";
import type { ApiResponse } from "@/types/api.type";
import type {
  CreateListingRequest,
  CreateListingResponse,
  ListingCategory,
  ListingOptionsResponse,
  ListingResponse,
} from "@/types/listing.type";

type ListingPageResponse = ApiResponse<ListingResponse[]> & {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
};

const listingService = {
  async getPublicOptions(category: ListingCategory): Promise<ListingOptionsResponse> {
    const response = await axios.get<ApiResponse<ListingOptionsResponse>>(
      `${process.env.NEXT_PUBLIC_GATEWAY_BASE_URL}/api/v1/public/listing-catalog`,
      { params: { category } },
    );
    return response.data.result;
  },
  async getById(listingId: string): Promise<ListingResponse> {
    const response = await axiosClient.get<ApiResponse<ListingResponse>>(
      `/api/v1/listings/${listingId}`,
    );
    return response.data.result;
  },

  async getPublished(): Promise<ListingResponse[]> {
    const response = await axios.get<ListingPageResponse>(
      `${process.env.NEXT_PUBLIC_GATEWAY_BASE_URL}/api/v1/listings`,
      {
        params: { page: 0, size: 100 },
        headers: keycloak.token ? { Authorization: `Bearer ${keycloak.token}` } : undefined,
      },
    );
    return response.data.result ?? [];
  },

  async create(request: CreateListingRequest): Promise<CreateListingResponse> {
    const response = await axiosClient.post<ApiResponse<CreateListingResponse>>(
      "/api/v1/listings",
      request,
    );
    return response.data.result;
  },

  async createDraft(request: CreateListingRequest): Promise<CreateListingResponse> {
    const response = await axiosClient.post<ApiResponse<CreateListingResponse>>(
      "/api/v1/listings",
      request,
    );
    return response.data.result;
  },

  async publish(listingId: string): Promise<ListingResponse> {
    const response = await axiosClient.post<ApiResponse<ListingResponse>>(
      `/api/v1/listings/${listingId}/publish`,
    );
    return response.data.result;
  },
};

export default listingService;
