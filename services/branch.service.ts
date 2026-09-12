import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { PropertyCategoryKey } from "@/app/dashboard/properties/new/types";

export interface BranchCharge {
  id?: string;
  chargeType: string;
  billingMethod: string;
  amount?: number;
  currency?: string;
  unit?: string;
  includedInRent?: boolean;
  customName?: string;
  description?: string;
  sortOrder?: number;
}

export interface PropertyBranch {
  id: string;
  ownerId: string;
  name: string;
  code?: string;
  category: PropertyCategoryKey;
  streetLine?: string;
  wardCode?: string;
  wardName?: string;
  provinceCode?: string;
  provinceName?: string;
  fullAddress: string;
  description?: string;
  buildingRules?: string;
  totalUnits?: number;
  defaultCharges?: BranchCharge[];
  buildingAmenityCodes?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePropertyBranchPayload {
  name: string;
  code?: string;
  category: PropertyCategoryKey;
  streetLine?: string;
  wardCode?: string;
  wardName?: string;
  provinceCode?: string;
  provinceName?: string;
  fullAddress: string;
  description?: string;
  buildingRules?: string;
  defaultCharges?: BranchCharge[];
  buildingAmenityCodes?: string[];
}

function formatBranchPayload(payload: CreatePropertyBranchPayload) {
  const cat = payload.category ? String(payload.category) : "apartment";
  const categoryEnum = cat === "commercial" ? "COMMERCIAL_SPACE" : cat.toUpperCase();
  return {
    ...payload,
    category: categoryEnum as any,
  };
}

const branchService = {
  async getMyBranches(): Promise<PropertyBranch[]> {
    const response = await axiosClient.get<ApiResponse<PropertyBranch[]>>("/api/v1/branches");
    return response.data.result || [];
  },

  async getBranchById(id: string): Promise<PropertyBranch> {
    const response = await axiosClient.get<ApiResponse<PropertyBranch>>(`/api/v1/branches/${id}`);
    return response.data.result;
  },

  async createBranch(payload: CreatePropertyBranchPayload): Promise<PropertyBranch> {
    const response = await axiosClient.post<ApiResponse<PropertyBranch>>(
      "/api/v1/branches",
      formatBranchPayload(payload)
    );
    return response.data.result;
  },

  async updateBranch(id: string, payload: CreatePropertyBranchPayload): Promise<PropertyBranch> {
    const response = await axiosClient.put<ApiResponse<PropertyBranch>>(
      `/api/v1/branches/${id}`,
      formatBranchPayload(payload)
    );
    return response.data.result;
  },

  async deleteBranch(id: string): Promise<void> {
    await axiosClient.delete(`/api/v1/branches/${id}`);
  },
};

export default branchService;
