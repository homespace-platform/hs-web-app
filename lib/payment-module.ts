import type { ContractStatus } from "@/types/contract.type";
import type { ContractLifecycle } from "@/types/contract-lifecycle.type";
import type { MonthlyInvoice } from "@/types/monthly-invoice.type";
import type { PaymentRequest, PaymentStatus } from "@/types/payment-request.type";
import type { DashboardRole } from "@/lib/dashboard-role";
import type { RentalOnboarding } from "@/services/rental-onboarding.service";
import { invoiceNeedsAction, findInvoicePayment } from "@/lib/invoice-list";
import { invoiceDetailPath } from "@/lib/contract-routes";
export type PaymentSection = "monthly" | "deposit";
export type PaymentSummary = { label: string; detail: string; amount?: number; tone: "success" | "warning" | "info" | "muted" };
export const paymentSections: { id: PaymentSection; title: string; description: string }[] = [
  { id: "monthly", title: "Hóa đơn theo kỳ", description: "Từ tiền thuê tháng 1 đến chi phí cuối hợp đồng" },
  { id: "deposit", title: "Cọc & hoàn cọc", description: "Bổ sung/hoàn chênh lệch, bàn giao và quyết toán" },
];
export function paymentSection(value: string | null): PaymentSection { return value === "deposit" ? value : "monthly"; }
export function paymentModulePath(id: string, section: PaymentSection, invoiceId?: string) {
  const query = new URLSearchParams({ section });
  if (invoiceId) query.set("invoice", invoiceId);
  return `${invoiceDetailPath(id)}?${query}`;
}
export const contractStateLabels: Record<ContractStatus, string> = {
  ACTIVE: "Đang thuê", EXPIRED: "Đã hết thời hạn thuê", CLOSED: "Đã kết thúc hợp đồng", TERMINATED: "Đã chấm dứt",
  DRAFT: "Bản nháp", PENDING_REVIEW: "Chờ xác nhận / ký", LANDLORD_SIGNATURE_PENDING: "Chờ chủ nhà ký",
  TENANT_SIGNATURE_PENDING: "Chờ người thuê ký", CANCELLED: "Đã hủy",
};
export function initialSummary(payment?: PaymentRequest): PaymentSummary {
  if (!payment) return { label: "Chưa tải được", detail: "Mở để tải lại thanh toán ban đầu", tone: "muted" };
  const labels: Record<PaymentStatus, string> = { CONFIRMED: "Đã xác nhận thanh toán", TRANSFER_REPORTED: "Chờ xác nhận nhận tiền",
    AWAITING_TRANSFER: "Chờ thanh toán", OVERDUE: "Quá hạn", REJECTED: "Chứng từ bị từ chối", DISPUTED: "Đang đối soát", EXPIRED: "Đã hết hạn", CANCELLED: "Đã hủy" };
  return { label: labels[payment.status], detail: "Cọc + tiền phòng tháng 1", amount: payment.totalAmount,
    tone: payment.status === "CONFIRMED" ? "success" : payment.status === "TRANSFER_REPORTED" ? "info" : "warning" };
}
export function monthlySummary(bills?: MonthlyInvoice[], payments?: PaymentRequest[]): PaymentSummary {
  if (!bills || !payments) return { label: "Chưa tải đủ dữ liệu", detail: "Mở để tải lại hóa đơn / trạng thái chuyển khoản", tone: "muted" };
  if (!bills.length) return { label: "Chưa đến kỳ thu", detail: "Hóa đơn xuất hiện khi đến kỳ chốt chỉ số", tone: "muted" };
  let due = 0, pending = 0, drafts = 0, unresolved = 0;
  for (const bill of bills) {
    if (["PAID","ROLLED_OVER","CANCELLED"].includes(bill.status)) continue;
    const status = findInvoicePayment(bill, payments)?.status;
    if (status === "CONFIRMED") continue;
    unresolved++;
    if (bill.status === "DRAFT") drafts++;
    else if (status === "TRANSFER_REPORTED" || bill.workflowState === "UNDER_REVIEW") pending += bill.totalAmount;
    else due += bill.totalAmount;
  }
  if (due > 0) return { label: "Còn khoản cần thanh toán", amount: due, detail: pending > 0 ? "Có thêm khoản đang chờ xác nhận" : `${bills.length} hóa đơn trong hợp đồng`, tone: "warning" };
  if (pending > 0) return { label: "Chờ xác nhận / đối soát", amount: pending, detail: "Đã báo chuyển khoản hoặc đang đối soát", tone: "info" };
  if (drafts) return { label: "Cần chốt chỉ số", detail: `${drafts} hóa đơn nháp`, tone: "warning" };
  if (unresolved) return { label: "Cần kiểm tra", detail: "Mở hóa đơn để xem trạng thái mới nhất", tone: "warning" };
  return { label: "Đã thanh toán đủ", detail: `${bills.length} hóa đơn đã hoàn tất / chuyển nợ`, tone: "success" };
}
export function depositSummary(data?: ContractLifecycle, onboarding?: RentalOnboarding): PaymentSummary {
  const deposit=onboarding?.deposit;
  if(deposit?.status === "RETAINED_BY_LANDLORD") return {label:"Chủ nhà đã giữ cọc",amount:deposit.retainedAmount,detail:deposit.retainedReason || "Đã chốt xử lý vi phạm trước khi thuê",tone:"info"};
  if(!data?.closure && deposit) return {label:deposit.status === "REFUNDED" ? "Đã hoàn cọc" : deposit.status === "HELD" ? "Đang giữ cọc" : deposit.status === "PENDING" ? "Chưa xác nhận cọc" : "Cọc cần xử lý / hoàn trả",amount:deposit.heldAmount,detail:"Xem trạng thái, chứng từ và nghĩa vụ hoàn tiền",tone:"info"};
  if (!data) return { label: "Chưa tải được", detail: "Mở hồ sơ hoàn cọc để kiểm tra", tone: "muted" };
  const closure = data.closure;
  if (!closure) return { label: "Đang giữ cọc", detail: "Hoàn cọc sau khi kết thúc thuê và bàn giao", amount: data.heldDeposit, tone: "muted" };
  const payment = data.refundPayment || data.balancePayment;
  const amount = payment?.totalAmount ?? (closure.balanceAmount ? closure.balanceAmount : closure.refundAmount);
  if (closure.status === "CLOSED") return { label: "Đã hoàn tất", amount, detail: data.balancePayment ? "Đã nhận khoản còn thiếu" : data.refundPayment ? "Người thuê đã xác nhận nhận tiền" : "Đã thống nhất xử lý tiền cọc", tone: "success" };
  if (closure.status === "WAITING_HANDOVER") return { label: "Chờ bàn giao & lập đề xuất", detail: data.billing.allPaid ? "Đã đủ hóa đơn, có thể lập đề xuất cọc" : "Hoàn tất hóa đơn trước khi xử lý cọc", tone: "warning" };
  if (closure.status === "PROPOSED") return { label: "Chờ người thuê đồng ý", amount, detail: "Đề xuất khấu trừ và số tiền hoàn", tone: "info" };
  if (closure.status === "DISPUTED") return { label: "Cần đối soát khấu trừ", amount, detail: "Người thuê chưa đồng ý đề xuất", tone: "warning" };
  return { label: payment?.status === "TRANSFER_REPORTED" ? "Chờ bên nhận xác nhận" : payment?.status === "DISPUTED" ? "Đang đối soát chuyển khoản" : closure.status === "BALANCE_PENDING" ? "Người thuê cần trả thêm" : "Chủ nhà cần chuyển cọc",
    detail: closure.status === "BALANCE_PENDING" ? "Người thuê → Chủ nhà" : "Chủ nhà → Người thuê", amount, tone: "info" };
}
export function chooseInvoice(bills: MonthlyInvoice[], payments: PaymentRequest[], role: DashboardRole, requested?: string | null) {
  if (requested && bills.some(bill => bill.id === requested)) return requested;
  return [...bills].sort((a, b) => {
    const priority = (bill: MonthlyInvoice) => invoiceNeedsAction(role, bill, findInvoicePayment(bill, payments)?.status) ? 0
      : !["PAID","ROLLED_OVER","CANCELLED"].includes(bill.status) ? 1 : 2;
    return priority(a) - priority(b) || b.periodIndex - a.periodIndex || a.id.localeCompare(b.id);
  })[0]?.id;
}
