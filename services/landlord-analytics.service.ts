import axiosClient from "@/lib/axios-client";
import {
  parseAnalyticsResponse,
  type AnalyticsFilters,
  type AnalyticsMoney,
  type AnalyticsReport,
} from "@/lib/landlord-analytics";
import type { ApiResponse } from "@/types/api.type";

export interface RevenueMonth {
  month: string;
  receivedVnd: AnalyticsMoney;
  refundedVnd: AnalyticsMoney;
  netVnd: AnalyticsMoney;
  dueVnd: AnalyticsMoney;
  dueCollectedVnd: AnalyticsMoney;
  lateCollectedVnd: AnalyticsMoney;
  lateFeeVnd: AnalyticsMoney;
  rolledOverVnd: AnalyticsMoney;
  membershipFeeVnd: AnalyticsMoney;
}

export interface LandlordAnalytics {
  billingNow: string;
  from: string;
  to: string;
  receiptsSince: string | null;
  revenue: RevenueMonth[] | null;
  occupancy:
    | {
        month: string;
        rooms: number;
        occupiedRoomDays: number;
        roomDays: number;
        rate: number | null;
      }[]
    | null;
  receivables: {
    asOf: string;
    totalVnd: AnalyticsMoney;
    count: number;
    buckets: { key: string; count: number; vnd: AnalyticsMoney }[];
    top: {
      paymentId: string;
      contractNumber: string | null;
      roomCode: string | null;
      tenantName: string | null;
      dueAt: string;
      daysLate: number;
      amountVnd: AnalyticsMoney;
      status: string;
      href: string;
    }[];
  } | null;
  listings: {
    viewsSince: string | null;
    page: number;
    size: number;
    total: number;
    items: {
      id: string;
      title: string;
      branchName: string | null;
      status: string;
      publishedAt: string | null;
      expiresAt: string | null;
      viewCountTotal: number;
      viewsInRange: number | null;
      appointments: number;
      requests: number;
      contracts: number;
      favorites: number;
      noLeads: boolean;
      viewToRequestRate: number | null;
    }[];
    dailyViews: { day: string; views: number }[];
  } | null;
  funnel: {
    views: { value: number; cumulative: boolean; since: string | null };
    appointments: number;
    requests: number;
    contracts: number;
  } | null;
}

export type AnalyticsQuery = Partial<AnalyticsFilters> & {
  listingPage?: number;
  listingSize?: number;
  noLeadsOnly?: boolean;
};

function queryParams(query: AnalyticsQuery) {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== "" && value != null),
  );
}

export const landlordAnalyticsService = {
  async get(
    query: AnalyticsQuery,
    signal?: AbortSignal,
  ): Promise<LandlordAnalytics> {
    const response = await axiosClient.get<ApiResponse<LandlordAnalytics>>(
      "/api/v1/dashboard/analytics",
      {
        params: queryParams(query),
        signal,
        transformResponse: [
          (raw) =>
            typeof raw === "string" ? parseAnalyticsResponse(raw) : raw,
        ],
      },
    );
    return response.data.result;
  },
  async export(
    query: AnalyticsQuery,
    report: AnalyticsReport,
    format: "csv" | "pdf",
    granularity: "month" | "receipt",
  ) {
    const response = await axiosClient.get<Blob>(
      "/api/v1/dashboard/analytics/export",
      {
        params: {
          ...queryParams(query),
          report,
          format,
          ...(report === "revenue" ? { granularity } : {}),
        },
        responseType: "blob",
      },
    );
    if (!response.data.size)
      throw new Error("Báo cáo chưa có nội dung. Vui lòng thử lại.");
    return response.data;
  },
};
