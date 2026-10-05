export type MonthlyInvoiceStatus = "DRAFT" | "UNPAID" | "OVERDUE" | "PAID" | "ROLLED_OVER";

export interface InvoiceLine {
  type: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export type OverdueActionType = "PAYMENT_REQUEST" | "EXTENSION_PROPOSAL" |
  "MUTUAL_TERMINATION_PROPOSAL" | "LEGAL_REVIEW";

export interface OverdueAction {
  id: string;
  type: OverdueActionType;
  note: string;
  proposedDate?: string;
  createdAt: string;
  createdBy: string;
  tenantAcknowledgment?: string;
  acknowledgedAt?: string;
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
  workflowState: "UPCOMING" | "METER_REQUIRED" | "READY_FOR_ISSUE" | "METER_DEADLINE_MISSED" | "UNPAID" | "PAYMENT_REMINDER" | "OVERDUE" | "OVERDUE_ACTION_REQUIRED" | "UNDER_REVIEW" | "PAID" | "DEFERRED" | "ROLLED_OVER";
  draftExtraCharges: { description: string; amount: number }[];
  overdueActions: OverdueAction[];
  deferredAt?: string;
  rolledToInvoiceId?: string;
  terminationProposedAt?: string;
  terminationProposalInvoiceId?: string;
  terminationAcceptedAt?: string;
  terminationDeclinedAt?: string;
  terminationCancelledAt?: string;
  terminationCompletedAt?: string;
  terminationForcedAt?: string;
  landlordTerminationClauseSigned: boolean;
  retainedDepositAmount?: number;
  originalDepositAmount?: number;
  canDeferToNextPeriod: boolean;
}

export interface IssueMonthlyInvoicePayload {
  electricityEnd?: number;
  waterEnd?: number;
  extraCharges: { description: string; amount: number }[];
}
