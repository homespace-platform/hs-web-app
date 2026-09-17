import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type { RentalPaymentResponse } from "@/types/rental-payment.type";

export const rentalPaymentService = {
  /**
   * Lấy thông tin thanh toán ban đầu của yêu cầu thuê
   */
  async getInitialPayment(requestId: string): Promise<RentalPaymentResponse> {
    const response = await axiosClient.get<ApiResponse<RentalPaymentResponse>>(
      `/api/v1/rental-requests/${requestId}/initial-payment`
    );
    return response.data.result!;
  },

  /**
   * Khách thuê thực hiện thanh toán ban đầu giả lập
   */
  async payMock(requestId: string): Promise<RentalPaymentResponse> {
    const response = await axiosClient.post<ApiResponse<RentalPaymentResponse>>(
      `/api/v1/rental-requests/${requestId}/initial-payment/pay-mock`
    );
    return response.data.result!;
  },
};
