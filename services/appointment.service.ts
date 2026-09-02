import axiosClient from "@/lib/axios-client";
import type { ApiResponse, PageResponse } from "@/types/api.type";
import type {
  AppointmentResponse,
  CreateAppointmentRequest,
  ListingAvailabilityResponse,
  RescheduleAppointmentRequest,
} from "@/types/appointment.type";

const appointmentService = {
  /**
   * Lấy lịch rảnh và danh sách khung giờ khả dụng của bài đăng
   */
  async getAvailability(
    listingId: string,
    date?: string
  ): Promise<ListingAvailabilityResponse> {
    const response = await axiosClient.get<ApiResponse<ListingAvailabilityResponse>>(
      `/api/v1/appointments/availability/${listingId}`,
      {
        params: date ? { date } : undefined,
      }
    );
    return response.data.result!;
  },

  /**
   * Khách hàng đặt lịch xem nhà mới
   */
  async createAppointment(
    req: CreateAppointmentRequest
  ): Promise<AppointmentResponse> {
    const response = await axiosClient.post<ApiResponse<AppointmentResponse>>(
      "/api/v1/appointments",
      req
    );
    return response.data.result!;
  },

  /**
   * Khách hàng lấy danh sách lịch hẹn đã đặt
   */
  async getMyBookings(params?: {
    status?: string;
    date?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<AppointmentResponse>> {
    const response = await axiosClient.get<PageResponse<AppointmentResponse>>(
      "/api/v1/appointments/my-bookings",
      {
        params: {
          status: params?.status && params.status !== "ALL" ? params.status : undefined,
          date: params?.date || undefined,
          page: params?.page ?? 1,
          size: params?.size ?? 12,
        },
      }
    );
    return response.data;
  },

  /**
   * Khách hàng kiểm tra lịch hẹn hiện tại đối với 1 tin đăng cụ thể
   */
  async getMyBookingByListing(
    listingId: string
  ): Promise<AppointmentResponse | null> {
    try {
      const response = await axiosClient.get<ApiResponse<AppointmentResponse>>(
        `/api/v1/appointments/my-bookings/by-listing/${listingId}`
      );
      return response.data.result ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Khách hàng gửi yêu cầu đổi lịch hẹn
   */
  async requestReschedule(
    id: string,
    req: RescheduleAppointmentRequest
  ): Promise<AppointmentResponse> {
    const response = await axiosClient.put<ApiResponse<AppointmentResponse>>(
      `/api/v1/appointments/${id}/reschedule`,
      req
    );
    return response.data.result!;
  },

  /**
   * Khách hàng tự hủy lịch hẹn
   */
  async cancelByRenter(
    id: string,
    cancelReason?: string
  ): Promise<AppointmentResponse> {
    const response = await axiosClient.put<ApiResponse<AppointmentResponse>>(
      `/api/v1/appointments/${id}/cancel`,
      { cancelReason: cancelReason || "Khách hàng tự hủy lịch hẹn" }
    );
    return response.data.result!;
  },

  /**
   * Chủ nhà lấy danh sách lịch hẹn gửi đến các tin đăng của mình
   */
  async getOwnerAppointments(params?: {
    listingId?: string;
    status?: string;
    date?: string;
    page?: number;
    size?: number;
  }): Promise<PageResponse<AppointmentResponse>> {
    const response = await axiosClient.get<PageResponse<AppointmentResponse>>(
      "/api/v1/appointments/owner",
      {
        params: {
          listingId: params?.listingId || undefined,
          status: params?.status && params.status !== "ALL" ? params.status : undefined,
          date: params?.date || undefined,
          page: params?.page ?? 1,
          size: params?.size ?? 12,
        },
      }
    );
    return response.data;
  },

  /**
   * Chủ nhà lấy số lượng lịch hẹn theo từng trạng thái
   */
  async getOwnerAppointmentCounts(): Promise<Record<string, number>> {
    const response = await axiosClient.get<ApiResponse<Record<string, number>>>(
      "/api/v1/appointments/owner/counts"
    );
    return response.data.result ?? {};
  },

  /**
   * Chủ nhà chấp nhận lịch hẹn (Khóa khung giờ đó lại)
   */
  async approveAppointment(
    id: string,
    ownerNote?: string
  ): Promise<AppointmentResponse> {
    const response = await axiosClient.put<ApiResponse<AppointmentResponse>>(
      `/api/v1/appointments/${id}/approve`,
      { ownerNote }
    );
    return response.data.result!;
  },

  /**
   * Chủ nhà từ chối lịch hẹn (kèm lý do)
   */
  async rejectAppointment(
    id: string,
    rejectReason: string
  ): Promise<AppointmentResponse> {
    const response = await axiosClient.put<ApiResponse<AppointmentResponse>>(
      `/api/v1/appointments/${id}/reject`,
      { rejectReason }
    );
    return response.data.result!;
  },

  /**
   * Chủ nhà chấp nhận yêu cầu đổi lịch của khách
   */
  async approveReschedule(id: string): Promise<AppointmentResponse> {
    const response = await axiosClient.put<ApiResponse<AppointmentResponse>>(
      `/api/v1/appointments/${id}/reschedule/approve`
    );
    return response.data.result!;
  },

  /**
   * Chủ nhà từ chối yêu cầu đổi lịch của khách
   */
  async rejectReschedule(
    id: string,
    rejectReason: string
  ): Promise<AppointmentResponse> {
    const response = await axiosClient.put<ApiResponse<AppointmentResponse>>(
      `/api/v1/appointments/${id}/reschedule/reject`,
      { rejectReason }
    );
    return response.data.result!;
  },

  /**
   * Chủ nhà hủy lịch hẹn đã duyệt
   */
  async cancelByOwner(
    id: string,
    cancelReason: string
  ): Promise<AppointmentResponse> {
    const response = await axiosClient.put<ApiResponse<AppointmentResponse>>(
      `/api/v1/appointments/${id}/owner-cancel`,
      { cancelReason }
    );
    return response.data.result!;
  },

  /**
   * Chủ nhà xác nhận đã hoàn thành buổi xem nhà
   */
  async completeAppointment(id: string): Promise<AppointmentResponse> {
    const response = await axiosClient.put<ApiResponse<AppointmentResponse>>(
      `/api/v1/appointments/${id}/complete`
    );
    return response.data.result!;
  },
};

export default appointmentService;
