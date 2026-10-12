import type { InvoiceLine } from "@/types/monthly-invoice.type";

const money = (value: number) => new Intl.NumberFormat("vi-VN", {
  style: "currency", currency: "VND", maximumFractionDigits: 0,
}).format(value);

export default function InvoiceLineCalculation({ line }: { line: InvoiceLine }) {
  if (line.type !== "LATE_FEE") {
    return <small className="text-muted-foreground">({line.quantity} × {money(line.unitPrice)})</small>;
  }
  if (!line.quantityUnit) {
    return <small className="text-muted-foreground">(Khoản phí đã chốt; hóa đơn cũ chưa lưu chi tiết số ngày)</small>;
  }
  const beforeCap = line.quantity * line.unitPrice;
  return <>
    <small className="text-muted-foreground">
      ({money(line.unitPrice)}{line.quantityUnit === "ngày" ? "/ngày" : ""} × {line.quantity} {line.quantityUnit})
    </small>
    {beforeCap > line.amount && <p className="mt-1 text-xs text-muted-foreground">
      Phí tính theo đơn giá: {money(beforeCap)}; áp dụng mức trần còn {money(line.amount)}.
    </p>}
  </>;
}
