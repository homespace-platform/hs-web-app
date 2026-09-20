export type PaymentStatus =
  | "AWAITING_TRANSFER"
  | "TRANSFER_REPORTED"
  | "CONFIRMED"
  | "REJECTED"
  | "DISPUTED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentType =
  | "INITIAL"
  | "MONTHLY_RENT"
  | "DEPOSIT_REFUND"
  | "COMPENSATION";

export type PaymentDirection = "TENANT_TO_LANDLORD" | "LANDLORD_TO_TENANT";

export interface BankAccountSnapshot {
  bankBin: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

export interface PaymentLineItem {
  id: string;
  type: string;
  displayName: string;
  amount: number;
  quantity: number;
  unitPrice: number;
  sortOrder: number;
}

export interface PaymentEvidence {
  id: string;
  uploadedBy: string;
  storageObjectId: string;
  declaredTransferTime?: string;
  bankTransactionReference?: string;
  payerAccountLast4?: string;
  note?: string;
  createdAt: string;
}

export interface PaymentEvent {
  id: string;
  eventType: string;
  fromStatus?: string;
  toStatus: string;
  actorId: string;
  actorRole: string;
  description?: string;
  metadataJson?: string;
  createdAt: string;
}

export interface PaymentRequest {
  id: string;
  rentalRequestId: string;
  listingId: string;
  payerId: string;
  payeeId: string;
  type: PaymentType;
  direction: PaymentDirection;
  status: PaymentStatus;
  currency: string;
  totalAmount: number;
  transferReference: string;
  payerAccount: BankAccountSnapshot;
  payeeAccount: BankAccountSnapshot;
  qrImageUrl: string;
  qrProvider: string;
  payerReportedAt?: string;
  payeeConfirmedAt?: string;
  confirmedAt?: string;
  dueAt?: string;
  confirmationDueAt?: string;
  contractDueAt?: string;
  bankTransactionReference?: string;
  lineItems: PaymentLineItem[];
  evidenceList: PaymentEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportTransferPayload {
  declaredTransferTime?: string;
  bankTransactionReference?: string;
  payerAccountLast4?: string;
  proofStorageId?: string;
  note?: string;
}

export interface RejectReceiptPayload {
  reason: string;
}

export interface DisputePaymentPayload {
  reason: string;
}
