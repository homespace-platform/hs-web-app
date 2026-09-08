import axiosClient from "@/lib/axios-client";
import type { ApiResponse, PageResponse } from "@/types/api.type";
import type {
  ContractTemplateResponse,
  ContractTemplateStatus,
  ContractTemplateVersionResponse,
  CreateContractTemplateRequest,
  CreateTemplateVersionRequest,
  TemplateFieldDefinition,
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
};
