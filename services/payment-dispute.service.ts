import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { DisputeAction, DisputeCaseActionPayload, PaymentDisputeCase } from "@/types/payment-dispute.type";
export const paymentDisputeService = {
  async list(paymentId: string): Promise<PaymentDisputeCase[]> {
    const response = await axiosClient.get<ApiResponse<PaymentDisputeCase[]>>(`/api/v1/payment-requests/${paymentId}/dispute-cases`);
    return response.data.result ?? [];
  },
  async adopt(paymentId: string, reason: string): Promise<PaymentDisputeCase> {
    const response = await axiosClient.post<ApiResponse<PaymentDisputeCase>>(`/api/v1/payment-requests/${paymentId}/dispute-cases/adopt`, { reason });
    return response.data.result;
  },
  async act(id: string, action: DisputeAction, payload: DisputeCaseActionPayload): Promise<PaymentDisputeCase> {
    const response = await axiosClient.post<ApiResponse<PaymentDisputeCase>>(`/api/v1/payment-disputes/${id}/actions/${action}`, payload);
    return response.data.result;
  },
};
