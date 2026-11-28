import axiosClient from "@/lib/axios-client";
import type { ApiResponse } from "@/types/api.type";
import { parseAnalyticsResponse } from "@/lib/landlord-analytics";

export type Money = number | string;
export type DashboardClock = "BILLING" | "REAL";
export type DashboardTask = {
  key: string;
  type: string;
  contextLabel: string | null;
  dueAt: string | null;
  clock: DashboardClock;
  priority: string;
  href: string;
  roomCode?: string | null;
};
type Pending = { count: number; vnd: Money; nextDueAt: string | null };
type Complaint = {
  id: string;
  contractNumber: string | null;
  category: string;
  status: string;
  respondBy: string | null;
  responseDueFor: string;
  href: string | null;
};
export type LandlordSummary = {
  billingNow: string;
  realNow: string;
  month: string;
  errors: Record<string, boolean>;
  setup: { hasReceivingAccount: boolean } | null;
  rooms: {
    total: number;
    occupied: number;
    vacant: number;
    reserved: number;
    other: number;
    byStatus: Record<string, number>;
  } | null;
  listings: {
    published: number;
    pendingReview: number;
    draft: number;
    oldestPendingSince: string | null;
    unplaced: { listings: number; contracts: number };
    needsFix: {
      rejected: number;
      violation: number;
      hidden: number;
      items: {
        id: string;
        title: string;
        status: string;
        reason: string | null;
        updatedAt: string;
        href: string;
      }[];
    };
  } | null;
  revenue: {
    receivedVnd: Money;
    refundedVnd: Money;
    expectedVnd: Money;
    receiptCount: number;
    overdueCount: number;
    overdueVnd: Money;
    depositReceivedVnd: Money;
    awaitingConfirm: Pending;
    rejected: Pending;
    refundsOwed: Pending;
    lateFromPreviousVnd: Money;
    autoConfirmed30d: number;
    lateFeeVnd: Money;
    rolledOverVnd: Money;
    receiptPdfIssues: number;
  } | null;
  todo: {
    total: number;
    urgent: number;
    groups: Record<string, number>;
    items: DashboardTask[];
  } | null;
  contracts: {
    byStatus: Record<string, number>;
    closures: {
      byStatus: Record<string, number>;
      endedNotClosed: number;
      refundVnd: Money;
      nextRefundDueAt: string | null;
    };
    signatureIssues: {
      failed: number;
      pendingConfirm: number;
      nearestExpiresAt: string | null;
    };
    depositAgreements: { waitingSign: number; nextDueAt: string | null };
  } | null;
  expiringContracts:
    | {
        contractId: string;
        contractNumber: string;
        roomCode: string | null;
        tenantName: string | null;
        endDateExclusive: string;
        daysRemaining: number;
        band: string;
        href: string;
      }[]
    | null;
  appointments:
    | {
        id: string;
        at: string;
        listingTitle: string;
        renterName: string;
        status: string;
        href: string;
      }[]
    | null;
  expiringListings:
    | {
        id: string;
        title: string;
        expiresAt: string;
        daysRemaining: number;
        viewCount: number;
        favorites: number;
        noLeads: boolean;
        href: string;
      }[]
    | null;
  membership: {
    tier: string;
    remainingUses: number;
    reservedUses: number;
    expiresAt: string | null;
    quotaResetsAt: string | null;
    addonRemaining: number;
    addonReserved: number;
    addonExpiresAt: string | null;
    unlimited: boolean;
    pendingOrders: number;
    nextOrderExpiresAt: string | null;
    failedOrders30d: number;
    paidVndMonth: Money;
  } | null;
  competing:
    | {
        listingId: string;
        title: string;
        pendingCount: number;
        nextRespondBy: string | null;
        href: string;
      }[]
    | null;
  holds:
    | {
        rentalRequestId: string;
        listingTitle: string;
        renterName: string;
        holdExpiresAt: string;
        waitingFor: string;
        href: string;
      }[]
    | null;
  complaints: {
    openCount: number;
    dueFromMeCount: number;
    items: Complaint[];
  } | null;
};
export type Payable = {
  paymentId: string;
  type: string;
  contractId: string | null;
  contractNumber: string | null;
  listingTitle: string | null;
  invoiceId: string | null;
  periodIndex: number | null;
  amount: Money;
  dueAt: string | null;
  clock: DashboardClock;
  overdue: boolean;
  rejectedReason: string | null;
  href: string;
};
export type TenantSummary = {
  billingNow: string;
  realNow: string;
  timezone: string;
  setup: { onboarded: boolean };
  leases: {
    activeCount: number;
    items: {
      contractId: string;
      contractNumber: string;
      listingId: string | null;
      listingTitle: string | null;
      listingAddress: string | null;
      listingThumbnail: string | null;
      landlordName: string | null;
      startsOn: string | null;
      endExclusive: string | null;
      daysRemaining: number | null;
      expiry: string;
      monthlyRent: Money;
      nextPayment: Payable | null;
      href: string;
    }[];
  };
  payables: {
    overdueCount: number;
    overdueAmount: Money;
    dueSoonAmount: Money;
    next: Payable | null;
    items: Payable[];
    awaiting: {
      count: number;
      amount: Money;
      items: {
        paymentId: string;
        contractNumber: string | null;
        amount: Money;
        payerReportedAt: string | null;
        confirmationDueAt: string | null;
        href: string;
      }[];
    };
    refundsIncoming: {
      count: number;
      amount: Money;
      items: {
        paymentId: string;
        contractNumber: string | null;
        type: string;
        status: string;
        amount: Money;
        dueAt: string | null;
        autoConfirmAt: string | null;
        href: string;
      }[];
    };
  };
  tasks: { total: number; urgentCount: number; items: DashboardTask[] };
  holds: {
    rentalRequestId: string;
    listingTitle: string;
    thumbnail: string | null;
    holdExpiresAt: string;
    remainingSeconds: number;
    critical: boolean;
    amountDue: Money;
    href: string;
  }[];
  visits: {
    upcomingCount: number;
    items: {
      id: string;
      listingId: string;
      listingTitle: string;
      listingAddress: string | null;
      thumbnail: string | null;
      appointmentDate: string;
      startTime: string;
      endTime: string;
      status: string;
      rescheduleRequested: boolean;
      proposedDate: string | null;
      proposedStartTime: string | null;
    }[];
  };
  requests: {
    counts: Record<string, number>;
    open: {
      id: string;
      listingTitle: string;
      thumbnail: string | null;
      status: string;
      createdAt: string;
      respondBy: string | null;
      holdExpiresAt: string | null;
      href: string;
    }[];
  };
  spending: {
    currency: string;
    total: Money;
    totalExcludingDeposit: Money;
    total12m: Money;
    total12mExcludingDeposit: Money;
    months: { month: string; total: Money; byGroup: Record<string, Money> }[];
    receiptPdfIssues: number;
  };
  deposits: {
    heldTotal: Money;
    items: {
      contractId: string;
      contractNumber: string;
      amount: Money;
      status: string;
      closure: {
        status: string;
        refundAmount: Money;
        refundDueAt: string | null;
      } | null;
      href: string;
    }[];
  };
  waiting: {
    count: number;
    items: {
      type: string;
      contractId: string;
      contractNumber: string;
      sentAt: string | null;
      respondBy: string | null;
      clock: DashboardClock;
      href: string;
    }[];
  };
  complaints: { openCount: number; dueFromMeCount: number; items: Complaint[] };
  saved: { total: number; available: number; unavailable: number };
};

/** Preserve money before Axios parses JSON, then restore the four count-only total fields. */
export function parseDashboardSummary(raw: string) {
  const parsed = parseAnalyticsResponse(
    raw.replace(
      /("(?:amount|amountDue|heldTotal|monthlyRent|refundAmount|overdueAmount|dueSoonAmount|total|totalExcludingDeposit|total12m|total12mExcludingDeposit|DEPOSIT_FIRST|RENT|UTILITY_OTHER)"\s*:\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      '$1"$2"',
    ),
  );
  const result = parsed.result;
  for (const group of [
    result?.rooms,
    result?.todo,
    result?.tasks,
    result?.saved,
  ]) {
    if (group?.total !== undefined) group.total = Number(group.total);
  }
  return parsed;
}

export const dashboardSummary = {
  async landlord(month: string, signal: AbortSignal): Promise<LandlordSummary> {
    const { data } = await axiosClient.get<ApiResponse<LandlordSummary>>(
      "/api/v1/dashboard/landlord/summary",
      {
        params: month ? { month } : undefined,
        signal,
        timeout: 30_000,
        transformResponse: [parseDashboardSummary],
      },
    );
    if (!data.result) throw new Error("Missing landlord dashboard summary");
    return data.result;
  },
  async tenant(
    spendMonths: 6 | 12,
    signal: AbortSignal,
  ): Promise<TenantSummary> {
    const { data } = await axiosClient.get<ApiResponse<TenantSummary>>(
      "/api/v1/dashboard/tenant/summary",
      {
        params: { spendMonths },
        signal,
        timeout: 30_000,
        transformResponse: [parseDashboardSummary],
      },
    );
    if (!data.result) throw new Error("Missing tenant dashboard summary");
    return data.result;
  },
};
