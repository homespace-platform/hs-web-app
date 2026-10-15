import axiosClient from "@/lib/axios-client";
import { primaryDocument } from "@/lib/contract-document-history";
import type { ContractAmendments } from "@/types/contract-amendment.type";
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
    role?: "LANDLORD" | "TENANT";
    billableOnly?: boolean;
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
  async triggerPreview(contractId: string, signal?: AbortSignal): Promise<ContractDocumentResponse> {
    const response = await axiosClient.post<ApiResponse<ContractDocumentResponse>>(
      `/api/v1/contracts/${contractId}/previews`, undefined, { timeout: 95_000, signal }
    );
    return response.data.result;
  },

  async getPreviewStatus(contractId: string, signal?: AbortSignal): Promise<ContractDocumentResponse | null> {
    const response = await axiosClient.get<ApiResponse<ContractDocumentResponse | null>>(
      `/api/v1/contracts/${contractId}/preview-status`, { timeout: 10_000, signal }
    );
    return response.data.result ?? null;
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

  async getDocument(documentId: string): Promise<ContractDocumentResponse> {
    const response = await axiosClient.get<ApiResponse<ContractDocumentResponse>>(
      `/api/v1/contracts/documents/${encodeURIComponent(documentId)}`
    );
    return response.data.result;
  },

  async getDocuments(contractId: string): Promise<ContractDocumentResponse[]> {
    const response = await axiosClient.get<ApiResponse<ContractDocumentResponse[]>>(
      `/api/v1/contracts/${contractId}/documents`
    );
    return response.data.result || [];
  },

  async getEffectiveDocument(contractId: string): Promise<ContractDocumentResponse | null> {
    // Use the existing server-resolved terms API, including on Core versions that
    // predate /effective-document. Never infer effectiveness from newest PDF/signature.
    const requested = await contractService.getContract(contractId);
    const root = requested.parentContractId ? await contractService.getContract(requested.parentContractId) : requested;
    if (requested.id !== contractId || !root.id || root.parentContractId)
      throw new Error("Không xác định được hợp đồng gốc để đối chiếu văn bản đang áp dụng.");
    const response = await axiosClient.get<ApiResponse<ContractAmendments>>(
      `/api/v1/contracts/${encodeURIComponent(root.id)}/amendments`
    );
    const state = response.data.result;
    if (!state?.currentTermsRevisionId || !Number.isFinite(Date.parse(state.serverNow)))
      throw new Error("Chưa xác định được phiên bản hợp đồng đang áp dụng từ hệ thống.");
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(state.serverNow));
    const candidates = state.currentTermsRevisionId === root.currentRevisionId ? [root.id]
      : [...state.proposals].filter(p => p.signedAt && ["APPLIED","SCHEDULED"].includes(p.status)
          && p.agreementContractId && p.effectiveOn <= today)
        .sort((a,b) => b.effectiveOn.localeCompare(a.effectiveOn) || Date.parse(b.signedAt!) - Date.parse(a.signedAt!))
        .map(p => p.agreementContractId!);
    for (const ownerId of new Set(candidates)) {
      const rows = await contractService.getDocuments(ownerId);
      const match = primaryDocument(rows.filter(d => d.contractId === ownerId && Boolean(d.storageObjectId)),true,state.currentTermsRevisionId);
      if (!match) continue;
      const fresh = await contractService.getDocument(match.id);
      if (fresh.id !== match.id || fresh.contractId !== ownerId || fresh.revisionId !== state.currentTermsRevisionId
        || fresh.status !== "READY" || fresh.purpose !== "SIGNED_FINAL" || fresh.documentType !== "PDF")
        throw new Error("Tệp nhận được không khớp phiên bản hợp đồng đang áp dụng. Vui lòng tải lại hồ sơ.");
      return fresh;
    }
    return null;
  },
};
