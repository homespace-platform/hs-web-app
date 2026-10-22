import type { PaymentRequest } from "@/types/payment-request.type";
import type { RentalRequestResponse } from "@/types/rental-request.type";

export function canOpenDepositQuickView(request: Pick<RentalRequestResponse, "status" | "initialPayment">) {
  return request.status !== "PENDING" && !!request.initialPayment?.id;
}

/** Current actionable receipt, not always the already-confirmed reservation deposit. */
export function selectOnboardingPayment(payments: PaymentRequest[], rentalRequestId: string, paymentId?:string|null) {
  const incoming=payments.filter(p=>p.rentalRequestId===rentalRequestId && p.direction==="TENANT_TO_LANDLORD"
    && ["RESERVATION_DEPOSIT","INITIAL"].includes(p.type));
  if(paymentId)return incoming.find(p=>p.id===paymentId) ?? null;
  return incoming.find(p=>p.type==="INITIAL" && p.status==="TRANSFER_REPORTED")
    ?? incoming.find(p=>p.status==="TRANSFER_REPORTED")
    ?? incoming.find(p=>p.type==="INITIAL") ?? incoming[0] ?? null;
}

export function paymentSummaryTitle(payment:RentalRequestResponse["initialPayment"]) {
  if(payment?.displayName)return payment.displayName;
  return payment?.type==="RESERVATION_DEPOSIT"?"Tiền cọc giữ chỗ":"Khoản thanh toán";
}

export function canReviewReservationReceipt(payment: PaymentRequest, actorId: string | null, isLandlord: boolean) {
  return isLandlord && !!actorId && actorId===payment.payeeId && payment.direction==="TENANT_TO_LANDLORD"
    && ["RESERVATION_DEPOSIT","INITIAL"].includes(payment.type) && payment.status==="TRANSFER_REPORTED";
}

export function reservationPaymentTitle(payment: PaymentRequest) {
  if(payment.type==="RESERVATION_DEPOSIT")return "Tiền cọc giữ chỗ";
  return payment.lineItems?.some(line=>line.type==="DEPOSIT") ? "Cọc + tiền thuê tháng đầu" : "Tiền thuê tháng đầu";
}

export function reservationPaymentStatus(payment: PaymentRequest) {
  if(payment.type==="RESERVATION_DEPOSIT" && payment.totalAmount===0 && payment.status==="CONFIRMED")return "Miễn cọc · Không cần chuyển khoản";
  return ({AWAITING_TRANSFER:"Chờ khách chuyển khoản",TRANSFER_REPORTED:"Đã báo chuyển · Chờ bạn xác nhận",
    CONFIRMED:"Đã xác nhận nhận đủ tiền",REJECTED:"Chứng từ chưa được chấp nhận",DISPUTED:"Cần đối soát",
    CANCELLED:"Đã hủy",EXPIRED:"Đã hết hạn",OVERDUE:"Đã quá hạn"} as Record<string,string>)[payment.status] ?? "Chưa xác định trạng thái";
}
