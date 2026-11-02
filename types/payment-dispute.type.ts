import type { PaymentDirection, PaymentStatus, PaymentType } from "./payment-request.type";
export type DisputeResolution = "REVIEW_TRANSFER" | "REOPEN_TRANSFER";
export type DisputeAction = "COMMENT" | "PROPOSE" | "ACCEPT" | "DECLINE" | "ESCALATE" | "CLAIM" | "DECIDE";
export interface PaymentDisputeCase {
  id: string; paymentId: string; rentalRequestId?: string; contractId?: string;
  payerId: string; payeeId: string; openedBy: string; reason: string; openedAt: string;
  status: "OPEN" | "ESCALATED" | "RESOLVED"; previousPaymentStatus?: PaymentStatus; paymentStatus: PaymentStatus;
  paymentType: PaymentType; direction: PaymentDirection; amount: number; currency: string; revision: number;
  proposedBy?: string; proposedResolution?: DisputeResolution; proposalReason?: string; assignedTo?: string;
  resolvedBy?: string; resolution?: DisputeResolution; resolutionReason?: string; resolvedAt?: string;
  allowedActions: DisputeAction[];
  events: { revision: number; action: string; actorId: string; actorRole: string; reason: string; evidenceStorageId?: string; metadataJson?: string; occurredAt: string }[];
  evidences: { storageId: string; uploadedBy: string; note?: string; createdAt?: string }[];
}
export interface DisputeCaseActionPayload { expectedRevision: number; reason: string; resolution?: DisputeResolution; evidenceStorageId?: string }
export const disputeResolutionLabels: Record<DisputeResolution,string> = {
  REVIEW_TRANSFER: "Kiểm tra chứng từ để bên nhận xác nhận tiền",
  REOPEN_TRANSFER: "Mở lại bước gửi chứng từ / báo chuyển tiền",
};
export const disputeActionLabels: Record<string,string> = {
  OPENED:"Mở đối soát", LEGACY_ADOPTED:"Tiếp nhận khoản đang đối soát", COMMENT:"Bổ sung phản hồi / chứng cứ",
  PROPOSE:"Đề xuất hướng xử lý", ACCEPT:"Đồng ý đề xuất", DECLINE:"Chưa đồng ý đề xuất",
  ESCALATE:"Chuyển quản trị viên", CLAIM:"Tiếp nhận xử lý", DECIDE:"Quyết định hướng xử lý",
};
export function disputeEventResolution(metadata?: string): string | undefined {
  try { const value: unknown = JSON.parse(metadata ?? "{}").resolution; return value === "REVIEW_TRANSFER" || value === "REOPEN_TRANSFER" ? disputeResolutionLabels[value] : undefined; }
  catch { return undefined; }
}
