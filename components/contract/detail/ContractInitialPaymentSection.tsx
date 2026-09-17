"use client";

import React from "react";
import { CreditCard, CheckCircle2, Info } from "lucide-react";
import { formatMoney, str } from "./utils";
import type {
  ContractPaymentBreakdownResponse,
  InitialPaymentSnapshot,
} from "@/types/contract.type";

interface ContractInitialPaymentSectionProps {
  initialPayment?: InitialPaymentSnapshot | null;
  paymentBreakdown?: ContractPaymentBreakdownResponse | null;
  paidAt?: string | null;
}

export default function ContractInitialPaymentSection({
  initialPayment,
  paymentBreakdown,
  paidAt,
}: ContractInitialPaymentSectionProps) {
  // Extract values with precedence: initialPayment snapshot -> paymentBreakdown
  const monthlyRent =
    initialPayment?.monthlyRent ?? paymentBreakdown?.monthlyRent ?? 0;
  const deposit =
    initialPayment?.depositAmount ?? paymentBreakdown?.deposit ?? 0;
  const fixedCharges =
    initialPayment?.monthlyCharges ?? paymentBreakdown?.chargesTotal ?? 0;
  const totalAmount =
    initialPayment?.totalAmount ?? paymentBreakdown?.totalAmount ?? 0;
  const transactionCode = initialPayment?.transactionCode || "HS-TXN-COMPLETED";
  const displayPaidAt = initialPayment?.paidAt || paidAt;

  return (
    <section className="rounded-2xl border border-border bg-card p-4.5 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Xác nhận khoản thanh toán ban đầu (Đã hoàn tất)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Bên B đã thanh toán đủ trước khi tạo và ký hợp đồng chính thức
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300 inline-flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Đã thanh toán thành công
        </span>
      </div>

      {/* DYNAMIC INITIAL PAYMENT TABLE MATCHING TEMPLATE */}
      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground border-b border-border/80">
            <tr>
              <th className="py-2.5 px-3 text-left font-semibold">Khoản thanh toán</th>
              <th className="py-2.5 px-3 text-right font-semibold">Số tiền</th>
              <th className="py-2.5 px-3 text-left font-semibold">Trạng thái / Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            <tr>
              <td className="py-2.5 px-3 font-medium text-foreground">
                Tiền thuê kỳ đầu tiên
              </td>
              <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                {formatMoney(monthlyRent)}
              </td>
              <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-medium">
                Đã thanh toán qua HomeSpace
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 font-medium text-foreground">
                Chi phí cố định kỳ đầu tiên
              </td>
              <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                {formatMoney(fixedCharges)}
              </td>
              <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-medium">
                Đã thanh toán qua HomeSpace
              </td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 font-medium text-foreground">
                Tiền đặt cọc bảo đảm
              </td>
              <td className="py-2.5 px-3 text-right font-semibold text-foreground">
                {formatMoney(deposit)}
              </td>
              <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-medium">
                Đã giữ trên nền tảng HomeSpace
              </td>
            </tr>
            <tr className="bg-primary/5 font-bold">
              <td className="py-3 px-3 text-foreground text-sm">Tổng cộng đã thanh toán</td>
              <td className="py-3 px-3 text-right text-sm text-primary font-black">
                {formatMoney(totalAmount)}
              </td>
              <td className="py-3 px-3 text-xs text-muted-foreground font-normal">
                {displayPaidAt ? `Thanh toán: ${str(displayPaidAt)}` : "Đã ghi nhận"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
        <div>
          Mã giao dịch đối soát:{" "}
          <code className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-[11px]">
            {str(transactionCode)}
          </code>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Chi phí điện/nước theo công tơ thực tế chưa tính trong đợt này.</span>
        </div>
      </div>
    </section>
  );
}
