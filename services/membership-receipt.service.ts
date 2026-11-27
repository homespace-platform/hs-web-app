import axiosClient from "@/lib/axios-client";
import type { ApiResponse, PageResponse } from "@/types/api.type";

export interface MembershipReceipt {
  id: string;
  orderId: string;
  receiptNumber: string;
  itemName: string;
  kind: "PLAN" | "ADDON";
  tier?: string | null;
  quantity: number;
  periodDays: number;
  totalAmount: number;
  currency: string;
  provider?: "SEPAY" | "ETH" | "VNPAY" | null;
  transactionRef?: string | null;
  issuedAt: string;
  pdfStatus: "PENDING" | "READY" | "FAILED";
  /** OVERPAYMENT: duplicate payment, not applied, refunded to the payer. Absent = normal receipt. */
  type?: "PURCHASE" | "OVERPAYMENT" | null;
  refundStatus?: "REFUND_PENDING" | "REFUNDED" | null;
  note?: string | null;
}

const base = "/api/v1/membership/receipts";

/** Decode the JSON-wrapped PDF bytes; anything that is not a PDF is an error. */
export function decodePdf(result: unknown): Blob {
  let bytes = "";
  try {
    if (typeof result === "string") bytes = atob(result);
  } catch { /* Treat invalid content like an empty response. */ }
  if (!bytes.startsWith("%PDF-")) {
    throw new Error("Không nhận được nội dung biên nhận PDF. Vui lòng thử lại.");
  }
  return new Blob([Uint8Array.from(bytes, (byte) => byte.charCodeAt(0))], {
    type: "application/pdf",
  });
}

export const membershipReceiptService = {
  async list(params: { page?: number; size?: number }) {
    return (await axiosClient.get<PageResponse<MembershipReceipt>>(base, { params })).data;
  },
  async byOrder(orderId: string) {
    return (
      await axiosClient.get<ApiResponse<MembershipReceipt>>(
        `${base}/by-order/${encodeURIComponent(orderId)}`,
      )
    ).data.result;
  },
  async retry(id: string) {
    return (
      await axiosClient.post<ApiResponse<MembershipReceipt>>(
        `${base}/${encodeURIComponent(id)}/retry`,
      )
    ).data.result;
  },
  async pdf(id: string) {
    const { data } = await axiosClient.get<ApiResponse<string>>(
      `${base}/${encodeURIComponent(id)}/content`,
    );
    return decodePdf(data?.result);
  },
};
