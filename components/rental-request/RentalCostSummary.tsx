"use client";

import React from "react";
import { AlertCircle, RefreshCw, ShieldCheck } from "lucide-react";
import type { RentalEstimateResponse } from "@/types/rental-request.type";
import { formatVND } from "./rental-request.helper";
import { EndOfPeriodCharges } from "./EndOfPeriodCharges";

interface RentalCostSummaryProps {
  estimate: RentalEstimateResponse | null;
  loading: boolean;
  error: string | null;
  depositBadge: string;
  occupantCount?: number;
}

export function RentalCostSummary({
  estimate,
  loading,
  error,
  depositBadge,
}: RentalCostSummaryProps) {
  if (!estimate) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-xs shadow-xs">
        <div className="flex items-center gap-2 font-bold text-foreground">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin text-primary" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
          {loading ? "Đang tính khoản thanh toán ban đầu..." : "Chưa thể tính khoản thanh toán ban đầu"}
        </div>
        {error && <p className="mt-2 text-rose-700 dark:text-rose-300">{error}</p>}
      </div>
    );
  }

  const rent = estimate.effectiveMonthlyRent ?? 0;
  const deposit = estimate.depositAmount ?? 0;
  // Derive this from the two payable items so a stale estimate API cannot re-add service fees.
  const upfrontTotal = rent + deposit;

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 shadow-xs dark:bg-primary/10">
        <div className="flex items-start justify-between gap-3 border-b border-primary/20 pb-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Thanh toán ban đầu
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Chỉ thanh toán sau khi chủ nhà chấp thuận yêu cầu.
            </p>
          </div>
          {loading && <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-primary" />}
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        )}

        <div className="space-y-2.5 py-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-foreground">Tiền thuê kỳ đầu</span>
            <span className="font-semibold text-foreground">{formatVND(rent)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-foreground">Tiền đặt cọc {deposit > 0 ? `(${depositBadge})` : "(không có)"}</span>
            <span className="font-semibold text-foreground">{formatVND(deposit)}</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2 border-t border-primary/20 pt-3">
          <span className="text-xs font-bold text-foreground">Tổng cần thanh toán ban đầu</span>
          <strong className="shrink-0 text-base font-extrabold text-primary sm:text-lg">
            {formatVND(upfrontTotal)}
          </strong>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Chuyển trực tiếp cho chủ nhà để giữ chỗ. HomeSpace không nhận hoặc giữ tiền.
        </p>
      </div>

      <EndOfPeriodCharges
        predictableCharges={estimate.predictableCharges}
        excludedCharges={estimate.excludedCharges}
      />
    </section>
  );
}
