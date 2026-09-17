"use client";

import React from "react";
import { Home, Key } from "lucide-react";
import { FieldRow, str } from "./utils";

interface ContractPropertySectionProps {
  property: Record<string, unknown>;
}

export default function ContractPropertySection({
  property,
}: ContractPropertySectionProps) {
  // Format unit and floor cleanly
  const unitNumber = property.unitNumber;
  const floor = property.floor;
  const rentalScope = property.rentalScope;
  const maxOccupants = property.maxOccupants;
  const maxVehicles = property.maxVehicles;
  const listingCode = property.listingCode;

  return (
    <section className="rounded-2xl border border-border bg-card p-4.5 space-y-3 shadow-2xs">
      <div className="flex items-center justify-between border-b border-border/70 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Home className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            Thông tin bất động sản bàn giao
          </h3>
        </div>
        {Boolean(listingCode) && (
          <span className="text-[11px] font-medium text-muted-foreground">
            Mã tin: <code className="text-foreground">{str(listingCode)}</code>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
        <FieldRow
          label="Địa chỉ tài sản"
          value={property.fullAddress}
          highlight
        />
        <FieldRow label="Loại hình" value={property.propertyType} />
        <FieldRow label="Diện tích sử dụng" value={property.areaText} />
        <FieldRow
          label="Số căn / phòng"
          value={unitNumber ? str(unitNumber) : "Toàn bộ căn"}
        />
        <FieldRow label="Tầng / Độ cao" value={floor} />
        <FieldRow
          label="Phạm vi cho thuê"
          value={rentalScope ? str(rentalScope) : "Toàn bộ diện tích tài sản"}
        />
        <FieldRow
          label="Số người tối đa"
          value={
            maxOccupants !== undefined && maxOccupants !== null && String(maxOccupants).trim() !== ""
              ? `${maxOccupants} người`
              : "Theo thỏa thuận"
          }
        />
        <FieldRow
          label="Số xe tối đa"
          value={
            maxVehicles !== undefined && maxVehicles !== null && String(maxVehicles).trim() !== ""
              ? Number(maxVehicles) === 0
                ? "0 xe (Không giữ xe)"
                : `${maxVehicles} xe`
              : "Theo thỏa thuận"
          }
        />
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 flex items-center gap-2 text-xs text-muted-foreground">
        <Key className="w-3.5 h-3.5 text-primary shrink-0" />
        <span>
          Tài sản được bàn giao độc lập theo đúng hiện trạng mô tả trong hợp đồng và biên bản bàn giao đính kèm.
        </span>
      </div>
    </section>
  );
}
