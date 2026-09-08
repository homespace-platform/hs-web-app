import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { KycSessionResponse, KycStatusResponse } from "@/types/kyc.type";

const kycService = {
  async getStatus(): Promise<KycStatusResponse> {
    const response = await axiosClient.get<ApiResponse<KycStatusResponse>>(
      "/api/v1/users/me/kyc"
    );
    return response.data.result!;
  },

  async createSession(): Promise<KycSessionResponse> {
    const response = await axiosClient.post<ApiResponse<KycSessionResponse>>(
      "/api/v1/users/me/kyc/session"
    );
    return response.data.result!;
  },
};

export default kycService;
