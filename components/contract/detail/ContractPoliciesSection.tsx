"use client";

import React from "react";
import { FileCheck } from "lucide-react";
import { FieldRow, isZeroDeposit } from "./utils";
import type { PolicySnapshot } from "@/types/contract.type";
import { useAmendmentWorkspace } from "./ContractAmendmentWorkspace";
import InlineAmendmentFields, { BillingSystemRuleLabels } from "./InlineAmendmentFields";
import ListingPoliciesCard from "@/components/listing/ListingPoliciesCard";
import type { ListingPolicyValue } from "@/types/listing-policy.type";
import VndMoneyInput from "@/components/ui/vnd-money-input";
import { ContractEditField } from "./ContractFieldState";

const formatVnd = (amount: number) => `${amount.toLocaleString("vi-VN")} đ`;

export interface DraftPolicyFields {
  feeMode: NonNullable<PolicySnapshot["latePaymentFeeMode"]>;
  feeAmount: string;
  additionalTerms?: string;
}

interface ContractPoliciesSectionProps {
  policies?: (PolicySnapshot | Record<string, unknown>) | null;
  financial?: Record<string, unknown>;
  specialTerms?: string | null;
  isDraft: boolean;
  draft?: DraftPolicyFields;
  draftSystemTerms?: string | null;
  originalAdditionalTerms?: string | null;
  draftDisabled?: boolean;
  feeError?: string;
  onDraftChange?: (changes: Partial<DraftPolicyFields>) => void;
}

export default function ContractPoliciesSection({
  policies: originalPolicies,
  financial: originalFinancial,
  specialTerms: originalSpecialTerms,
  isDraft,
  draft,
  draftSystemTerms,
  originalAdditionalTerms,
  draftDisabled,
  feeError,
  onDraftChange,
}: ContractPoliciesSectionProps) {
  const w = useAmendmentWorkspace();
  const policies = w?.data?.currentTerms.policies ?? originalPolicies;
  const financial = w?.data?.currentTerms.financial ?? originalFinancial;
  const noDeposit = isZeroDeposit(financial?.depositAmountValue ?? financial?.depositAmountNumber);
  const specialTerms = w?.data?.currentTerms.specialTerms ?? originalSpecialTerms;
  const p = policies || {};
  const policyRows = Array.isArray(p.listingPolicies)
    ? (p.listingPolicies as ListingPolicyValue[]).filter(row => !noDeposit || row.code !== "depositRefundDays")
    : [];
  const noticeDays = p.noticeDaysBeforeTermination;
  const lateMode = p.latePaymentFeeMode || "NONE";
  const savedFeeAmount = Number(p.latePaymentFeeAmount || 0);
  const savedGraceDays = Number(p.latePaymentFeeGraceDays || 0);
  const savedFeeCap = Number(p.latePaymentFeeCap || 0);
  const feeMode = draft?.feeMode ?? "NONE";
  const feeAmount = draft?.feeAmount ?? "";
  const draftFeeAmount = Number(feeAmount);
  const feeAfterDays = (lateDays: number) => {
    const chargeableDays = Math.min(5, Math.max(0, lateDays - savedGraceDays));
    const fee = lateMode === "FIXED_PER_DAY" ? savedFeeAmount * chargeableDays
      : chargeableDays > 0 ? savedFeeAmount : 0;
    return savedFeeCap > 0 ? Math.min(fee, savedFeeCap) : fee;
  };
  const depositRefundDays = p.depositRefundDays;
  const policyText = (flag: string, key: string, yes: string, no: string) =>
    typeof p[flag as keyof typeof p] === "boolean" ? (p[flag as keyof typeof p] ? yes : no)
      : typeof p[key as keyof typeof p] === "string" && String(p[key as keyof typeof p]).trim()
        ? String(p[key as keyof typeof p]) : "Chưa có thỏa thuận trong bản chụp hợp đồng";

  if (w?.editing) return <section id="amendment-rules" className="scroll-mt-24 min-w-0 rounded-2xl border bg-card p-4.5 space-y-3">
    <h3 className="text-sm font-bold">Chính sách vận hành và điều khoản thỏa thuận bổ sung</h3>
    <InlineAmendmentFields group="rules"/>
  </section>;

  return (
    <section id={draft ? "contract-policies" : "amendment-rules"} className="scroll-mt-24 rounded-2xl border border-border bg-card p-4.5 space-y-4 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <FileCheck className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Chính sách vận hành và điều khoản thỏa thuận bổ sung
          </h3>
        </div>
      </div>

      {w?.editing && <InlineAmendmentFields group="rules" />}
      {!w?.editing && policyRows.length > 0 && <ListingPoliciesCard rows={policyRows} compact contract />}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5 ${w?.editing || policyRows.length ? "hidden" : ""}`}>
        <FieldRow
          label="Thời hạn báo trước khi chấm dứt"
          value={noticeDays != null ? `Tối thiểu ${noticeDays} ngày` : "Chưa có thỏa thuận"}
        />
        {!noDeposit && <FieldRow
          label="Thời hạn hoàn trả tiền đặt cọc"
          value={depositRefundDays != null ? `Trong vòng ${depositRefundDays} ngày sau khi bàn giao và quyết toán` : "Chưa có thỏa thuận"}
        />}
        <FieldRow
          label="Cho thuê lại (Subletting)"
          value={policyText("sublettingAllowed", "subleasePolicy", "Được phép theo thỏa thuận", "Không được phép")}
        />
        <FieldRow
          label="Quy định nuôi thú cưng"
          value={policyText("petsAllowed", "petPolicy", "Được phép, tuân thủ nội quy", "Không được phép")}
        />
        <FieldRow
          label="Quy định hút thuốc trong nhà"
          value={policyText("smokingAllowed", "smokingPolicy", "Chỉ tại khu vực cho phép", "Không được phép")}
        />
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-bold uppercase tracking-wider">Phí phạt đóng trễ</h4>
        </div>
        {draft ? <div className="grid gap-3 text-xs">
          <ContractEditField group="policies" changed={feeMode!==lateMode}><label>Cách tính phí
            <select value={feeMode} disabled={draftDisabled} onChange={(e) => onDraftChange?.({feeMode: e.target.value as DraftPolicyFields["feeMode"]})}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2">
              <option value="NONE">Không phạt</option>
              <option value="FIXED_ONCE">Phạt một lần sau hạn</option>
              <option value="FIXED_PER_DAY">Phạt cho mỗi ngày trễ</option>
            </select>
          </label></ContractEditField>
          {feeMode !== "NONE" && <ContractEditField group="policies" changed={Number(feeAmount)!==savedFeeAmount}><VndMoneyInput label="Mức phạt (đ)" min={1} value={feeAmount} disabled={draftDisabled}
            onValueChange={amount => onDraftChange?.({feeAmount: amount})}
            placeholder={feeMode === "FIXED_PER_DAY" ? "Ví dụ: 100.000 đ/ngày" : "Ví dụ: 100.000 đ/lần"} /></ContractEditField>}
          <p className="text-muted-foreground">{feeMode === "FIXED_PER_DAY" && draftFeeAmount > 0
            ? `Trễ 1 ngày: ${formatVnd(draftFeeAmount)} · Tối đa 5 ngày: ${formatVnd(draftFeeAmount * 5)} trên mỗi hóa đơn.`
            : feeMode === "FIXED_ONCE" && draftFeeAmount > 0 ? `Trễ 1 hay nhiều ngày: chỉ phạt một lần ${formatVnd(draftFeeAmount)}.`
            : feeMode !== "NONE" ? "Nhập mức tiền để xem ví dụ tính phí."
            : "Không cộng phí chậm thanh toán vào hóa đơn."}</p>
          {feeError && <p className="text-rose-600">{feeError}</p>}
          <BillingSystemRuleLabels policies={{...p,latePaymentFeeMode:feeMode,latePaymentFeeAmount:feeAmount}} />
        </div> : lateMode === "NONE" ? (
          <p data-contract-field-state="editable" className="text-xs text-blue-700! dark:text-blue-400!">Không áp dụng phí phạt đóng trễ cho hợp đồng này.</p>
        ) : (
          <div className="space-y-2.5 text-xs">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <strong data-contract-field-state="editable" className="text-lg font-bold text-blue-700! dark:text-blue-400!">{formatVnd(savedFeeAmount)}</strong>
              <span data-contract-field-state="editable" className="font-semibold text-blue-700! dark:text-blue-400!">{lateMode === "FIXED_PER_DAY" ? "/ mỗi ngày trễ" : "/ một lần duy nhất"}</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{isDraft ? "Đã lưu trong bản nháp" : "Điều khoản đã chốt"}</span>
            </div>
            <p className="text-foreground">Trễ 1 ngày: {formatVnd(feeAfterDays(1))} · Trễ 5 ngày: {formatVnd(feeAfterDays(5))}.</p>
            <p className="text-muted-foreground">Bắt đầu tính {savedGraceDays > 0
              ? `sau ${savedGraceDays} ngày ân hạn kể từ hạn thanh toán ghi trên hóa đơn`
              : "từ ngày đầu tiên sau hạn thanh toán ghi trên hóa đơn"}. Sau 5 ngày quá hạn, hệ thống nhắc chủ nhà quyết định hướng xử lý.</p>
            {savedFeeCap > 0 && <p className="text-muted-foreground">Tổng phí phạt tối đa áp dụng: {formatVnd(lateMode === "FIXED_PER_DAY" ? Math.min(savedFeeCap, savedFeeAmount * 5) : savedFeeCap)}.</p>}
            {lateMode === "FIXED_PER_DAY" && <p className="text-muted-foreground">Hệ thống chỉ tính phạt tối đa 5 ngày trên mỗi hóa đơn; tổng tối đa bằng mức phí mỗi ngày nhân 5 và giữ trần tiền thấp hơn trong bản ký cũ nếu có. Không tự sửa phí đã chốt hoặc chứng từ lịch sử.</p>}
          </div>
        )}
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {p.overdueUnilateralTermination24h
          ? "Sau đủ 5 ngày quá hạn, chủ nhà có thể chọn phương án xử lý. Nếu có quyết định đơn phương chấm dứt, người thuê có 24 giờ để khiếu nại theo điều khoản hệ thống."
          : p.overdueLandlordTerminationAfterFiveDays
          ? "Sau hơn 5 ngày quá hạn, chủ nhà có thể cho cộng nợ kỳ sau hoặc đề nghị chấm dứt. Nếu người thuê từ chối, chủ nhà có thể chọn chấm dứt theo điều khoản đã ký sau khi thông báo và thực tế nhận lại phòng; khi đó hệ thống ghi cọc cho chủ nhà và mở lại tin đăng. Hệ thống không tự chấm dứt."
          : "Hợp đồng này không có điều khoản chấm dứt sau 5 ngày quá hạn theo cấu trúc hiện hành; hệ thống không tự chấm dứt hoặc thu cọc."}
      </p>

      {(w?.data?.currentTerms.systemTerms || draftSystemTerms) && <div className="rounded-xl border bg-muted/20 p-3.5 text-xs">
        <h4 className="font-semibold">Điều khoản hệ thống · Chỉ đọc</h4>
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{w?.data?.currentTerms.systemTerms || draftSystemTerms}</p>
      </div>}
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider">Điều khoản thỏa thuận khác</h4>
        {draft?.additionalTerms !== undefined ? (
          <ContractEditField group="specialTerms" changed={draft.additionalTerms.trim() !== String(originalAdditionalTerms ?? "").trim()}>
            <textarea aria-label="Điều khoản thỏa thuận khác" rows={4} maxLength={8000} value={draft.additionalTerms}
              disabled={draftDisabled} onChange={(e) => onDraftChange?.({additionalTerms: e.target.value})}
              placeholder="Nhập thỏa thuận bổ sung giữa hai bên nếu có…" className="w-full rounded-lg border border-input bg-background p-2.5 text-xs" />
          </ContractEditField>
        ) : <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
          {(draft ? null : specialTerms) || (draft ? "Điều khoản của bản nháp này được giữ nguyên ở phần chỉ đọc." : "Không có điều khoản bổ sung.")}
        </p>}
      </div>
    </section>
  );
}
