"use client";

import React from "react";
import { Gauge, Info } from "lucide-react";
import { FieldRow } from "./utils";
import { ContractEditField } from "./ContractFieldState";

interface ContractHandoverSectionProps {
  formId?: string;
  electricityInitial?: string | null;
  waterInitial?: string | null;
  originalElectricityInitial?: string | null;
  originalWaterInitial?: string | null;
  isWaterPerPerson?: boolean;
  electricityRequired: boolean;
  waterRequired: boolean;
  isDraft: boolean;
  isLandlord: boolean;
  disabled?: boolean;
  priority?: boolean;
  missingFieldsNotice?: React.ReactNode;
  errors?: { electricity?: string; water?: string };
  onElectricityChange?: (val: string) => void;
  onWaterChange?: (val: string) => void;
}

export default function ContractHandoverSection({
  formId,
  electricityInitial,
  waterInitial,
  originalElectricityInitial,
  originalWaterInitial,
  isWaterPerPerson,
  electricityRequired,
  waterRequired,
  isDraft,
  isLandlord,
  disabled,
  priority=false,
  missingFieldsNotice,
  errors,
  onElectricityChange,
  onWaterChange,
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
    <section id="contract-handover" aria-label="Chỉ số công tơ ban đầu"
      className={`scroll-mt-24 rounded-2xl border bg-card p-4.5 space-y-3 shadow-2xs ${priority ? "border-amber-300 dark:border-amber-800" : "border-border"}`}>
      {priority && missingFieldsNotice}
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
          <ContractEditField group="meters" changed={originalElectricityInitial!==undefined&&String(electricityInitial??"").trim()!==String(originalElectricityInitial??"").trim()}><label className="space-y-1.5 text-xs font-semibold text-foreground">
            <span>Chỉ số điện ban đầu (kWh) {electricityRequired && <span className="text-destructive">*</span>}</span>
            <input
              form={formId}
              type="text"
              inputMode="decimal"
              maxLength={20}
              required={electricityRequired}
              disabled={disabled}
              aria-invalid={Boolean(errors?.electricity)}
              value={electricityInitial || ""}
              onChange={(e) => onElectricityChange?.(e.target.value)}
              placeholder="Ví dụ: 1250"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className={`text-[10px] font-normal block ${errors?.electricity ? "text-destructive" : "text-muted-foreground"}`}>
              {errors?.electricity || (electricityRequired ? "Nhập số không âm; 0 là hợp lệ." : "Không bắt buộc nếu điện không tính theo công tơ.")}
            </span>
          </label></ContractEditField>

          <ContractEditField group="meters" readonly={isWaterPerPerson} changed={originalWaterInitial!==undefined&&String(waterInitial??"").trim()!==String(originalWaterInitial??"").trim()}><label className="space-y-1.5 text-xs font-semibold text-foreground">
            <span>Chỉ số nước ban đầu (m³) {waterRequired && <span className="text-destructive">*</span>}</span>
            <input
              form={formId}
              type="text"
              inputMode="decimal"
              maxLength={20}
              required={waterRequired}
              aria-invalid={Boolean(errors?.water)}
              value={isWaterPerPerson ? "" : waterInitial || ""}
              onChange={(e) => onWaterChange?.(e.target.value)}
              disabled={isWaterPerPerson || disabled}
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
          </label></ContractEditField>
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
          {isDraft && isLandlord ? "Kiểm tra chỉ số thực tế cùng người thuê. Các giá trị này được lưu cùng bản nháp khi bấm Lưu."
            : "Chỉ số ban đầu dùng để đối chiếu với nội dung hợp đồng và kỳ tính phí đầu tiên."}
        </span>
      </div>
    </section>
  );
}
