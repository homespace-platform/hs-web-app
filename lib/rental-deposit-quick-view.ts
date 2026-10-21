import type { PaymentRequest } from "@/types/payment-request.type";
import type { RentalRequestResponse } from "@/types/rental-request.type";

export function canOpenDepositQuickView(request: Pick<RentalRequestResponse, "status" | "initialPayment">) {
  return request.status !== "PENDING" && !!request.initialPayment?.id;
}

export function selectReservationPayment(payments: PaymentRequest[], rentalRequestId: string) {
  const incoming=payments.filter(p=>p.rentalRequestId===rentalRequestId && p.direction==="TENANT_TO_LANDLORD");
  return incoming.find(p=>p.type==="RESERVATION_DEPOSIT") ?? incoming.find(p=>p.type==="INITIAL") ?? null;
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
