import axiosClient from "@/lib/axios-client";
import type { ApiResponse, PageResponse } from "@/types/api.type";
import type {
  ContractCompletenessResponse,
  ContractDocumentResponse,
  ContractPaymentBreakdownResponse,
  ContractResponse,
  ContractRevisionResponse,
  ContractStatus,
  ContractTemplateResponse,
  ContractTemplateStatus,
  ContractTemplateVersionResponse,
  CreateContractDraftRequest,
  CreateContractTemplateRequest,
  CreateTemplateVersionRequest,
  TemplateFieldDefinition,
  UpdateContractRevisionRequest,
} from "@/types/contract.type";
import type { ListingCategory } from "@/types/listing.type";

export const contractService = {
  async getCatalogFields(): Promise<TemplateFieldDefinition[]> {
    const response = await axiosClient.get<ApiResponse<TemplateFieldDefinition[]>>(
      "/api/v1/contracts/template-fields"
    );
    return response.data.result || [];
  },

  async listSystemTemplates(category?: ListingCategory): Promise<ContractTemplateResponse[]> {
    const response = await axiosClient.get<ApiResponse<ContractTemplateResponse[]>>(
      "/api/v1/contracts/templates/system",
      { params: category ? { category } : undefined }
    );
    return response.data.result || [];
  },

  async listMyTemplates(params?: {
    status?: ContractTemplateStatus;
    category?: ListingCategory;
    page?: number;
    size?: number;
  }): Promise<ContractTemplateResponse[]> {
    const response = await axiosClient.get<PageResponse<ContractTemplateResponse>>(
      "/api/v1/contracts/templates/mine",
      { params }
    );
    return response.data.result || [];
  },

  async createMyTemplate(
    request: CreateContractTemplateRequest
  ): Promise<ContractTemplateResponse> {
    const response = await axiosClient.post<ApiResponse<ContractTemplateResponse>>(
      "/api/v1/contracts/templates/mine",
      request
    );
    return response.data.result;
  },

  async getTemplate(templateId: string): Promise<ContractTemplateResponse> {
    const response = await axiosClient.get<ApiResponse<ContractTemplateResponse>>(
      `/api/v1/contracts/templates/${templateId}`
    );
    return response.data.result;
  },

  async createVersion(
    templateId: string,
    request: CreateTemplateVersionRequest
  ): Promise<ContractTemplateVersionResponse> {
    const response = await axiosClient.post<ApiResponse<ContractTemplateVersionResponse>>(
      `/api/v1/contracts/templates/${templateId}/versions`,
      request
    );
    return response.data.result;
  },

  async getVersions(templateId: string): Promise<ContractTemplateVersionResponse[]> {
    const response = await axiosClient.get<ApiResponse<ContractTemplateVersionResponse[]>>(
      `/api/v1/contracts/templates/${templateId}/versions`
    );
    return response.data.result || [];
  },

  async publishVersion(
    templateId: string,
    versionId: string
  ): Promise<ContractTemplateVersionResponse> {
    const response = await axiosClient.post<ApiResponse<ContractTemplateVersionResponse>>(
      `/api/v1/contracts/templates/${templateId}/versions/${versionId}/publish`
    );
    return response.data.result;
  },

  async archiveTemplate(templateId: string): Promise<void> {
    await axiosClient.post(`/api/v1/contracts/templates/${templateId}/archive`);
  },

  async testPreviewVersion(
    templateId: string,
    versionId: string
  ): Promise<{ blob: Blob; filename: string; contentType: string }> {
    const response = await axiosClient.post(
      `/api/v1/contracts/templates/${templateId}/versions/${versionId}/test-preview`,
      {},
      { responseType: "blob" }
    );

    const contentType = String(response.headers["content-type"] || "application/octet-stream");
    const isPdf = contentType.includes("application/pdf");
    return {
      blob: new Blob([response.data], { type: contentType }),
      filename: isPdf ? "test_preview.pdf" : "test_preview.docx",
      contentType,
    };
  },

  // --- Hợp đồng ---

  /** Mẫu đã publish dùng được cho tin đăng của yêu cầu thuê này (lọc theo loại hình). */
  async getApplicableTemplates(
    rentalRequestId: string
  ): Promise<ContractTemplateResponse[]> {
    const response = await axiosClient.get<ApiResponse<ContractTemplateResponse[]>>(
      "/api/v1/contracts/applicable-templates",
      { params: { rentalRequestId } }
    );
    return response.data.result || [];
  },

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
