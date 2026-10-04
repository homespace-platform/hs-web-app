export type MonthlyInvoiceStatus = "DRAFT" | "UNPAID" | "OVERDUE" | "PAID";

export interface InvoiceLine {
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface MonthlyInvoice {
  id: string;
  contractId: string;
  periodIndex: number;
  periodStart: string;
  periodEndExclusive: string;
  status: MonthlyInvoiceStatus;
  electricityStart?: number;
  electricityEnd?: number;
  waterStart?: number;
  waterEnd?: number;
  lines: InvoiceLine[];
  totalAmount: number;
  paymentRequestId?: string;
  issuedAt?: string;
  dueAt?: string;
  paidAt?: string;
  lateFeeAmount: number;
  serverNow: string;
  meterDeadlineAt: string;
  workflowState: "UPCOMING" | "METER_REQUIRED" | "READY_FOR_ISSUE" | "METER_DEADLINE_MISSED" | "UNPAID" | "PAYMENT_REMINDER" | "OVERDUE" | "OVERDUE_ACTION_REQUIRED" | "UNDER_REVIEW" | "PAID";
  draftExtraCharges: { description: string; amount: number }[];
}

export interface IssueMonthlyInvoicePayload {
  electricityEnd?: number;
  waterEnd?: number;
  extraCharges: { description: string; amount: number }[];
}
