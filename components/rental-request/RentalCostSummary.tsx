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
  if (loading || error || !estimate || !estimate.paymentPlan) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 text-xs shadow-xs">
        <div className="flex items-center gap-2 font-bold text-foreground">
          {loading ? <RefreshCw className="h-4 w-4 animate-spin text-primary" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
          {loading ? "Đang tính lịch thanh toán..." : "Chưa thể xác định khoản thanh toán"}
        </div>
        {error && <p className="mt-2 text-rose-700 dark:text-rose-300">{error}</p>}
        {!loading && !error && estimate && !estimate.paymentPlan && <p className="mt-2 text-muted-foreground">Chưa có lịch thanh toán từ hệ thống. Vui lòng tải lại dự toán trước khi gửi yêu cầu.</p>}
      </div>
    );
  }

  const plan = estimate.paymentPlan;
  const rent = plan.firstRentAmount;
  const deposit = estimate.depositAmount;
  const dateLabel = (value: string) => value.split("-").reverse().join("/");

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 shadow-xs dark:bg-primary/10">
        <div className="flex items-start justify-between gap-3 border-b border-primary/20 pb-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {plan.depositOnly ? "Đặt cọc trước ngày nhận nhà" : "Thanh toán ban đầu"}
            </h3>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {plan.depositOnly
                ? "Sau khi chủ nhà chấp thuận, chỉ thanh toán tiền cọc giữ chỗ. Chưa thu tiền thuê tháng đầu."
                : "Dọn vào cùng ngày: thanh toán tiền cọc và tiền thuê tháng đầu sau khi chủ nhà chấp thuận yêu cầu."}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 py-3 text-xs">
          {!plan.depositOnly && <div className="flex items-center justify-between gap-2">
            <span className="text-foreground">Tiền thuê kỳ đầu</span>
            <span className="font-semibold text-foreground">{formatVND(rent)}</span>
          </div>}
          <div className="flex items-center justify-between gap-2">
            <span className="text-foreground">Tiền đặt cọc {deposit > 0 ? `(${depositBadge})` : "(không có)"}</span>
            <span className="font-semibold text-foreground">{formatVND(deposit)}</span>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2 border-t border-primary/20 pt-3">
          <span className="text-xs font-bold text-foreground">{plan.depositOnly ? "Cọc cần thanh toán sau khi được duyệt" : "Tổng cần thanh toán ban đầu"}</span>
          <strong className="shrink-0 text-base font-extrabold text-primary sm:text-lg">
            {formatVND(plan.amountAfterApproval)}
          </strong>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {plan.depositOnly && deposit === 0 ? "Bạn được miễn cọc, không cần chuyển tiền giữ chỗ. " : "Chuyển trực tiếp cho chủ nhà. "}HomeSpace không nhận hoặc giữ tiền.
        </p>
      </div>

      {plan.depositOnly && <div className="rounded-2xl border border-border bg-card p-4 text-xs shadow-xs">
        <h4 className="font-bold text-foreground">Tiền thuê tháng đầu — thanh toán sau</h4>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span>Mở thanh toán từ {dateLabel(plan.firstRentOpensOn)}</span>
          <strong className="shrink-0 text-sm">{formatVND(rent)}</strong>
        </div>
        <p className="mt-2 text-muted-foreground">Đến ngày bắt đầu dọn vào {dateLabel(plan.moveInDate)}, hệ thống mới mở thanh toán tiền phòng tháng đầu. Không thu lại khoản cọc đã xác nhận. Ký hợp đồng mở sau khi đã xác nhận đủ tiền theo tiến trình nhận nhà.</p>
      </div>}
      <p className="text-[11px] text-muted-foreground">Dự toán theo ngày {dateLabel(plan.businessDate)} của hệ thống. Khoản cần thanh toán được xác định lại khi chủ nhà chấp thuận; nếu thời điểm đó trùng ngày dọn vào thì thu cọc + tháng đầu. Ngày thuê có thể thay đổi nếu hai bên đồng ý bắt đầu sớm.</p>

      <EndOfPeriodCharges
        predictableCharges={estimate.predictableCharges}
        excludedCharges={estimate.excludedCharges}
      />
    </section>
  );
}
