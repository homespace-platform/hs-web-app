"use client";

import React from "react";
import { DollarSign, Lock } from "lucide-react";
import { FieldRow } from "./utils";
import { useAmendmentWorkspace } from "./ContractAmendmentWorkspace";
import InlineAmendmentFields, { ContractTermFields, BillingSystemRuleLabels } from "./InlineAmendmentFields";
import VndMoneyInput from "@/components/ui/vnd-money-input";
import { ContractEditField } from "./ContractFieldState";

interface ContractFinancialSectionProps {
  financial: Record<string, unknown>;
}

export default function ContractFinancialSection({
  financial: originalFinancial,
}: ContractFinancialSectionProps) {
  const w = useAmendmentWorkspace();
  const financial = w?.data?.currentTerms.financial ?? originalFinancial;
  if (w?.editing) return <section id="amendment-rent" className="scroll-mt-24 rounded-2xl border bg-card p-4.5 space-y-3">
    <h3 className="text-sm font-bold">Giá thuê định kỳ và tiền đặt cọc</h3>
    <InlineAmendmentFields group="rent"/>
    <ContractTermFields group="financial" fields={[["paymentCycle","Kỳ hạn thanh toán",false,"Hàng tháng, Hàng quý, Hàng năm hoặc Mỗi N tháng (1–12). Phí điện/nước vẫn quyết toán hàng tháng."],["paymentMethod","Phương thức thanh toán"],["depositDescription","Điều kiện hoàn cọc"]]}/>
    <BillingSystemRuleLabels deadlineOnly />
    <ContractEditField group="financial" field="depositAmountValue"><VndMoneyInput label="Tiền đặt cọc bảo đảm (đ)" value={w.values.financial.depositAmountValue ?? String(financial.depositAmountNumber ?? "").replace(/\D/g, "")} onValueChange={depositAmountValue=>w.patch("financial",{...w.values.financial,depositAmountValue})}/></ContractEditField>
    <p className="text-xs text-muted-foreground">Số tiền bằng chữ được tính lại. Đổi tiền cọc tạo khoản thu thêm hoặc hoàn phần chênh lệch sau khi phụ lục có hiệu lực; không sửa khoản cọc đã thanh toán.</p>
  </section>;
  return (
    <section id="amendment-rent" className="scroll-mt-24 rounded-2xl border border-border bg-card p-4.5 space-y-3 shadow-2xs">
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
          Giá thuê và cọc theo điều khoản đang áp dụng
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
        {w?.editing ? <div className="md:col-span-2"><InlineAmendmentFields group="rent" /></div> : <>
        <FieldRow editable
          label="Tiền thuê hàng tháng"
          value={financial.amountNumber}
          highlight
        />
        <FieldRow label="Bằng chữ" value={financial.amountWords} />
        </>}
        <FieldRow editable label="Kỳ hạn thanh toán" value={financial.paymentCycle} />
        <FieldRow label="Hạn đóng tiền định kỳ" value={financial.paymentDueDay} />
        <FieldRow editable
          label="Phương thức thanh toán"
          value={financial.paymentMethod}
        />
        <FieldRow editable
          label="Tiền đặt cọc bảo đảm"
          value={financial.depositAmountNumber}
          highlight
        />
        <FieldRow
          label="Tiền cọc bằng chữ"
          value={financial.depositAmountWords}
        />
        <FieldRow editable
          label="Điều kiện & thời hạn hoàn cọc"
          value={financial.depositDescription}
        />
      </div>
    </section>
  );
}
