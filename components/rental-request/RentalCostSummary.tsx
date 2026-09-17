"use client";

import React from "react";
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { RentalEstimateResponse } from "@/types/rental-request.type";
import {
  formatVND,
  partitionPredictableCharges,
  partitionExcludedCharges,
  formatChargeDisplay,
  formatExcludedChargeValue,
} from "./rental-request.helper";

interface RentalCostSummaryProps {
  estimate: RentalEstimateResponse | null;
  loading: boolean;
  error: string | null;
  depositBadge: string;
  occupantCount: number;
}

export function RentalCostSummary({
  estimate,
  loading,
  error,
  depositBadge,
  occupantCount,
}: RentalCostSummaryProps) {
  // Trạng thái 1: Đang tải lần đầu và chưa có dữ liệu estimate
  if (!estimate && loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Dự toán thanh toán</span>
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-primary font-medium animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Đang tính dự toán...
          </span>
        </div>
        <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
          <RefreshCw className="w-6 h-6 text-primary animate-spin opacity-80" />
          <p className="text-xs text-muted-foreground font-medium">
            Đang tính toán dự toán thanh toán theo thông tin thuê...
          </p>
        </div>
      </div>
    );
  }

  // Trạng thái 2: Lỗi tải estimate và không có dữ liệu
  if (!estimate && error) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-900/60 pb-2">
          <span className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Dự toán thanh toán</span>
          </span>
        </div>
        <div className="p-3 rounded-xl bg-rose-100/70 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Chưa thể xác nhận dự toán thanh toán</p>
            <p className="text-[11px] opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  const { payableCharges, includedCharges, freeCharges } =
    partitionPredictableCharges(estimate.predictableCharges);
  const { meteredCharges, negotiableOrCustomCharges } =
    partitionExcludedCharges(estimate.excludedCharges);

  const hasExcludedSection =
    meteredCharges.length > 0 || negotiableOrCustomCharges.length > 0;
  const hasIncludedOrFreeSection =
    includedCharges.length > 0 || freeCharges.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Dự toán thanh toán</span>
        </span>
        {loading && (
          <span className="flex items-center gap-1 text-[11px] text-primary font-medium animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Đang cập nhật...
          </span>
        )}
      </div>

      {error && (
        <div className="p-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-[11px] dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. ĐÓNG TRƯỚC MỖI THÁNG */}
      <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5">
        <div className="flex items-baseline justify-between text-xs font-bold text-foreground border-b border-border/60 pb-2">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5 text-foreground/80" />
            <span>Đóng trước mỗi tháng</span>
          </div>
          <span className="text-sm font-extrabold text-foreground">
            {formatVND(estimate.estimatedMonthlyTotal)}
          </span>
        </div>

        <div className="space-y-2 pt-0.5 text-xs">
          {/* Tiền thuê nhà */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="font-medium text-foreground block">Tiền thuê nhà</span>
              {occupantCount > 1 &&
                estimate.effectiveMonthlyRent % occupantCount === 0 &&
                estimate.effectiveMonthlyRent / occupantCount >= 100000 && (
                  <span className="text-[11px] text-muted-foreground block">
                    {formatVND(estimate.effectiveMonthlyRent / occupantCount)} × {occupantCount} người
                  </span>
                )}
            </div>
            <div className="text-right shrink-0">
              <span className="font-semibold text-foreground">
                {formatVND(estimate.effectiveMonthlyRent)}
              </span>
              <span className="text-[11px] text-muted-foreground block">/tháng</span>
            </div>
          </div>

          {/* Các khoản phí có thể tính trước (không bao gồm INCLUDED/FREE) */}
          {payableCharges.map((c, idx) => {
            const info = formatChargeDisplay(c);
            return (
              <div key={idx} className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground block truncate">
                    {c.displayName}
                  </span>
                  {info.subText && (
                    <span className="text-[11px] text-muted-foreground block">
                      {info.subText}
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {info.isUnregisteredVehicle ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-md border border-border bg-background text-muted-foreground font-medium">
                      {info.mainText}
                    </span>
                  ) : (
                    <>
                      <span className="font-semibold text-foreground">
                        {info.mainText}
                      </span>
                      <span className="text-[11px] text-muted-foreground block">/tháng</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/40">
          * Các khoản này được thanh toán vào đầu mỗi kỳ thuê.
        </p>
      </div>

      {/* 2. ĐÃ BAO GỒM HOẶC MIỄN PHÍ */}
      {hasIncludedOrFreeSection && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2.5 text-xs">
          {includedCharges.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Đã bao gồm trong tiền thuê</span>
              </span>
              <div className="flex flex-col gap-1.5 pl-5">
                {includedCharges.map((c, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border border-emerald-300/80 dark:border-emerald-800 bg-background text-foreground font-medium">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                      <span>
                        {c.chargeType === "MANAGEMENT"
                          ? "Phí quản lý tòa nhà"
                          : c.displayName}
                      </span>
                    </span>
                    {c.chargeType === "MANAGEMENT" && (
                      <p className="text-[10px] text-muted-foreground pl-0.5">
                        Phí vận hành khu vực chung như bảo vệ, vệ sinh, thang máy và tiện ích chung của tòa nhà.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {freeCharges.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Miễn phí</span>
              </span>
              <div className="flex flex-wrap gap-1.5 pl-5">
                {freeCharges.map((c, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] px-2 py-0.5 rounded-md border border-emerald-300/80 dark:border-emerald-800 bg-background text-foreground font-medium flex items-center gap-1"
                  >
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                    <span>{c.displayName}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. CHƯA TÍNH VÀO TỔNG */}
      {hasExcludedSection && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Chưa tính vào tổng</span>
          </div>

          {/* Nhóm A: Tính sau theo sử dụng thực tế */}
          {meteredCharges.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-amber-500/20 bg-background/70 p-2.5">
              <span className="text-[11px] font-bold text-foreground block">
                Tính sau theo sử dụng thực tế
              </span>
              <ul className="space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
                {meteredCharges.map((c, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="font-semibold text-foreground">{c.displayName}:</span>{" "}
                    <span>{formatExcludedChargeValue(c)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground italic pt-0.5">
                * Các khoản này chưa nằm trong tổng dự kiến và sẽ được chốt theo số liệu sử dụng thực tế.
              </p>
            </div>
          )}

          {/* Nhóm B: Cần xác nhận hoặc tự thanh toán */}
          {negotiableOrCustomCharges.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-border/60 bg-background/70 p-2.5">
              <span className="text-[11px] font-bold text-foreground block">
                Cần xác nhận hoặc tự thanh toán
              </span>
              <ul className="space-y-1 text-[11px] text-muted-foreground list-disc list-inside">
                {negotiableOrCustomCharges.map((c, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span className="font-semibold text-foreground">{c.displayName}:</span>{" "}
                    <span>{c.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 4. THANH TOÁN KHI KÝ HỢP ĐỒNG (Đặt ở cuối cùng theo dòng suy nghĩ của người thuê) */}
      <div className="rounded-xl border-2 border-primary/40 bg-primary/5 dark:border-primary/50 dark:bg-primary/10 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Thanh toán khi ký hợp đồng</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-md border border-primary/30 bg-background text-primary font-semibold shrink-0">
            {depositBadge}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Chi phí tháng đầu</span>
            <span className="font-semibold text-foreground">
              {formatVND(estimate.estimatedMonthlyTotal)}
            </span>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Tiền đặt cọc</span>
              <span className="font-semibold text-foreground">
                {formatVND(estimate.depositAmount)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Khoản bảo đảm, hoàn trả theo điều kiện hợp đồng.
            </p>
          </div>
        </div>

        {/* Ghi chú về thời điểm thanh toán nằm trước divider và trước dòng tổng */}
        <p className="text-[10px] text-muted-foreground italic pt-1 border-t border-primary/10">
          * Số tiền dự kiến thanh toán khi ký hợp đồng hoặc trước khi bàn giao nhà.
        </p>

        {/* Dòng “Tổng cần thanh toán” là dòng cuối cùng trong khối dự toán */}
        <div className="border-t border-primary/20 pt-2.5 flex items-baseline justify-between gap-2">
          <div className="space-y-0.5 min-w-0">
            <span className="text-xs font-bold text-foreground block">
              Tổng cần thanh toán
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">
              Chi phí tháng đầu + Tiền đặt cọc
            </span>
          </div>
          <span className="text-base sm:text-lg font-extrabold text-primary shrink-0">
            {formatVND(estimate.estimatedInitialTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
