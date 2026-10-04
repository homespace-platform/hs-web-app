"use client";

import { ChevronDown, ReceiptText } from "lucide-react";
import type { ExcludedChargeItem, PredictableChargeItem } from "@/types/rental-request.type";
import {
  formatExcludedChargeValue,
  formatVND,
  partitionExcludedCharges,
  partitionPredictableCharges,
} from "./rental-request.helper";

interface EndOfPeriodChargesProps {
  predictableCharges?: PredictableChargeItem[] | null;
  excludedCharges?: ExcludedChargeItem[] | null;
  prepaidFees?: number;
}

export function EndOfPeriodCharges({
  predictableCharges,
  excludedCharges,
  prepaidFees = 0,
}: EndOfPeriodChargesProps) {
  const { payableCharges } = partitionPredictableCharges(predictableCharges ?? []);
  const fixedCharges = payableCharges.filter((charge) => charge.amount > 0);
  const { meteredCharges, negotiableOrCustomCharges } =
    partitionExcludedCharges(excludedCharges ?? []);

  return (
    <details className="group rounded-xl border border-border bg-card text-xs">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3.5 marker:hidden [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <ReceiptText className="h-4 w-4 text-muted-foreground" />
          Phí dịch vụ và điện/nước tính cuối kỳ
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 border-t border-border px-3.5 pb-3.5 pt-3 text-[11px] text-muted-foreground">
        <p>
          Những khoản dưới đây <strong className="text-foreground">không nằm trong tổng thanh toán ban đầu</strong>.
          Chủ nhà sẽ quyết toán sau kỳ thuê theo hợp đồng và mức sử dụng thực tế.
        </p>
        {fixedCharges.length > 0 && (
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Phí cố định theo bài đăng</p>
            {fixedCharges.map((charge, index) => (
              <div key={`${charge.chargeType}-${index}`} className="flex justify-between gap-2">
                <span>{charge.displayName}</span>
                <span className="shrink-0">{formatVND(charge.amount)}/tháng</span>
              </div>
            ))}
          </div>
        )}
        {meteredCharges.length > 0 && (
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Theo sử dụng thực tế</p>
            {meteredCharges.map((charge, index) => (
              <div key={`${charge.chargeType}-${index}`} className="flex justify-between gap-2">
                <span>{charge.displayName}</span>
                <span className="shrink-0">{formatExcludedChargeValue(charge)}</span>
              </div>
            ))}
          </div>
        )}
        {negotiableOrCustomCharges.length > 0 && (
          <p>Các khoản cần thỏa thuận hoặc tự thanh toán sẽ được hai bên xác nhận riêng.</p>
        )}
        {prepaidFees > 0 && (
          <p>Yêu cầu cũ đã trả trước {formatVND(prepaidFees)} tiền phí; khoản này sẽ không bị thu lại.</p>
        )}
        <p>Chi phí phát sinh chưa biết trước sẽ chỉ được tính khi có thực tế và được ghi rõ trên hóa đơn cuối kỳ.</p>
      </div>
    </details>
  );
}
