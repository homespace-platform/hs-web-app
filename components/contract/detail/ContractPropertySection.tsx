"use client";

import React from "react";
import { Home, Key } from "lucide-react";
import { FieldRow, str } from "./utils";
import { useAmendmentWorkspace } from "./ContractAmendmentWorkspace";
import { ContractTermFields, PropertyFeaturesEditor } from "./InlineAmendmentFields";
import { contractPropertyFeatureValue } from "@/lib/contract-property-feature-labels";
import { squareMetresText } from "@/lib/contract-amendment-input";

interface ContractPropertySectionProps {
  property: Record<string, unknown>;
}

export default function ContractPropertySection({
  property: originalProperty,
}: ContractPropertySectionProps) {
  const w = useAmendmentWorkspace();
  const property = w?.data?.currentTerms.property ?? originalProperty;
  // Format unit and floor cleanly
  const unitNumber = property.unitNumber;
  const floor = property.floor;
  const rentalScope = property.rentalScope;
  const maxOccupants = property.maxOccupants;
  const maxVehicles = property.maxVehicles;
  const listingCode = property.listingCode;
  const features = Array.isArray(property.features) ? property.features as Record<string, unknown>[] : [];

  if (w?.editing) return <section id="amendment-property" className="scroll-mt-24 rounded-2xl border bg-card p-4.5 space-y-3">
    <h3 className="text-sm font-bold">Thông tin bất động sản bàn giao</h3>
    <ContractTermFields group="property" fields={[["fullAddress","Địa chỉ tài sản"],["propertyType","Loại hình"],["areaText","Diện tích sử dụng",false,"Đơn vị: mét vuông."],["unitNumber","Số căn / phòng"],["floor","Tầng / Độ cao"],["rentalScope","Phạm vi cho thuê"],["maxOccupants","Số người tối đa"],["maxVehicles","Số xe tối đa"],["listingCode","Mã tin đăng"]]}/>
    <p className="text-xs text-muted-foreground">Điều chỉnh nội dung mô tả, không chuyển hợp đồng sang Listing hoặc tài sản khác.</p>
    <PropertyFeaturesEditor/>
  </section>;

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
            Mã tin: <code data-contract-field-state="editable" className="text-blue-700! dark:text-blue-400!">{str(listingCode)}</code>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5">
        <FieldRow editable
          label="Địa chỉ tài sản"
          value={property.fullAddress}
          highlight
        />
        <FieldRow editable label="Loại hình" value={property.propertyType} />
        <FieldRow editable label="Diện tích sử dụng" value={squareMetresText(property.areaText)} />
        <FieldRow editable
          label="Số căn / phòng"
          value={unitNumber ? str(unitNumber) : "Toàn bộ căn"}
        />
        <FieldRow editable label="Tầng / Độ cao" value={floor} />
        <FieldRow editable
          label="Phạm vi cho thuê"
          value={rentalScope ? str(rentalScope) : "Toàn bộ diện tích tài sản"}
        />
        <FieldRow editable
          label="Số người tối đa"
          value={
            maxOccupants !== undefined && maxOccupants !== null && String(maxOccupants).trim() !== ""
              ? `${maxOccupants} người`
              : "Theo thỏa thuận"
          }
        />
        <FieldRow editable
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
      {features.length > 0 && <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-xs"><thead className="bg-muted/40"><tr><th className="p-3">Đặc điểm tài sản</th><th className="p-3">Giá trị</th></tr></thead><tbody>{features.map((row,i)=><tr key={i} className="border-t"><td className="p-3">{str(row.featureName)}</td><td data-contract-field-state="editable" className="p-3 text-blue-700! dark:text-blue-400!">{str(contractPropertyFeatureValue(row.featureName,row.featureValue))}</td></tr>)}</tbody></table></div>}
    </section>
  );
}
