"use client";

import { Receipt } from "lucide-react";
import { FieldRow, formatMoney, str } from "./utils";
import { useAmendmentWorkspace } from "./ContractAmendmentWorkspace";

const time = (value: unknown) => {
  if (value == null || value === "") return "Chưa ghi nhận";
  const raw = String(value);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};
const status = (value: unknown) => ({CONFIRMED:"Hai bên đã xác nhận",PAID:"Đã thanh toán",PAID_MOCK:"Thanh toán thử nghiệm",PENDING:"Chờ xác nhận",UNPAID:"Chưa thanh toán"} as Record<string,string>)[String(value)] ?? str(value);

/** Historical snapshot, never recalculated from rent/deposit proposed in an amendment. */
export default function ContractInitialPaymentSection({ initialPayment }: { initialPayment?: Record<string,unknown> | null }) {
  const w = useAmendmentWorkspace();
  const p = w?.data?.currentTerms.initialPayment ?? initialPayment ?? {};
  const rows = Array.isArray(p.rows) ? p.rows as Record<string,unknown>[] : [];
  return <section aria-label="Ghi nhận thanh toán ban đầu" className="space-y-3 rounded-2xl border bg-card p-4.5">
    <h3 className="flex items-center gap-2 text-sm font-bold"><Receipt className="h-4 w-4 text-primary"/>Ghi nhận thanh toán ban đầu</h3>
    <p className="text-xs text-muted-foreground">Dữ liệu lịch sử tại thời điểm lập hợp đồng · Chỉ đọc. Phụ lục không sửa giao dịch đã xác nhận hoặc thu lại khoản này.</p>
    <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-xs"><thead className="bg-muted/40"><tr><th className="p-3">Khoản thanh toán</th><th className="p-3">Số tiền</th><th className="p-3">Chi tiết ghi nhận</th></tr></thead>
      <tbody>{rows.length ? rows.map((row,i)=><tr className="border-t" key={i}><td className="p-3">{str(row.itemName)}</td><td className="p-3">{str(row.amountText)}</td><td className="p-3">{str(row.note)}</td></tr>) : <>
        <tr className="border-t"><td className="p-3">Tiền thuê kỳ đầu</td><td className="p-3">{formatMoney(p.monthlyRent)}</td><td className="p-3">{status(p.status)}</td></tr>
        <tr className="border-t"><td className="p-3">Tiền đặt cọc ban đầu</td><td className="p-3">{formatMoney(p.depositAmount)}</td><td className="p-3">{status(p.status)}</td></tr>
      </>}</tbody></table></div>
    <div className="grid gap-x-6 md:grid-cols-2">
      <FieldRow label="Trạng thái xác nhận" value={status(p.status)}/>
      <FieldRow label="Tổng tiền ban đầu" value={formatMoney(p.totalAmount)}/>
      <FieldRow label="Người thuê báo chuyển" value={time(p.payerReportedAt)}/>
      <FieldRow label="Chủ nhà xác nhận nhận" value={time(p.payeeConfirmedAt)}/>
      <FieldRow label="Hoàn tất xác nhận hai chiều" value={time(p.confirmedAt)}/>
      <FieldRow label="Nội dung chuyển khoản" value={p.transferReference}/>
      <FieldRow label="Mã giao dịch ngân hàng" value={p.bankTransactionReference}/>
      <FieldRow label="Thời điểm thanh toán đã lưu" value={time(p.paidAt)}/>
      <FieldRow label="Mã tham chiếu thanh toán đã lưu" value={p.transactionCode}/>
    </div>
  </section>;
}
