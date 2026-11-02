import type { DepositLedger } from "@/types/deposit-ledger.type";

const money = (value?: number | null) => value == null ? "Chưa có dữ liệu" : value.toLocaleString("vi-VN") + " đ";
const labels: Record<string, string> = {
  PENDING: "Chưa xác nhận nhận cọc", HELD: "Đang giữ cọc", SETTLEMENT_PENDING: "Chờ thống nhất quyết toán",
  RETAINED_BY_LANDLORD: "Đã chốt giữ cọc", REFUND_DUE: "Chờ hoàn cọc", REFUND_REPORTED: "Đã báo hoàn · Chờ bên nhận xác nhận",
  REFUNDED: "Đã xác nhận hoàn cọc", DISPUTED: "Đang đối soát cọc",
};

export default function DepositLedgerSummary({ ledger }: { ledger?: DepositLedger | null }) {
  if (!ledger) return <p className="text-sm text-muted-foreground">Chưa có sổ cọc để đối chiếu.</p>;
  const rows = [
    ["Cọc thực nhận đã xác nhận", ledger.confirmedReceivedAmount],
    ["Cọc còn đang giữ", ledger.heldAmount],
    ["Cọc đã chốt khấu trừ / giữ lại", ledger.retainedAmount],
    [["REFUND_DUE", "REFUND_REPORTED", "REFUNDED"].includes(ledger.status) ? "Cọc còn phải hoàn theo sổ" : "Cọc có thể hoàn theo sổ (chưa chốt)", ledger.refundableAmount],
    ["Cọc đã hoàn, bên nhận đã xác nhận", ledger.confirmedRefundedAmount],
  ] as const;
  return <section aria-label="Sổ cọc" className="space-y-2 rounded-xl border p-3 text-sm">
    <p className="font-semibold">Sổ cọc · {ledger.status === "REFUNDED" && ledger.confirmedRefundedAmount == null ? "Sổ ghi đã hoàn · Chưa đủ chứng từ" : labels[ledger.status] ?? ledger.status}</p>
    <dl className="grid gap-2 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{money(value)}</dd></div>)}</dl>
    {ledger.retainedReason && <p>Căn cứ giữ lại: {ledger.retainedReason}</p>}
    {ledger.retainedAt && <p className="text-xs text-muted-foreground">Chốt giữ lúc {new Date(ledger.retainedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>}
    <p className="text-xs text-muted-foreground">Đã thống nhất quyết toán hoặc đã báo chuyển chưa phải đã nhận tiền hoàn. Khoản phải trả thêm vượt cọc được theo dõi riêng.</p>
  </section>;
}
