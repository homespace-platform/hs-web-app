import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { KycStatusResponse, KycVerifiedDetails, VnptKycSession, VnptKycStep } from "@/types/kyc.type";

const kycService = {
  async createVnptSession(): Promise<VnptKycSession> {
    const response = await axiosClient.post<ApiResponse<VnptKycSession>>("/api/v1/users/me/kyc/vnpt/session");
    return response.data.result!;
  },
  async vnptStep(sessionId: string, step: VnptKycStep, body: unknown): Promise<unknown> {
    const response = await axiosClient.post(`/api/v1/users/me/kyc/vnpt/sessions/${encodeURIComponent(sessionId)}/sdk/${step}`, body, { timeout: 55_000 });
    return response.data;
  },
  async finalizeVnpt(sessionId: string): Promise<KycStatusResponse> {
    const response = await axiosClient.post<ApiResponse<KycStatusResponse>>(`/api/v1/users/me/kyc/vnpt/sessions/${encodeURIComponent(sessionId)}/finalize`);
    return response.data.result!;
  },
  async getStatus(): Promise<KycStatusResponse> {
    const response = await axiosClient.get<ApiResponse<KycStatusResponse>>(
      "/api/v1/users/me/kyc"
    );
    return response.data.result!;
  },

  async getVerifiedDetails(): Promise<KycVerifiedDetails | null> {
    const response = await axiosClient.get<ApiResponse<KycVerifiedDetails | null>>(
      "/api/v1/users/me/kyc/details"
    );
    return response.data.result ?? null;
  },

  async cancelSession(): Promise<KycStatusResponse> {
    const response = await axiosClient.post<ApiResponse<KycStatusResponse>>(
      "/api/v1/users/me/kyc/session/cancel"
    );
    return response.data.result!;
  },
};

export default kycService;
