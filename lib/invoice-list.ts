import type { DashboardRole } from "@/lib/dashboard-role";
import { invoiceDetailPath } from "@/lib/contract-routes";
import {
  invoicePeriodLabel,
  invoiceStatusPresentation,
} from "@/lib/invoice-status";
import type { ContractResponse } from "@/types/contract.type";
import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import type { PaymentRequest, PaymentStatus } from "@/types/payment-request.type";

export type InvoiceListTab = "all" | "needs_action" | "awaiting_confirm" | "completed";

export type InvoiceListRow = {
  key: string;
  contract: ContractResponse;
  invoice: MonthlyInvoice;
  paymentStatus?: PaymentStatus | null;
  paymentLoadFailed: boolean;
  invoiceLoadFailed: boolean;
};

export function findInvoicePayment(
  invoice: MonthlyInvoice,
  payments: PaymentRequest[],
): PaymentRequest | undefined {
  return payments.find(
    (item) => item.invoiceId === invoice.id || item.id === invoice.paymentRequestId,
  );
}

export function invoiceNeedsAction(
  role: DashboardRole,
  invoice: Pick<MonthlyInvoice, "status" | "workflowState" | "paymentExtensions" | "activeResolution">,
  paymentStatus?: PaymentStatus | null,
): boolean {
  if (["ROLLED_OVER","PAID","CANCELLED"].includes(invoice.status)) return false;

  const hasPendingExtension =
    invoice.activeResolution === "EXTENSION_REQUEST"
    || (invoice.paymentExtensions || []).some((item) => item.status === "PENDING");

  if (role === "landlord") {
    if (invoice.status === "DRAFT") return true;
    if (paymentStatus === "TRANSFER_REPORTED") return true;
    if (paymentStatus === "DISPUTED") return true;
    if (hasPendingExtension) return true;
    if (!paymentStatus && invoice.workflowState === "UNDER_REVIEW") return true;
    return false;
  }

  if (paymentStatus === "TRANSFER_REPORTED") return false;
  if (paymentStatus === "REJECTED") return true;
  if (paymentStatus === "DISPUTED") return true;
  if (invoice.status === "UNPAID" || invoice.status === "OVERDUE") return true;
  if (invoice.workflowState === "EXTENSION_PENDING") return true;
  return false;
}

export function invoiceAwaitingConfirmation(
  role: DashboardRole,
  invoice: Pick<MonthlyInvoice, "status" | "workflowState">,
  paymentStatus?: PaymentStatus | null,
): boolean {
  if (["PAID","ROLLED_OVER","DRAFT","CANCELLED"].includes(invoice.status)) {
    return false;
  }
  if (paymentStatus === "TRANSFER_REPORTED") {
    // Landlord must confirm → needs_action, not this waiting tab.
    return role === "tenant";
  }
  if (!paymentStatus && invoice.workflowState === "UNDER_REVIEW") {
    return role === "tenant";
  }
  return false;
}

export function invoiceCompleted(
  invoice: Pick<MonthlyInvoice, "status">,
  paymentStatus?: PaymentStatus | null,
): boolean {
  return invoice.status === "PAID"
    || invoice.status === "CANCELLED"
    || invoice.status === "ROLLED_OVER"
    || paymentStatus === "CONFIRMED";
}

export function invoiceMatchesListTab(
  tab: InvoiceListTab,
  role: DashboardRole,
  invoice: MonthlyInvoice,
  paymentStatus?: PaymentStatus | null,
): boolean {
  if (tab === "all") return true;
  if (tab === "needs_action") return invoiceNeedsAction(role, invoice, paymentStatus);
  if (tab === "awaiting_confirm") return invoiceAwaitingConfirmation(role, invoice, paymentStatus);
  return invoiceCompleted(invoice, paymentStatus);
}

export function compareInvoiceListRows(role: DashboardRole, a: InvoiceListRow, b: InvoiceListRow): number {
  const aNeeds = invoiceNeedsAction(role, a.invoice, a.paymentStatus) ? 0 : 1;
  const bNeeds = invoiceNeedsAction(role, b.invoice, b.paymentStatus) ? 0 : 1;
  if (aNeeds !== bNeeds) return aNeeds - bNeeds;

  const aDone = invoiceCompleted(a.invoice, a.paymentStatus) ? 1 : 0;
  const bDone = invoiceCompleted(b.invoice, b.paymentStatus) ? 1 : 0;
  if (aDone !== bDone) return aDone - bDone;

  const aDue = dueSortKey(a.invoice);
  const bDue = dueSortKey(b.invoice);
  if (aDue !== bDue) return aDue < bDue ? -1 : 1;

  const contractCmp = a.contract.contractNumber.localeCompare(b.contract.contractNumber, "vi");
  if (contractCmp !== 0) return contractCmp;
  return a.invoice.periodIndex - b.invoice.periodIndex;
}

function dueSortKey(invoice: MonthlyInvoice): string {
  return invoice.dueAt || invoice.originalDueAt || invoice.periodEndExclusive || "9999-12-31";
}

/** Filter by calendar month of issuedAt in Vietnam time. Drafts without issuedAt never match. */
export function invoiceMatchesIssuedMonth(invoice: Pick<MonthlyInvoice, "issuedAt">, month?: string): boolean {
  if (!month) return true;
  if (!invoice.issuedAt) return false;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(invoice.issuedAt));
  const year = parts.find((part) => part.type === "year")?.value;
  const monthPart = parts.find((part) => part.type === "month")?.value;
  if (!year || !monthPart) return false;
  return `${year}-${monthPart}` === month;
}

export function invoiceMatchesSearch(
  row: InvoiceListRow,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const haystack = [
    row.contract.contractNumber,
    invoicePeriodLabel(row.invoice),
    row.invoice.id,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

export function buildInvoiceListRows(input: {
  contract: ContractResponse;
  invoices: MonthlyInvoice[];
  payments: PaymentRequest[];
  invoiceLoadFailed: boolean;
  paymentLoadFailed: boolean;
}): InvoiceListRow[] {
  return input.invoices.map((invoice) => {
    const payment = findInvoicePayment(invoice, input.payments);
    return {
      key: invoice.id,
      contract: input.contract,
      invoice,
      paymentStatus: payment?.status ?? null,
      paymentLoadFailed: input.paymentLoadFailed,
      invoiceLoadFailed: input.invoiceLoadFailed,
    };
  });
}

export function countInvoiceTabs(
  role: DashboardRole,
  rows: InvoiceListRow[],
): Record<InvoiceListTab, number> {
  return {
    all: rows.length,
    needs_action: rows.filter((row) => invoiceNeedsAction(role, row.invoice, row.paymentStatus)).length,
    awaiting_confirm: rows.filter((row) => invoiceAwaitingConfirmation(role, row.invoice, row.paymentStatus)).length,
    completed: rows.filter((row) => invoiceCompleted(row.invoice, row.paymentStatus)).length,
  };
}

export function presentationForRow(row: InvoiceListRow) {
  return invoiceStatusPresentation(row.invoice, row.paymentStatus, {
    paymentLoadFailed: row.paymentLoadFailed,
  });
}

export type InvoiceListAction = {
  label: string;
  href: string;
};

export function invoiceListAction(
  role: DashboardRole,
  invoice: Pick<MonthlyInvoice, "id" | "contractId" | "status" | "workflowState" | "rolledToInvoiceId">,
  paymentStatus?: PaymentStatus | null,
): InvoiceListAction {
  const href = invoiceDetailPath(invoice.contractId);
  const presentation = invoiceStatusPresentation(invoice, paymentStatus);

  if (role === "landlord") {
    if (presentation.kind === "draft") return { label: "Chốt chỉ số", href };
    if (presentation.kind === "awaiting_confirm") return { label: "Xác nhận thanh toán", href };
    if (presentation.kind === "overdue") return { label: "Xem xử lý quá hạn", href };
    if (presentation.kind === "disputed") return { label: "Xem đối soát", href };
    return { label: "Xem hóa đơn", href };
  }

  if (presentation.kind === "unpaid" || presentation.kind === "overdue") {
    return { label: "Thanh toán", href };
  }
  if (presentation.kind === "awaiting_confirm") return { label: "Xem chứng từ", href };
  if (presentation.kind === "rejected") return { label: "Xem lý do", href };
  if (presentation.kind === "rolled" && invoice.rolledToInvoiceId) {
    return { label: "Xem hóa đơn nhận nợ", href };
  }
  return { label: "Xem hóa đơn", href };
}
