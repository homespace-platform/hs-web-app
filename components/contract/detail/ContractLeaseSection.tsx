"use client";

import React from "react";
import { Calendar, Lock } from "lucide-react";
import { FieldRow, str } from "./utils";

interface ContractLeaseSectionProps {
  lease: Record<string, unknown>;
}

export default function ContractLeaseSection({
  lease,
}: ContractLeaseSectionProps) {
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
          Đã chốt từ yêu cầu thuê
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
        <FieldRow
          label="Ngày bắt đầu tính tiền thuê"
          value={lease.startDateText}
          highlight
        />
        <FieldRow label="Ngày kết thúc hợp đồng" value={lease.endDateText} />
        <FieldRow
          label="Thời hạn thuê"
          value={`${str(lease.durationText)} (${str(lease.durationMonths)} tháng)`}
        />
        <FieldRow
          label="Ngày bàn giao tài sản"
          value={lease.handoverDateText ? str(lease.handoverDateText) : "Cùng ngày bắt đầu thuê"}
        />
      </div>
    </section>
  );
}
