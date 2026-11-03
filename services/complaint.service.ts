import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { ComplaintAction, ComplaintCase, ComplaintCategory } from "@/types/complaint.type";
export const complaintService = {
  async list(rentalId: string) { return (await axiosClient.get<ApiResponse<ComplaintCase[]>>("/api/v1/rental-requests/"+encodeURIComponent(rentalId)+"/complaints")).data.result ?? []; },
  async open(rentalId: string, payload: {category: ComplaintCategory; reason: string; evidenceIds: string[]; urgent: boolean}) {
    return (await axiosClient.post<ApiResponse<ComplaintCase>>("/api/v1/rental-requests/"+encodeURIComponent(rentalId)+"/complaints",payload)).data.result;
  },
  async act(id: string, action: string, payload: ComplaintAction) {return (await axiosClient.post<ApiResponse<ComplaintCase>>("/api/v1/complaints/"+encodeURIComponent(id)+"/actions/"+action,payload)).data.result;},
};
