"use client";

import React from "react";
import Link from "next/link";
import {
  Info,
  Plus,
  Trash2,
  Zap,
  Droplet,
  Shield,
  Wifi,
  Sparkles,
  Bike,
  Car,
  Layers,
  ExternalLink,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { inputClass, selectClass } from "./FormField";
import FormSectionWrapper from "./FormSectionWrapper";
import type {
  MonthlyExpensesData,
  PropertyCategoryKey,
  CustomMonthlyFee,
  FormErrors,
} from "../types";
import type { PropertyBranch } from "@/services/branch.service";
import { getChargeDisplay, getChargeMeta } from "@/app/dashboard/branches/page";

interface MonthlyExpensesSectionProps {
  category: PropertyCategoryKey;
  data: MonthlyExpensesData;
  errors?: FormErrors;
  isBranchSelected?: boolean;
  selectedBranch?: PropertyBranch | null;
  onChange: (updates: Partial<MonthlyExpensesData>) => void;
}

export default function MonthlyExpensesSection({
  category,
  data,
  isBranchSelected = false,
  selectedBranch = null,
  onChange,
}: MonthlyExpensesSectionProps) {
  const showManagementFee = category === "apartment";

  function handleAddCustomFee() {
    const newFee: CustomMonthlyFee = {
      id: `fee-${Date.now()}`,
      name: "",
      amount: "",
      unit: "tháng",
    };
    onChange({ customFees: [...data.customFees, newFee] });
  }

  function handleUpdateCustomFee(
    id: string,
    field: keyof CustomMonthlyFee,
    value: string | number
  ) {
    const updated = data.customFees.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange({ customFees: updated });
  }

  function handleRemoveCustomFee(id: string) {
    onChange({
      customFees: data.customFees.filter((item) => item.id !== id),
    });
  }

  // =========================================================================
  // READ-ONLY / PREVIEW MODE (When Branch is Selected)
  // =========================================================================
  if (isBranchSelected && selectedBranch) {
    const isChargesIncomplete = selectedBranch.isComplete === false || (selectedBranch.missingCharges && selectedBranch.missingCharges.length > 0);

    return (
      <FormSectionWrapper
        id="section-monthly-expenses"
        stepNumber={4}
        title="Chi phí hàng tháng"
        description="Biểu phí dịch vụ định kỳ áp dụng cho người thuê"
      >
        <div className="space-y-4">
          {/* Informative Header Banner */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-900/60 dark:bg-sky-950/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-sky-950 dark:text-sky-100 flex items-center gap-2">
                    Biểu phí cố định theo chi nhánh: {selectedBranch.name}
                  </h4>
                  <p className="mt-0.5 text-[11px] text-sky-800 dark:text-sky-200">
                    Toàn bộ chi phí hàng tháng được quản lý tập trung từ Chi nhánh / Tòa nhà. Để điều chỉnh các mức phí này, vui lòng chỉnh sửa trực tiếp tại Chi nhánh.
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/branches/${selectedBranch.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 self-start sm:self-center shrink-0 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition-colors"
              >
                <span>Chỉnh sửa biểu phí chi nhánh</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Incomplete Charges Alert (if any) */}
          {isChargesIncomplete && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <h5 className="text-xs font-bold">Biểu phí chi nhánh chưa hoàn thiện!</h5>
                  <p className="text-[11px]">
                    Chi nhánh &quot;{selectedBranch.name}&quot; còn thiếu các biểu phí bắt buộc:{" "}
                    <strong>{selectedBranch.missingCharges?.join(", ")}</strong>. Bạn cần bổ sung biểu phí tại chi nhánh trước khi gửi duyệt hoặc lưu tin đăng.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* High-contrast Read-only Charges Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {selectedBranch.defaultCharges && selectedBranch.defaultCharges.length > 0 ? (
              selectedBranch.defaultCharges.map((c, i) => {
                const meta = getChargeMeta(c.chargeType);
                const IconComp = meta.icon;
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-border bg-card p-3.5 space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                        <IconComp className={`h-4 w-4 ${meta.color}`} />
                        {c.chargeType === "OTHER" ? (c.customName || "Phí khác") : meta.label}
                      </span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                        Chi nhánh
                      </span>
                    </div>
                    <p className="text-sm font-bold text-foreground">
                      {getChargeDisplay(c)}
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground italic col-span-full">
                Chi nhánh chưa có thông tin biểu phí.
              </p>
            )}
          </div>

          {/* Parking Policy Note */}
          <div className="rounded-xl border border-border/80 bg-muted/20 px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">
              Sức chứa bãi xe chi nhánh:
            </span>
            <span className="font-bold text-foreground">
              🏍️ {selectedBranch.motorbikeParkingCapacity ?? 0} xe máy • 🚗 {selectedBranch.carParkingCapacity ?? 0} ô tô
            </span>
          </div>
        </div>
      </FormSectionWrapper>
    );
  }

  // =========================================================================
  // EDITABLE MODE (Standalone Listing / No Branch Selected)
  // =========================================================================
  return (
    <FormSectionWrapper
      id="section-monthly-expenses"
      stepNumber={4}
      title="Chi phí hàng tháng"
      description="Minh bạch chi phí điện, nước và các dịch vụ đi kèm giúp người thuê dễ dàng tính toán"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Tiền điện */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-500" /> Tiền điện
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.electricityType}
              onChange={(e) =>
                onChange({
                  electricityType: e.target.value as MonthlyExpensesData["electricityType"],
                })
              }
              className={selectClass}
            >
              <option value="KWH">Tính theo số công tơ (kWh)</option>
              <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
            </select>

            {data.electricityType === "KWH" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={data.electricityPrice}
                  onChange={(e) => onChange({ electricityPrice: e.target.value })}
                  placeholder="3500"
                  className={`${inputClass} pr-16`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  đ/kWh
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                Miễn phí tiền điện
              </div>
            )}
          </div>
        </div>

        {/* Tiền nước */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
            <Droplet className="h-4 w-4 text-blue-500" /> Tiền nước sinh hoạt
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.waterType}
              onChange={(e) =>
                onChange({
                  waterType: e.target.value as MonthlyExpensesData["waterType"],
                })
              }
              className={selectClass}
            >
              <option value="M3">Tính theo khối (m³)</option>
              <option value="PER_PERSON">Tính theo người / tháng</option>
              <option value="FLAT_ROOM">Khoán theo phòng / tháng</option>
              <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
            </select>

            {data.waterType !== "INCLUDED" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={data.waterPrice}
                  onChange={(e) => onChange({ waterPrice: e.target.value })}
                  placeholder="25000"
                  className={`${inputClass} pr-24`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  {data.waterType === "M3"
                    ? "đ/m³"
                    : data.waterType === "PER_PERSON"
                    ? "đ/người"
                    : "đ/phòng"}
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                Miễn phí tiền nước
              </div>
            )}
          </div>
        </div>

        {/* Phí quản lý (Chỉ với căn hộ) */}
        {showManagementFee && (
          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
            <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500" /> Phí quản lý tòa nhà
            </label>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <select
                value={data.managementFeeType}
                onChange={(e) =>
                  onChange({
                    managementFeeType: e.target.value as MonthlyExpensesData["managementFeeType"],
                  })
                }
                className={selectClass}
              >
                <option value="NONE">Không áp dụng</option>
                <option value="MONTHLY">Cố định theo tháng</option>
                <option value="PER_M2">Tính theo m² / tháng</option>
                <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
              </select>

              {data.managementFeeType === "MONTHLY" ||
              data.managementFeeType === "PER_M2" ? (
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={data.managementFee}
                    onChange={(e) => onChange({ managementFee: e.target.value })}
                    placeholder="150000"
                    className={`${inputClass} pr-20`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    {data.managementFeeType === "PER_M2" ? "đ/m²" : "đ/tháng"}
                  </span>
                </div>
              ) : (
                <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                  {data.managementFeeType === "INCLUDED"
                    ? "Đã bao gồm trong giá"
                    : "Không áp dụng"}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Internet / Wifi */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
            <Wifi className="h-4 w-4 text-purple-500" /> Internet / Wifi
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.internetType}
              onChange={(e) =>
                onChange({
                  internetType: e.target.value as MonthlyExpensesData["internetType"],
                })
              }
              className={selectClass}
            >
              <option value="SELF_PAY">Người thuê tự đăng ký</option>
              <option value="MONTHLY">Cố định theo phòng / tháng</option>
              <option value="INCLUDED">Miễn phí / Đã bao gồm</option>
            </select>

            {data.internetType === "MONTHLY" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={data.internetFee}
                  onChange={(e) => onChange({ internetFee: e.target.value })}
                  placeholder="100000"
                  className={`${inputClass} pr-20`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  đ/tháng
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                {data.internetType === "INCLUDED" ? "Miễn phí Wifi" : "Tự đăng ký"}
              </div>
            )}
          </div>
        </div>

        {/* Phí vệ sinh / Rác */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-500" /> Phí vệ sinh &amp; Rác
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.garbageFeeType}
              onChange={(e) =>
                onChange({
                  garbageFeeType: e.target.value as MonthlyExpensesData["garbageFeeType"],
                })
              }
              className={selectClass}
            >
              <option value="INCLUDED">Đã bao gồm trong giá thuê</option>
              <option value="MONTHLY">Thu theo phòng / tháng</option>
              <option value="NONE">Không áp dụng</option>
            </select>

            {data.garbageFeeType === "MONTHLY" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={data.garbageFee}
                  onChange={(e) => onChange({ garbageFee: e.target.value })}
                  placeholder="50000"
                  className={`${inputClass} pr-20`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  đ/tháng
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                {data.garbageFeeType === "INCLUDED" ? "Đã bao gồm" : "Không áp dụng"}
              </div>
            )}
          </div>
        </div>

        {/* Phí gửi xe máy */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
            <Bike className="h-4 w-4 text-orange-500" /> Phí giữ xe máy
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.motorbikeParkingType}
              onChange={(e) =>
                onChange({
                  motorbikeParkingType: e.target
                    .value as MonthlyExpensesData["motorbikeParkingType"],
                })
              }
              className={selectClass}
            >
              <option value="NONE">Không nhận giữ xe máy</option>
              <option value="INCLUDED">Miễn phí giữ xe</option>
              <option value="PER_VEHICLE">Thu phí theo xe / tháng</option>
            </select>

            {data.motorbikeParkingType === "PER_VEHICLE" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={data.motorbikeParkingFee}
                  onChange={(e) =>
                    onChange({ motorbikeParkingFee: e.target.value })
                  }
                  placeholder="120000"
                  className={`${inputClass} pr-24`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  đ/xe/tháng
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                {data.motorbikeParkingType === "INCLUDED"
                  ? "Miễn phí"
                  : "Không giữ xe"}
              </div>
            )}
          </div>
        </div>

        {/* Phí gửi ô tô */}
        <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <label className="block text-xs font-bold text-foreground flex items-center gap-1.5">
            <Car className="h-4 w-4 text-sky-500" /> Phí giữ ô tô
          </label>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <select
              value={data.carParkingType}
              onChange={(e) =>
                onChange({
                  carParkingType: e.target
                    .value as MonthlyExpensesData["carParkingType"],
                })
              }
              className={selectClass}
            >
              <option value="NONE">Không nhận giữ ô tô</option>
              <option value="INCLUDED">Miễn phí giữ ô tô</option>
              <option value="PER_VEHICLE">Thu phí theo xe / tháng</option>
            </select>

            {data.carParkingType === "PER_VEHICLE" ? (
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={data.carParkingFee}
                  onChange={(e) => onChange({ carParkingFee: e.target.value })}
                  placeholder="1200000"
                  className={`${inputClass} pr-24`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                  đ/xe/tháng
                </span>
              </div>
            ) : (
              <div className="flex h-10 items-center rounded-xl bg-muted/50 px-3 text-xs text-muted-foreground">
                {data.carParkingType === "INCLUDED"
                  ? "Miễn phí"
                  : "Không giữ ô tô"}
              </div>
            )}
          </div>
        </div>

        {/* Khoản phí tùy chỉnh khác (chỉ hiển thị khi độc lập) */}
        <div className="sm:col-span-2 space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-slate-500" /> Các khoản phí tùy chỉnh khác
              </p>
              <p className="text-[11px] text-muted-foreground">
                Thêm các khoản phí như thang máy, hồ bơi, giặt ủi... nếu có
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddCustomFee}
              className="inline-flex items-center gap-1 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm khoản phí
            </button>
          </div>

          {data.customFees.length > 0 && (
            <div className="space-y-2 pt-1">
              {data.customFees.map((fee) => (
                <div
                  key={fee.id}
                  className="flex flex-col sm:flex-row items-center gap-2 rounded-xl border border-border bg-card p-2.5 shadow-2xs"
                >
                  <input
                    type="text"
                    value={fee.name}
                    onChange={(e) =>
                      handleUpdateCustomFee(fee.id, "name", e.target.value)
                    }
                    placeholder="Tên khoản phí (VD: Thang máy)"
                    className={`${inputClass} flex-1`}
                  />
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={fee.amount}
                    onChange={(e) =>
                      handleUpdateCustomFee(fee.id, "amount", e.target.value)
                    }
                    placeholder="Số tiền (đ)"
                    className={`${inputClass} sm:w-36`}
                  />
                  <input
                    type="text"
                    value={fee.unit}
                    onChange={(e) =>
                      handleUpdateCustomFee(fee.id, "unit", e.target.value)
                    }
                    placeholder="Đơn vị (tháng/lần)"
                    className={`${inputClass} sm:w-32`}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomFee(fee.id)}
                    className="self-end sm:self-center p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FormSectionWrapper>
  );
}
