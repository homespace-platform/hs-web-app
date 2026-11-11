import axiosClient from "@/lib/axios-client";
import {
  MEMBERSHIP_API_PATHS,
  mergeMembershipPlans,
  normalizeCheckoutResponse,
  normalizeMembershipQuote,
  normalizeMembershipView,
  normalizeOrderView,
} from "@/lib/membership";
import type { ApiResponse } from "@/types/api.type";
import type {
  MembershipCheckoutResponse,
  MembershipEthChallenge,
  MembershipEthQuote,
  MembershipEthStatus,
  MembershipOrderView,
  MembershipPaymentProvider,
  MembershipPlan,
  MembershipPlanDto,
  MembershipQuote,
  MembershipView,
  PaidMembershipTierCode,
} from "@/types/membership.type";

const membershipService = {
  /**
   * Lấy danh sách gói hội viên từ backend qua gateway (/api/v1/membership/plans)
   */
  async getPlans(): Promise<MembershipPlan[]> {
    const response = await axiosClient.get<ApiResponse<MembershipPlanDto[]>>(
      "/api/v1/membership/plans",
    );
    const rawList = Array.isArray(response.data?.result)
      ? response.data.result
      : Array.isArray(response.data)
      ? (response.data as unknown as MembershipPlanDto[])
      : [];
    return mergeMembershipPlans(rawList);
  },

  /**
   * Lấy thông tin gói hội viên & lượt đăng tin hiện tại của người dùng (/api/v1/membership/me)
   */
  async getMyMembership(): Promise<MembershipView> {
    const response = await axiosClient.get<ApiResponse<MembershipView>>(
      "/api/v1/membership/me",
    );
    const payload = response.data?.result ?? response.data;
    return normalizeMembershipView(payload);
  },

  /**
   * Lấy báo giá chính xác từ server trước khi xác nhận mua/nâng cấp (/api/v1/membership/quote?tier=...)
   */
  async getQuote(tier: PaidMembershipTierCode): Promise<MembershipQuote> {
    const response = await axiosClient.get<ApiResponse<MembershipQuote>>(
      "/api/v1/membership/quote",
      { params: { tier } },
    );
    const payload = response.data?.result ?? response.data;
    return normalizeMembershipQuote(payload, tier);
  },

  /**
   * Khởi tạo đơn thanh toán gói hội viên với mức giá được kiểm tra lại trên server (/api/v1/membership/checkout)
   */
  async checkout(
    tier: PaidMembershipTierCode,
    provider: MembershipPaymentProvider = "SEPAY",
  ): Promise<MembershipCheckoutResponse> {
    const response = await axiosClient.post<ApiResponse<MembershipCheckoutResponse>>(
      "/api/v1/membership/checkout",
      { tier, provider },
    );
    const payload = response.data?.result ?? response.data;
    return normalizeCheckoutResponse(payload);
  },

  /**
   * Truy vấn trạng thái đơn hàng hội viên từ backend đáng tin cậy (/api/v1/membership/orders/{id})
   */
  async getOrder(orderId: string): Promise<MembershipOrderView> {
    const response = await axiosClient.get<ApiResponse<MembershipOrderView>>(
      `/api/v1/membership/orders/${encodeURIComponent(orderId)}`,
    );
    const payload = response.data?.result ?? response.data;
    return normalizeOrderView(payload);
  },

  /**
   * Hủy đơn hàng hội viên đang chờ xử lý (/api/v1/membership/orders/{id}/cancel).
   * Đơn PENDING sẽ chuyển sang CANCELLED; nếu đơn đã ở trạng thái kết thúc
   * (PAID, REVIEW, FAILED, EXPIRED, CANCELLED), backend trả về trạng thái thực tế.
   */
  async cancelOrder(orderId: string): Promise<MembershipOrderView> {
    const response = await axiosClient.post<ApiResponse<MembershipOrderView>>(
      MEMBERSHIP_API_PATHS.cancelOrder(orderId),
    );
    const payload = response.data?.result ?? response.data;
    return normalizeOrderView(payload);
  },

  async getEthChallenge(orderId: string, wallet: string): Promise<MembershipEthChallenge> {
    const response = await axiosClient.get<ApiResponse<MembershipEthChallenge>>(
      `/api/v1/membership/orders/${encodeURIComponent(orderId)}/eth/challenge`,
      { params: { wallet } },
    );
    return response.data.result;
  },

  async getEthQuote(orderId: string, challengeId: string, signature: string): Promise<MembershipEthQuote> {
    const response = await axiosClient.post<ApiResponse<MembershipEthQuote>>(
      `/api/v1/membership/orders/${encodeURIComponent(orderId)}/eth/quote`,
      { challengeId, signature },
    );
    return response.data.result;
  },

  async settleEth(orderId: string, paymentId: string, txHash: string): Promise<MembershipOrderView> {
    const response = await axiosClient.post<ApiResponse<MembershipOrderView>>(
      `/api/v1/membership/orders/${encodeURIComponent(orderId)}/eth/settle`,
      { paymentId, txHash },
    );
    return normalizeOrderView(response.data.result);
  },

  async getEthStatus(orderId: string): Promise<MembershipEthStatus> {
    const response = await axiosClient.get<ApiResponse<MembershipEthStatus>>(
      `/api/v1/membership/orders/${encodeURIComponent(orderId)}/eth/status`,
    );
    return response.data.result;
  },
};

export default membershipService;
