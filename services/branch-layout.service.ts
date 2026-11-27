import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { BranchLayout, SaveBranchLayoutRequest } from "@/types/branch-layout.type";

const path = (branchId: string) => `/api/v1/branches/${branchId}/layout`;

const branchLayoutService = {
  async getLayout(branchId: string): Promise<BranchLayout> {
    const response = await axiosClient.get<ApiResponse<BranchLayout>>(path(branchId));
    return response.data.result;
  },

  async saveLayout(branchId: string, request: SaveBranchLayoutRequest): Promise<BranchLayout> {
    const response = await axiosClient.put<ApiResponse<BranchLayout>>(path(branchId), request);
    return response.data.result;
  },
};

export default branchLayoutService;
