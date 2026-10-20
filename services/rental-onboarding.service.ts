import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { PaymentRequest } from "@/types/payment-request.type";

export interface RentalStartChange {
  id: string; previousDate: string; requestedDate: string; reason: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "WITHDRAWN" | "EXPIRED";
  requestedAt: string; respondBy: string; decidedAt?: string; responseNote?: string;
}
export interface RentalOnboarding {
  serverNow: string; timezone: string; stage: string; startsOn: string; endExclusive: string;
  paymentOpensAt: string; paymentDueAt?: string; signingDueAt?: string;
  canPrepareContract: boolean; canSign: boolean; canRequestEarlierStart: boolean;
  holdMinutes: number; payments: PaymentRequest[]; startChanges: RentalStartChange[]; message: string; askerRole: "LANDLORD" | "TENANT";
  cancellationRequestedAt?: string; cancellationReason?: string;
  history: { id: string; occurredAt: string; action: string; note?: string }[];
}
const base = (id: string) => `/api/v1/rental-requests/${id}/onboarding`;
export const rentalOnboardingService = {
  async refresh(id: string) {
    return (await axiosClient.post<ApiResponse<RentalOnboarding>>(`${base(id)}/refresh`)).data.result;
  },
  async request(id: string, startsOn: string, reason: string) {
    return (await axiosClient.post<ApiResponse<RentalOnboarding>>(`${base(id)}/earlier-start`, { startsOn, reason })).data.result;
  },
  async decide(id: string, changeId: string, approve: boolean) {
    return (await axiosClient.put<ApiResponse<RentalOnboarding>>(`${base(id)}/earlier-start/${changeId}`, { approve })).data.result;
  },
  async withdraw(id: string, changeId: string) {
    return (await axiosClient.delete<ApiResponse<RentalOnboarding>>(`${base(id)}/earlier-start/${changeId}`)).data.result;
  },
  async cancel(id: string, reason: string) { return (await axiosClient.post<ApiResponse<RentalOnboarding>>(`${base(id)}/cancellation`, { reason })).data.result; },
  async reopenSigning(id: string, reason: string) { return (await axiosClient.post<ApiResponse<RentalOnboarding>>(`${base(id)}/reopen-signing`, { reason })).data.result; },
  async decideCancel(id: string, approve: boolean) { return (await axiosClient.put<ApiResponse<RentalOnboarding>>(`${base(id)}/cancellation`, { approve })).data.result; },
  async review(id: string, paymentId: string, received: boolean, reason: string) { return (await axiosClient.put<ApiResponse<RentalOnboarding>>(`${base(id)}/payments/${paymentId}/review`, { received, reason })).data.result; },
};
