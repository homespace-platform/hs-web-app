"use client";

import React from "react";
import { Gauge, Info, Loader2 } from "lucide-react";
import { FieldRow } from "./utils";

interface ContractHandoverSectionProps {
  electricityInitial?: string | null;
  waterInitial?: string | null;
  isWaterPerPerson?: boolean;
  electricityRequired: boolean;
  waterRequired: boolean;
  isDraft: boolean;
  isLandlord: boolean;
  isDirty: boolean;
  saving: boolean;
  errors?: { electricity?: string; water?: string };
  onElectricityChange?: (val: string) => void;
  onWaterChange?: (val: string) => void;
  onSave?: () => void;
}

export default function ContractHandoverSection({
  electricityInitial,
  waterInitial,
  isWaterPerPerson,
  electricityRequired,
  waterRequired,
  isDraft,
  isLandlord,
  isDirty,
  saving,
  errors,
  onElectricityChange,
  onWaterChange,
  onSave,
}: ContractHandoverSectionProps) {
  const displayElectricity = electricityInitial?.trim()
    ? electricityInitial
    : "Chưa ghi nhận";

  const displayWater = isWaterPerPerson
    ? "Không áp dụng đồng hồ nước (Tính theo đầu người)"
    : waterInitial?.trim()
      ? waterInitial
      : "Chưa ghi nhận";

  return (
    <section id="contract-handover" className="rounded-2xl border border-border bg-card p-4.5 space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Chỉ số công tơ ban đầu
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Nhập chỉ số ban đầu khi khoản phí được tính theo đồng hồ để ghi vào hợp đồng.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-md bg-muted self-start sm:self-auto">
          Bắt buộc với phí tính theo đồng hồ
        </span>
      </div>

      {isDraft && isLandlord ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <label className="space-y-1.5 text-xs font-semibold text-foreground">
            <span>Chỉ số điện ban đầu (kWh) {electricityRequired && <span className="text-destructive">*</span>}</span>
            <input
              type="text"
              inputMode="decimal"
              maxLength={20}
              required={electricityRequired}
              aria-invalid={Boolean(errors?.electricity)}
              value={electricityInitial || ""}
              onChange={(e) => onElectricityChange?.(e.target.value)}
              placeholder="Ví dụ: 1250"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className={`text-[10px] font-normal block ${errors?.electricity ? "text-destructive" : "text-muted-foreground"}`}>
              {errors?.electricity || (electricityRequired ? "Nhập số không âm; 0 là hợp lệ." : "Không bắt buộc nếu điện không tính theo công tơ.")}
            </span>
          </label>

          <label className="space-y-1.5 text-xs font-semibold text-foreground">
            <span>Chỉ số nước ban đầu (m³) {waterRequired && <span className="text-destructive">*</span>}</span>
            <input
              type="text"
              inputMode="decimal"
              maxLength={20}
              required={waterRequired}
              aria-invalid={Boolean(errors?.water)}
              value={isWaterPerPerson ? "" : waterInitial || ""}
              onChange={(e) => onWaterChange?.(e.target.value)}
              disabled={isWaterPerPerson}
              placeholder={
                isWaterPerPerson
                  ? "Không áp dụng đồng hồ nước"
                  : "Ví dụ: 85"
              }
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-muted disabled:text-muted-foreground"
            />
            <span className={`text-[10px] font-normal block ${errors?.water ? "text-destructive" : "text-muted-foreground"}`}>
              {errors?.water || (isWaterPerPerson
                ? "Nước tính theo đầu người; không cần chỉ số đồng hồ."
                : waterRequired ? "Nhập số không âm; 0 là hợp lệ." : "Không bắt buộc nếu nước không tính theo đồng hồ.")}
            </span>
          </label>
          <div className="sm:col-span-2 flex items-center justify-end gap-3">
            {isDirty && <span className="text-[11px] text-amber-600">Có chỉ số chưa lưu</span>}
            <button type="button" disabled={!isDirty || saving} onClick={onSave}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Lưu chỉ số
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
          <FieldRow label="Chỉ số điện ban đầu (kWh)" value={displayElectricity} />
          <FieldRow label="Chỉ số nước ban đầu (m³)" value={displayWater} />
        </div>
      )}

      <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          Kiểm tra chỉ số thực tế cùng người thuê trước khi lưu. Chỉ số đã lưu sẽ được đưa vào bản hợp đồng kết xuất; nếu thay đổi sau đó, cần kết xuất lại file.
        </span>
      </div>
    </section>
  );
}
