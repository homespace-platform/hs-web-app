import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import type { PaymentStatus } from "@/types/payment-request.type";

type InvoiceState = Pick<MonthlyInvoice, "status" | "workflowState">;
type InvoicePeriod = Pick<MonthlyInvoice, "periodIndex" | "finalCostSupplement" | "billingPeriod">
  & Partial<Pick<MonthlyInvoice, "status" | "lines" | "periodStart">>;

const styles = {
  draft: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  unpaid: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  overdue: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  pending: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  rolled: "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  unknown: "border-border bg-muted/50 text-muted-foreground",
};

export function invoicePeriodLabel(invoice: InvoicePeriod) {
  if (invoice.finalCostSupplement || invoice.billingPeriod?.kind === "SUPPLEMENT") {
    return "Chi phí bổ sung kỳ cuối";
  }
  if (invoice.billingPeriod?.kind === "FINAL_SETTLEMENT") {
    return "Chi phí cuối hợp đồng";
  }
  if (invoice.billingPeriod?.kind === "RECURRING") {
    const number = invoice.billingPeriod.paymentPeriodNumber;
    if (number === 1) return "Cọc + tiền phòng tháng 1";
    return `Kỳ thanh toán ${number}`;
  }
  // Compatibility during rolling deployment: never guess the final month from a fixed lease length.
  if (invoice.status && invoice.status !== "DRAFT" && invoice.lines?.length) {
    return invoice.lines.some((line) => line.type === "RENT")
      ? `Kỳ thanh toán ${invoice.periodIndex + 2}`
      : "Chi phí cuối hợp đồng";
  }
  return `Chi phí tháng ${invoice.periodIndex + 1} · Chờ thông tin kỳ thanh toán`;
}

/** Short supporting line for recurring periods; dates belong in an accessible details/tooltip. */
export function invoicePeriodSecondaryLabel(invoice: InvoicePeriod): string | null {
  if (invoice.billingPeriod?.kind !== "RECURRING") return null;
  const rentMonth = invoice.billingPeriod.paymentPeriodNumber;
  if (!rentMonth || rentMonth < 2) return null;
  return `Tiền phòng tháng ${rentMonth} + chi phí tháng ${rentMonth - 1}`;
}

export function invoicePeriodDateSummary(invoice: Pick<MonthlyInvoice, "periodStart" | "periodEndExclusive" | "billingPeriod">): string {
  const cost = `Chi phí: ${formatInvoiceDate(invoice.periodStart)} – trước ${formatInvoiceDate(invoice.periodEndExclusive)}`;
  if (invoice.billingPeriod?.kind !== "RECURRING") return cost;
  const rent = `Tiền phòng: ${formatInvoiceDate(invoice.billingPeriod.rentPeriodStart || undefined)} – trước ${formatInvoiceDate(invoice.billingPeriod.rentPeriodEndExclusive || undefined)}`;
  return `${cost}. ${rent}`;
}

export function formatInvoiceDate(value?: string | null) {
  if (!value) return "—";
  const iso = value.includes("T") ? value : `${value}T00:00:00+07:00`;
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}

export function formatInvoiceMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Display-only: reported payment is not a confirmed receipt and never changes invoice accounting. */
export function invoiceStatusPresentation(
  invoice: InvoiceState,
  paymentStatus?: PaymentStatus | null,
  options?: { paymentLoadFailed?: boolean },
) {
  if (invoice.status === "DRAFT") {
    return { label: "Nháp / Chờ phát hành", className: styles.draft, kind: "draft" as const };
  }
  if (invoice.status === "ROLLED_OVER") {
    return { label: "Đã chuyển nợ", className: styles.rolled, kind: "rolled" as const };
  }
  if (invoice.status === "PAID" || paymentStatus === "CONFIRMED") {
    return { label: "Đã thanh toán", className: styles.paid, kind: "paid" as const };
  }
  if (paymentStatus === "TRANSFER_REPORTED") {
    return { label: "Đã thanh toán · Chờ xác nhận", className: styles.pending, kind: "awaiting_confirm" as const };
  }
  if (paymentStatus === "DISPUTED") {
    return { label: "Đang đối soát", className: styles.overdue, kind: "disputed" as const };
  }
  if (paymentStatus === "REJECTED") {
    return { label: "Chứng từ bị từ chối", className: styles.overdue, kind: "rejected" as const };
  }
  if (!paymentStatus && invoice.workflowState === "UNDER_REVIEW") {
    if (options?.paymentLoadFailed) {
      return { label: "Chưa xác định trạng thái thanh toán", className: styles.unknown, kind: "unknown" as const };
    }
    return { label: "Chờ xác nhận / đối soát", className: styles.pending, kind: "awaiting_confirm" as const };
  }
  if (invoice.status === "OVERDUE") {
    return { label: "Quá hạn", className: styles.overdue, kind: "overdue" as const };
  }
  return { label: "Chưa thanh toán", className: styles.unpaid, kind: "unpaid" as const };
}
