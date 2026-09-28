import axiosClient from "@/lib/axios-client";
import type { ApiResponse, PageResponse } from "@/types/api.type";
import type {
  ContractCompletenessResponse,
  ContractDocumentResponse,
  ContractPaymentBreakdownResponse,
  ContractResponse,
  ContractRevisionResponse,
  ContractStatus,
  CreateContractDraftRequest,
  UpdateContractRevisionRequest,
  SignatureStateResponse,
  SignatureRequestResponse,
  CertificateOptionResponse,
} from "@/types/contract.type";

export const contractService = {
  async getSignatureState(contractId: string): Promise<SignatureStateResponse> {
    const response = await axiosClient.get<ApiResponse<SignatureStateResponse>>(
      `/api/v1/contracts/${contractId}/signatures/state`
    );
    return response.data.result;
  },

  async getSigningCertificates(contractId: string): Promise<CertificateOptionResponse[]> {
    const response = await axiosClient.get<ApiResponse<CertificateOptionResponse[]>>(
      `/api/v1/contracts/${contractId}/signatures/certificates`
    );
    return response.data.result || [];
  },

  async initiateSmartCaSignature(contractId: string, certificateSerial: string): Promise<SignatureRequestResponse> {
    const response = await axiosClient.post<ApiResponse<SignatureRequestResponse>>(
      `/api/v1/contracts/${contractId}/signatures/initiate`,
      { certificateSerial, consent: true }
    );
    return response.data.result;
  },

  async refreshSmartCaSignature(contractId: string, requestId: string): Promise<SignatureRequestResponse> {
    const response = await axiosClient.post<ApiResponse<SignatureRequestResponse>>(
      `/api/v1/contracts/${contractId}/signatures/${requestId}/refresh`
    );
    return response.data.result;
  },
  // --- Hợp đồng ---

  async getByRentalRequest(
    rentalRequestId: string
  ): Promise<ContractResponse | null> {
    const response = await axiosClient.get<ApiResponse<ContractResponse | null>>(
      `/api/v1/contracts/by-rental-request/${rentalRequestId}`
    );
    return response.data.result ?? null;
  },

  async createDraft(request: CreateContractDraftRequest): Promise<ContractResponse> {
    const response = await axiosClient.post<ApiResponse<ContractResponse>>(
      "/api/v1/contracts",
      request
    );
    return response.data.result;
  },

  async listContracts(params?: {
    status?: ContractStatus;
    page?: number;
    size?: number;
  }): Promise<PageResponse<ContractResponse>> {
    const response = await axiosClient.get<PageResponse<ContractResponse>>(
      "/api/v1/contracts",
      { params }
    );
    return response.data;
  },

  async getContract(contractId: string): Promise<ContractResponse> {
    const response = await axiosClient.get<ApiResponse<ContractResponse>>(
      `/api/v1/contracts/${contractId}`
    );
    return response.data.result;
  },

  async getRevision(contractId: string): Promise<ContractRevisionResponse> {
    const response = await axiosClient.get<ApiResponse<ContractRevisionResponse>>(
      `/api/v1/contracts/${contractId}/revision`
    );
    return response.data.result;
  },

  async updateRevision(
    contractId: string,
    request: UpdateContractRevisionRequest
  ): Promise<ContractRevisionResponse> {
    const response = await axiosClient.patch<ApiResponse<ContractRevisionResponse>>(
      `/api/v1/contracts/${contractId}/revision`,
      request
    );
    return response.data.result;
  },

  async getCompleteness(contractId: string): Promise<ContractCompletenessResponse> {
    const response = await axiosClient.get<ApiResponse<ContractCompletenessResponse>>(
      `/api/v1/contracts/${contractId}/completeness`
    );
    return response.data.result;
  },

  /** Kết xuất bản nháp ra file. Trả về PDF nếu Gotenberg bật, ngược lại là DOCX. */
  async triggerPreview(contractId: string): Promise<ContractDocumentResponse> {
    const response = await axiosClient.post<ApiResponse<ContractDocumentResponse>>(
      `/api/v1/contracts/${contractId}/previews`
    );
    return response.data.result;
  },

  async sendToTenant(contractId: string): Promise<ContractResponse> {
    const response = await axiosClient.post<ApiResponse<ContractResponse>>(
      `/api/v1/contracts/${contractId}/send`
    );
    return response.data.result;
  },

  async getPaymentBreakdown(contractId: string): Promise<ContractPaymentBreakdownResponse> {
    const response = await axiosClient.get<ApiResponse<ContractPaymentBreakdownResponse>>(
      `/api/v1/contracts/${contractId}/payment-breakdown`
    );
    return response.data.result;
  },

  async payMock(contractId: string): Promise<ContractPaymentBreakdownResponse> {
    const response = await axiosClient.post<ApiResponse<ContractPaymentBreakdownResponse>>(
      `/api/v1/contracts/${contractId}/pay-mock`
    );
    return response.data.result;
  },

  async sign(contractId: string): Promise<ContractResponse> {
    const response = await axiosClient.post<ApiResponse<ContractResponse>>(
      `/api/v1/contracts/${contractId}/sign`
    );
    return response.data.result;
  },

  async getDocuments(contractId: string): Promise<ContractDocumentResponse[]> {
    const response = await axiosClient.get<ApiResponse<ContractDocumentResponse[]>>(
      `/api/v1/contracts/${contractId}/documents`
    );
    return response.data.result || [];
  },
};
