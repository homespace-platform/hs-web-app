import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { IssueMonthlyInvoicePayload, MonthlyInvoice } from "@/types/monthly-invoice.type";

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
};
