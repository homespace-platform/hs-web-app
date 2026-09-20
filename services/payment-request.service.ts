import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import type {
  PaymentEvent,
  PaymentRequest,
  ReportTransferPayload,
  RejectReceiptPayload,
  DisputePaymentPayload,
} from "@/types/payment-request.type";

export const paymentRequestService = {
  /**
   * Lấy thông tin chi tiết của một PaymentRequest
   */
  async getPaymentRequest(id: string): Promise<PaymentRequest> {
    const response = await axiosClient.get<ApiResponse<PaymentRequest>>(
      `/api/v1/payment-requests/${id}`
    );
    return response.data.result!;
  },

  /**
   * Lấy thông tin thanh toán ban đầu gắn với yêu cầu thuê (RentalRequest)
   */
  async getInitialPaymentByRentalRequestId(
    rentalRequestId: string
  ): Promise<PaymentRequest> {
    const response = await axiosClient.get<ApiResponse<PaymentRequest>>(
      `/api/v1/rental-requests/${rentalRequestId}/initial-payment`
    );
    return response.data.result!;
  },

  /**
   * Lấy danh sách các yêu cầu thanh toán liên quan đến tài khoản hiện tại
   */
  async getMyPaymentRequests(): Promise<PaymentRequest[]> {
    const response = await axiosClient.get<ApiResponse<PaymentRequest[]>>(
      "/api/v1/payment-requests/mine"
    );
    return response.data.result || [];
  },

  /**
   * Người thuê khai báo đã chuyển khoản trực tiếp
   */
  async reportTransfer(
    id: string,
    payload: ReportTransferPayload
  ): Promise<PaymentRequest> {
    const response = await axiosClient.post<ApiResponse<PaymentRequest>>(
      `/api/v1/payment-requests/${id}/report-transfer`,
      payload
    );
    return response.data.result!;
  },

  /**
   * Chủ nhà xác nhận đã nhận đủ tiền vào tài khoản ngân hàng
   */
  async confirmReceipt(id: string): Promise<PaymentRequest> {
    const response = await axiosClient.post<ApiResponse<PaymentRequest>>(
      `/api/v1/payment-requests/${id}/confirm-receipt`
    );
    return response.data.result!;
  },

  /**
   * Chủ nhà từ chối xác nhận (chưa nhận được hoặc số tiền không khớp)
   */
  async rejectReceipt(
    id: string,
    payload: RejectReceiptPayload
  ): Promise<PaymentRequest> {
    const response = await axiosClient.post<ApiResponse<PaymentRequest>>(
      `/api/v1/payment-requests/${id}/reject-receipt`,
      payload
    );
    return response.data.result!;
  },

  /**
   * Khởi tạo khiếu nại đối soát
   */
  async dispute(
    id: string,
    payload: DisputePaymentPayload
  ): Promise<PaymentRequest> {
    const response = await axiosClient.post<ApiResponse<PaymentRequest>>(
      `/api/v1/payment-requests/${id}/dispute`,
      payload
    );
    return response.data.result!;
  },

  /**
   * Lấy lịch sử audit log (PaymentEvent) của yêu cầu thanh toán
   */
  async getEvents(id: string): Promise<PaymentEvent[]> {
    const response = await axiosClient.get<ApiResponse<PaymentEvent[]>>(
      `/api/v1/payment-requests/${id}/events`
    );
    return response.data.result || [];
  },
};

export default paymentRequestService;
