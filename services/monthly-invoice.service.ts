import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { IssueMonthlyInvoicePayload, MonthlyInvoice, OverdueActionType } from "@/types/monthly-invoice.type";

export const monthlyInvoiceService = {
  async list(contractId: string): Promise<MonthlyInvoice[]> {
    const { data } = await axiosClient.get<ApiResponse<MonthlyInvoice[]>>(
      `/api/v1/monthly-invoices/contracts/${contractId}`
    );
    return data.result || [];
  },
  async issue(id: string, payload: IssueMonthlyInvoicePayload): Promise<MonthlyInvoice> {
    const { data } = await axiosClient.post<ApiResponse<MonthlyInvoice>>(
      `/api/v1/monthly-invoices/${id}/issue`, payload
    );
    return data.result;
  },
  async prepare(id: string, payload: IssueMonthlyInvoicePayload): Promise<MonthlyInvoice> {
    const { data } = await axiosClient.post<ApiResponse<MonthlyInvoice>>(
      `/api/v1/monthly-invoices/${id}/prepare`, payload
    );
    return data.result;
  },
  async recordOverdueAction(id: string, payload: {
    type: OverdueActionType; note: string; proposedDate?: string;
  }): Promise<MonthlyInvoice> {
    const { data } = await axiosClient.post<ApiResponse<MonthlyInvoice>>(
      `/api/v1/monthly-invoices/${id}/overdue-actions`, payload
    );
    return data.result;
  },
  async acknowledgeOverdueAction(id: string, actionId: string, note: string): Promise<MonthlyInvoice> {
    const { data } = await axiosClient.post<ApiResponse<MonthlyInvoice>>(
      `/api/v1/monthly-invoices/${id}/overdue-actions/${actionId}/acknowledge`, { note }
    );
    return data.result;
  },
  async deferToNextPeriod(id: string): Promise<MonthlyInvoice> {
    const { data } = await axiosClient.post<ApiResponse<MonthlyInvoice>>(
      `/api/v1/monthly-invoices/${id}/defer-to-next-period`
    );
    return data.result;
  },
  async proposeTermination(id: string): Promise<MonthlyInvoice> {
    const { data } = await axiosClient.post<ApiResponse<MonthlyInvoice>>(
      `/api/v1/monthly-invoices/${id}/termination/propose`
    );
    return data.result;
  },
  async acceptTermination(id: string, payload: { acceptEarlyTermination: boolean;
    acceptDepositRetention: boolean; acknowledgeOutstandingDebt: boolean }): Promise<MonthlyInvoice> {
    const { data } = await axiosClient.post<ApiResponse<MonthlyInvoice>>(
      `/api/v1/monthly-invoices/${id}/termination/accept`, payload
    );
    return data.result;
  },
  async declineTermination(id: string): Promise<MonthlyInvoice> {
    const { data } = await axiosClient.post<ApiResponse<MonthlyInvoice>>(
      `/api/v1/monthly-invoices/${id}/termination/decline`
    );
    return data.result;
  },
  async withdrawTermination(id: string): Promise<MonthlyInvoice> {
    const { data } = await axiosClient.post<ApiResponse<MonthlyInvoice>>(
      `/api/v1/monthly-invoices/${id}/termination/withdraw`
    );
    return data.result;
  },
  async completeTermination(id: string, payload: { vacantPossessionConfirmed: boolean;
    keysAndAssetsReturned: boolean }): Promise<MonthlyInvoice> {
    const { data } = await axiosClient.post<ApiResponse<MonthlyInvoice>>(
      `/api/v1/monthly-invoices/${id}/termination/complete`, payload
    );
    return data.result;
  },
  async forceTerminationAfterDecline(id: string, payload: { signedClauseAcknowledged: boolean;
    tenantNotified: boolean; vacantPossessionConfirmed: boolean; keysAndAssetsReturned: boolean }): Promise<MonthlyInvoice> {
    const { data } = await axiosClient.post<ApiResponse<MonthlyInvoice>>(
      `/api/v1/monthly-invoices/${id}/termination/force-after-decline`, payload
    );
    return data.result;
  },
};
