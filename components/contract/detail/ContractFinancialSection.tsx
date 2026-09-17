"use client";

import React from "react";
import { DollarSign, Lock } from "lucide-react";
import { FieldRow } from "./utils";

interface ContractFinancialSectionProps {
  financial: Record<string, unknown>;
}

export default function ContractFinancialSection({
  financial,
}: ContractFinancialSectionProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4.5 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Giá thuê định kỳ và tiền đặt cọc
          </h3>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground inline-flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Giá chốt không thay đổi sau thanh toán
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
        <FieldRow
          label="Tiền thuê hàng tháng"
          value={financial.amountNumber}
          highlight
        />
        <FieldRow label="Bằng chữ" value={financial.amountWords} />
        <FieldRow label="Kỳ hạn thanh toán" value={financial.paymentCycle} />
        <FieldRow label="Hạn đóng tiền định kỳ" value={financial.paymentDueDay} />
        <FieldRow
          label="Phương thức thanh toán"
          value={financial.paymentMethod || "Trực tuyến qua nền tảng HomeSpace"}
        />
        <FieldRow
          label="Tiền đặt cọc bảo đảm"
          value={financial.depositAmountNumber}
          highlight
        />
        <FieldRow
          label="Tiền cọc bằng chữ"
          value={financial.depositAmountWords}
        />
        <FieldRow
          label="Điều kiện & thời hạn hoàn cọc"
          value={financial.depositDescription}
        />
      </div>
    </section>
  );
}
