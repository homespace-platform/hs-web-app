import type { MembershipReceipt } from "@/services/membership-receipt.service";

export const providerName = (p?: string | null) =>
  p === "ETH" ? "Ví ETH" : p === "SEPAY" ? "SePay" : (p ?? "—");

export const membershipMoney = (r: Pick<MembershipReceipt, "currency" | "totalAmount">) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: r.currency }).format(r.totalAmount);

export const membershipStatusLabel = (r: Pick<MembershipReceipt, "type" | "refundStatus">) =>
  r.type === "OVERPAYMENT"
    ? r.refundStatus === "REFUNDED" ? "Đã hoàn tiền" : "Trả thừa – sẽ được hoàn lại"
    : "Đã thanh toán";
