"use client";

import { PolicyNotice } from "@/components/common/PolicyDialog";
import React from "react";
import { Calendar, Lock } from "lucide-react";
import { FieldRow, str } from "./utils";
import { useAmendmentWorkspace } from "./ContractAmendmentWorkspace";
import { ContractTermFields } from "./InlineAmendmentFields";

interface ContractLeaseSectionProps {
  lease: Record<string, unknown>;
  agreedEarlyEndExclusive?: string | null;
}

export default function ContractLeaseSection({
  lease: originalLease,
  agreedEarlyEndExclusive,
}: ContractLeaseSectionProps) {
  const w = useAmendmentWorkspace();
  const lease = w?.data?.currentTerms.lease ?? originalLease;
  const durationText = String(lease.durationText ?? "").trim();
  const durationMonths = String(lease.durationMonths ?? "").trim();
  const monthLabel = /^[1-9]\d*$/.test(durationMonths) ? `${durationMonths} tháng` : "";
  const hasMonthTotal = monthLabel && new RegExp(`(?:^|\\D)${durationMonths}\\s+tháng\\b`, "i").test(durationText);
  const durationLabel = durationText && monthLabel && !hasMonthTotal
    ? `${durationText} (${monthLabel})`
    : durationText || monthLabel;
  if (w?.editing) return <section id="amendment-lease" className="scroll-mt-24 rounded-2xl border bg-card p-4.5 space-y-3">
    <h3 className="text-sm font-bold">Thời hạn thuê và bàn giao</h3>
    <ContractTermFields group="lease" fields={[["startDateText","Ngày bắt đầu tính tiền thuê"],["endDateText","Ngày kết thúc hợp đồng"],["durationMonths","Số tháng thuê"],["durationText","Thời hạn thuê"],["handoverDateText","Ngày bàn giao tài sản"]]}/>
    <PolicyNotice tone="neutral" title="Đổi ngày bắt đầu thuê" summary="Ngày kết thúc khép đủ kỳ thuê tháng."><p>Ngày kết thúc khép đủ kỳ thuê tháng. Nếu đổi ngày bắt đầu, chọn đúng ngày hiệu lực của phụ lục; kỳ thuê và khoản thu trước đó được giữ nguyên.</p></PolicyNotice>
  </section>;
  return (
    <section className="rounded-2xl border border-border bg-card p-4.5 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Calendar className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Thời hạn thuê và bàn giao
          </h3>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground inline-flex items-center gap-1">
          <Lock className="w-3 h-3" />
          Thời hạn trong điều khoản đang áp dụng
        </span>
      </div>

      {agreedEarlyEndExclusive&&<div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
        <p className="font-semibold">Đã thống nhất kết thúc thuê sớm</p>
        <p className="mt-1">Mốc kết thúc đang áp dụng: {agreedEarlyEndExclusive.split("-").reverse().join("/")} lúc 00:00 (không gồm ngày này).</p>
        <PolicyNotice tone="neutral" title="Thời hạn thuê theo phụ lục" summary="Thời hạn gốc trong văn bản đã ký được giữ nguyên để đối chiếu."><p>Thời hạn gốc trong văn bản đã ký bên dưới được giữ nguyên để đối chiếu. Bàn giao và quyết toán thực hiện riêng.</p></PolicyNotice>
      </div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
        <FieldRow editable
          label="Ngày bắt đầu tính tiền thuê"
          value={lease.startDateText}
          highlight
        />
        <FieldRow editable label={agreedEarlyEndExclusive?"Ngày kết thúc theo văn bản đã ký":"Ngày kết thúc hợp đồng"} value={lease.endDateText} />
        <FieldRow editable
          label="Thời hạn thuê"
          value={durationLabel}
        />
        <FieldRow editable
          label="Ngày bàn giao tài sản"
          value={lease.handoverDateText ? str(lease.handoverDateText) : "Cùng ngày bắt đầu thuê"}
        />
      </div>
    </section>
  );
}
