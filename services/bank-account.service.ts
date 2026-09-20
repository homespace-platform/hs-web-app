import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type {
  BankAccount,
  BankAccountRequest,
  UpdateBankAccountDefaultsRequest,
} from "@/types/bank-account.type";

export const bankAccountService = {
  async getBankAccounts(): Promise<BankAccount[]> {
    const response = await axiosClient.get<ApiResponse<BankAccount[]>>(
      "/api/v1/bank-accounts"
    );
    return response.data.result || [];
  },

  async createBankAccount(data: BankAccountRequest): Promise<BankAccount> {
    const response = await axiosClient.post<ApiResponse<BankAccount>>(
      "/api/v1/bank-accounts",
      data
    );
    return response.data.result!;
  },

  async updateBankAccount(
    id: string,
    data: BankAccountRequest
  ): Promise<BankAccount> {
    const response = await axiosClient.put<ApiResponse<BankAccount>>(
      `/api/v1/bank-accounts/${id}`,
      data
    );
    return response.data.result!;
  },

  async updateDefaults(
    id: string,
    data: UpdateBankAccountDefaultsRequest
  ): Promise<BankAccount> {
    const response = await axiosClient.put<ApiResponse<BankAccount>>(
      `/api/v1/bank-accounts/${id}/defaults`,
      data
    );
    return response.data.result!;
  },

  async deleteBankAccount(id: string): Promise<void> {
    await axiosClient.delete<ApiResponse<void>>(`/api/v1/bank-accounts/${id}`);
  },
};

export default bankAccountService;
