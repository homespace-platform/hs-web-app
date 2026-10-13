"use client";

import { useCallback, useEffect, useState } from "react";
import paymentRequestService from "@/services/payment-request.service";
import type { PaymentRequest, PaymentStatus } from "@/types/payment-request.type";

const money = (n: number) => n.toLocaleString("vi-VN") + " đ";
const labels: Record<PaymentStatus, string> = {
  CONFIRMED: "Đã xác nhận thanh toán", TRANSFER_REPORTED: "Đã thanh toán · Chờ xác nhận",
  AWAITING_TRANSFER: "Chưa thanh toán", REJECTED: "Chứng từ bị từ chối", DISPUTED: "Đang đối soát",
  CANCELLED: "Đã hủy", OVERDUE: "Quá hạn", EXPIRED: "Đã hết hạn",
};

/** Read the original obligation; never create another invoice or collect the deposit/rent twice. */
export default function InitialPaymentHistory({ rentalRequestId }: { rentalRequestId: string }) {
  const [payment, setPayment] = useState<PaymentRequest | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setPayment(null); setError(false);
    try { setPayment(await paymentRequestService.getInitialPaymentByRentalRequestId(rentalRequestId)); }
    catch { setError(true); }
  }, [rentalRequestId]);
  useEffect(() => { void load(); }, [load]);
  return <article className="space-y-2 rounded-xl border border-border bg-muted/20 p-4 text-sm">
    <div className="flex flex-wrap justify-between gap-2">
      <h3 className="font-semibold">Kỳ thanh toán 1 · Tiền cọc + tiền phòng tháng 1</h3>
      {payment && <span className={payment.status === "CONFIRMED" ? "text-emerald-700" : "text-amber-700"}>{labels[payment.status]}</span>}
    </div>
    <p className="text-xs text-muted-foreground">Khoản thanh toán ban đầu; chỉ hiển thị lịch sử, không thu lại trong hóa đơn hằng tháng.</p>
    {error ? <p role="alert" className="text-xs text-amber-700">Chưa tải được khoản thanh toán ban đầu. <button type="button" onClick={() => void load()} className="underline">Thử lại</button></p>
      : !payment ? <p className="text-xs text-muted-foreground">Đang tải khoản thanh toán ban đầu…</p>
      : <>
        {payment.lineItems.map(line => <div key={line.id} className="flex justify-between gap-3 text-xs"><span>{line.type === "RENT" ? "Tiền phòng tháng 1" : line.displayName}</span><span>{money(line.amount)}</span></div>)}
        <div className="flex justify-between border-t pt-2 font-semibold"><span>Tổng thanh toán ban đầu</span><span>{money(payment.totalAmount)}</span></div>
        {(payment.payeeConfirmedAt || payment.confirmedAt) && <p className="text-xs text-muted-foreground">Xác nhận lúc: {new Date((payment.payeeConfirmedAt || payment.confirmedAt)!).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>}
      </>}
  </article>;
}
