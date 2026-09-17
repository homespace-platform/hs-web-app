"use client";

import React from "react";
import { Gauge, Info } from "lucide-react";
import { FieldRow } from "./utils";

interface ContractHandoverSectionProps {
  electricityInitial?: string | null;
  waterInitial?: string | null;
  isWaterPerPerson?: boolean;
  isDraft: boolean;
  isLandlord: boolean;
  onElectricityChange?: (val: string) => void;
  onWaterChange?: (val: string) => void;
}

export default function ContractHandoverSection({
  electricityInitial,
  waterInitial,
  isWaterPerPerson,
  isDraft,
  isLandlord,
  onElectricityChange,
  onWaterChange,
}: ContractHandoverSectionProps) {
  const displayElectricity = electricityInitial?.trim()
    ? electricityInitial
    : "Sẽ cập nhật tại biên bản bàn giao";

  const displayWater = isWaterPerPerson
    ? "Không áp dụng đồng hồ nước (Tính theo đầu người)"
    : waterInitial?.trim()
      ? waterInitial
      : "Sẽ cập nhật tại biên bản bàn giao";

  return (
    <section className="rounded-2xl border border-border bg-card p-4.5 space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Chỉ số công tơ lúc bàn giao (Tùy chọn)
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Chỉ số công tơ thực tế có thể cập nhật chính xác tại thời điểm bàn giao nhà
            </p>
          </div>
        </div>

        <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-md bg-muted self-start sm:self-auto">
          Không bắt buộc trước khi gửi
        </span>
      </div>

      {isDraft && isLandlord ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <label className="space-y-1.5 text-xs font-semibold text-foreground">
            <span>Chỉ số điện ban đầu (Nếu đã có)</span>
            <input
              value={electricityInitial || ""}
              onChange={(e) => onElectricityChange?.(e.target.value)}
              placeholder="Ví dụ: 1250 kWh (Tùy chọn)"
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <span className="text-[10px] text-muted-foreground font-normal block">
              Để trống nếu sẽ ghi nhận trực tiếp khi giao chìa khóa.
            </span>
          </label>

          <label className="space-y-1.5 text-xs font-semibold text-foreground">
            <span>Chỉ số nước ban đầu</span>
            <input
              value={isWaterPerPerson ? "" : waterInitial || ""}
              onChange={(e) => onWaterChange?.(e.target.value)}
              disabled={isWaterPerPerson}
              placeholder={
                isWaterPerPerson
                  ? "Không áp dụng đồng hồ nước"
                  : "Ví dụ: 85 m³ (Tùy chọn)"
              }
              className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-muted disabled:text-muted-foreground"
            />
            <span className="text-[10px] text-muted-foreground font-normal block">
              {isWaterPerPerson
                ? "Nước tính theo đầu người hàng tháng."
                : "Để trống nếu sẽ ghi nhận tại biên bản bàn giao."}
            </span>
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
          <FieldRow label="Chỉ số điện ban đầu" value={displayElectricity} />
          <FieldRow label="Chỉ số nước ban đầu" value={displayWater} />
        </div>
      )}

      <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <span>
          Hợp đồng này quy định đơn giá và cách tính. Chỉ số thực tế của công tơ điện và đồng hồ nước được hai bên chốt và ký tại Biên bản bàn giao khi nhận nhà.
        </span>
      </div>
    </section>
  );
}
