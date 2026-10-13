import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import type { PaymentStatus } from "@/types/payment-request.type";

type InvoiceState = Pick<MonthlyInvoice, "status" | "workflowState">;
type InvoicePeriod = Pick<MonthlyInvoice, "periodIndex" | "finalCostSupplement" | "billingPeriod">
  & Partial<Pick<MonthlyInvoice, "status" | "lines">>;
export function invoicePeriodLabel(invoice: InvoicePeriod) {
  if (invoice.finalCostSupplement || invoice.billingPeriod?.kind === "SUPPLEMENT") return "Bổ sung chi phí kỳ cuối";
  if (invoice.billingPeriod?.kind === "FINAL_SETTLEMENT") return "Quyết toán cuối hợp đồng";
  if (invoice.billingPeriod?.kind === "RECURRING") return `Kỳ thanh toán ${invoice.billingPeriod.paymentPeriodNumber}`;
  // Compatibility during rolling deployment: never guess the final month from a fixed lease length.
  if (invoice.status && invoice.status !== "DRAFT" && invoice.lines?.length) {
    return invoice.lines.some(line => line.type === "RENT")
      ? `Kỳ thanh toán ${invoice.periodIndex + 2}` : "Quyết toán cuối hợp đồng";
  }
  return `Chi phí tháng ${invoice.periodIndex + 1} · Chờ thông tin kỳ thanh toán`;
}
const styles = {
  draft: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  unpaid: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  overdue: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  pending: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  rolled: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

/** Display-only: reported payment is not a confirmed receipt and never changes invoice accounting. */
export function invoiceStatusPresentation(invoice: InvoiceState, paymentStatus?: PaymentStatus) {
  if (invoice.status === "DRAFT") return { label: "Chờ phát hành", className: styles.draft };
  if (invoice.status === "ROLLED_OVER") return { label: "Đã chuyển nợ", className: styles.rolled };
  if (invoice.status === "PAID" || paymentStatus === "CONFIRMED") return { label: "Đã thanh toán", className: styles.paid };
  if (paymentStatus === "TRANSFER_REPORTED") return { label: "Đã thanh toán · Chờ xác nhận", className: styles.pending };
  if (paymentStatus === "DISPUTED") return { label: "Đang đối soát thanh toán", className: styles.overdue };
  if (paymentStatus === "REJECTED") return { label: "Chứng từ bị từ chối", className: styles.overdue };
  // If the payment read failed, UNDER_REVIEW alone cannot distinguish a submitted proof from a dispute.
  if (!paymentStatus && invoice.workflowState === "UNDER_REVIEW") return { label: "Chờ xác nhận / đối soát", className: styles.pending };
  return invoice.status === "OVERDUE"
    ? { label: "Quá hạn", className: styles.overdue }
    : { label: "Chưa thanh toán", className: styles.unpaid };
}
