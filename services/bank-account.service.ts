import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type {
  Bank,
  BankAccount,
  BankAccountRequest,
  UpdateBankAccountDefaultsRequest,
} from "@/types/bank-account.type";

let banksCache: Promise<Bank[]> | null = null;

export const bankAccountService = {
  /** Public bank catalog; one request per session, cache cleared on failure so it can be retried. */
  getBanks(): Promise<Bank[]> {
    banksCache ??= axiosClient
      .get<ApiResponse<Bank[]>>("/api/v1/public/banks")
      .then((r) => r.data.result ?? [])
      .catch((e) => {
        banksCache = null;
        throw e;
      });
    return banksCache;
  },

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

  /** Owner-only: returns the full (unmasked) account number. Never cache or log the result. */
  async revealBankAccount(id: string): Promise<BankAccount> {
    const response = await axiosClient.get<ApiResponse<BankAccount>>(
      `/api/v1/bank-accounts/${encodeURIComponent(id)}/reveal`
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
