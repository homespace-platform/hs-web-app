"use client";

import React from "react";
import { Receipt, Zap, Droplet, Info } from "lucide-react";
import { str } from "./utils";

interface ContractChargesSectionProps {
  charges?: Record<string, unknown>[] | null;
}

const BILLING_METHOD_LABELS: Record<string, string> = {
  PER_MONTH: "Tháng",
  PER_VEHICLE_MONTH: "Xe / tháng",
  PER_KWH: "kWh (theo công tơ)",
  PER_M3: "m³ (theo đồng hồ)",
  PER_PERSON_MONTH: "Người / tháng",
  PER_M2_MONTH: "m² / tháng",
  PER_HOUR: "Giờ",
  FREE: "Miễn phí",
  INCLUDED: "Đã bao gồm",
  STATE_WATER_RATE: "Theo giá nhà nước",
  NOT_APPLICABLE: "Không áp dụng",
  NEGOTIABLE: "Thỏa thuận",
  CUSTOM: "Tùy chỉnh",
};

export function formatBillingMethod(method?: unknown): string {
  if (!method) return "—";
  const s = String(method).trim();
  return BILLING_METHOD_LABELS[s.toUpperCase()] || s;
}

export default function ContractChargesSection({
  charges,
}: ContractChargesSectionProps) {
  const items = charges || [];

  return (
    <section className="rounded-2xl border border-border bg-card p-4.5 space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Phí dịch vụ và chi phí sinh hoạt (Charges Table)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Đơn giá, cách thức tính phí và phân loại chi phí định kỳ hoặc theo công tơ
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-muted-foreground px-2 py-0.5 rounded-md bg-muted self-start sm:self-auto">
          {items.length} khoản phí
        </span>
      </div>

      {items.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border/80">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/80">
              <tr>
                <th className="py-2.5 px-3 text-center w-12 font-semibold">STT</th>
                <th className="py-2.5 px-3 text-left font-semibold">Khoản phí</th>
                <th className="py-2.5 px-3 text-left font-semibold">
                  Mức phí / Đơn giá
                </th>
                <th className="py-2.5 px-3 text-left font-semibold">Đơn vị tính</th>
                <th className="py-2.5 px-3 text-left font-semibold">Ghi chú / Điều kiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {items.map((charge, idx) => {
                const name = str(charge.name);
                const billingMethod = String(charge.billingMethod || "");
                const isMetered =
                  billingMethod === "PER_KWH" || billingMethod === "PER_M3";

                return (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 text-center font-semibold text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      <div className="flex items-center gap-1.5">
                        {isMetered && (billingMethod === "PER_KWH" ? (
                          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <Droplet className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                        ))}
                        {name}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-foreground font-medium">
                      {str(charge.amountAndMethod || charge.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground font-medium">
                      {formatBillingMethod(charge.billingMethodText || charge.billingMethod)}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {str(charge.note || "Theo mức sử dụng thực tế")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic py-2">
          Giá thuê đã bao gồm trọn gói tất cả các dịch vụ cơ bản.
        </p>
      )}

      <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2.5 rounded-xl border border-border/60">
        <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          Các chi phí tính theo công tơ (điện, nước sinh hoạt) sẽ được chốt chỉ số định kỳ hàng tháng theo đúng đơn giá ghi trong bảng này.
        </span>
      </div>
    </section>
  );
}
