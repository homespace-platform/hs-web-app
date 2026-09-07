import React from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { inputClass, selectClass } from "../FormField";
import { HANDOVER_CONDITIONS } from "../../constants";
import type { ListingOptionItem } from "@/types/listing.type";
import type { FurnishingAssetRow, FormErrors } from "../../types";

interface FurnishingAssetsSectionProps {
  rows: FurnishingAssetRow[];
  errors: FormErrors;
  required: boolean;
  furnishingOptions: ListingOptionItem[];
  onChange: (rows: FurnishingAssetRow[]) => void;
}

function emptyRow(): FurnishingAssetRow {
  return {
    itemCode: null,
    assetName: "",
    quantity: 1,
    handoverCondition: "GOOD",
    conditionNote: "",
  };
}

export default function FurnishingAssetsSection({
  rows,
  errors,
  required,
  furnishingOptions,
  onChange,
}: FurnishingAssetsSectionProps) {
  function toggleCatalogItem(item: ListingOptionItem) {
    const exists = rows.some((row) => row.itemCode === item.code);
    if (exists) {
      onChange(rows.filter((row) => row.itemCode !== item.code));
      return;
    }
    onChange([...rows, { ...emptyRow(), itemCode: item.code, assetName: item.name }]);
  }

  function updateRow(index: number, updates: Partial<FurnishingAssetRow>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-foreground">
          Nội thất & trang thiết bị bàn giao{" "}
          {required && <span className="text-destructive">*</span>}
        </label>
        <span className="text-[11px] text-muted-foreground">
          {rows.length} tài sản
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {furnishingOptions.map((item) => {
          const selected = rows.some((row) => row.itemCode === item.code);
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => toggleCatalogItem(item)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-2xs"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-primary"
              }`}
            >
              {selected && <Check className="h-3 w-3" />}
              {item.name}
            </button>
          );
        })}
      </div>

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="w-12 px-3 py-2">STT</th>
                <th className="px-3 py-2">Tên tài sản / Trang thiết bị *</th>
                <th className="w-24 px-3 py-2">Số lượng *</th>
                <th className="w-52 px-3 py-2">Hiện trạng bàn giao *</th>
                <th className="px-3 py-2">Ghi chú</th>
                <th className="w-12 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const nameError = errors[`furnishingAssets.${index}.assetName`];
                const quantityError = errors[`furnishingAssets.${index}.quantity`];
                return (
                  <tr
                    key={`${row.itemCode ?? "custom"}-${index}`}
                    className="border-t border-border align-top"
                  >
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.assetName}
                        onChange={(e) => updateRow(index, { assetName: e.target.value })}
                        placeholder="Ví dụ: Máy lạnh Daikin Inverter 1.5 HP"
                        className={`${inputClass} ${
                          nameError ? "border-destructive focus:border-destructive" : ""
                        }`}
                      />
                      {nameError && (
                        <p className="mt-1 text-[11px] font-medium text-destructive">
                          {nameError}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={row.quantity ?? ""}
                        onChange={(e) => updateRow(index, { quantity: e.target.value })}
                        className={`${inputClass} ${
                          quantityError ? "border-destructive focus:border-destructive" : ""
                        }`}
                      />
                      {quantityError && (
                        <p className="mt-1 text-[11px] font-medium text-destructive">
                          {quantityError}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={row.handoverCondition}
                        onChange={(e) =>
                          updateRow(index, { handoverCondition: e.target.value })
                        }
                        className={selectClass}
                      >
                        {HANDOVER_CONDITIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.conditionNote ?? ""}
                        onChange={(e) => updateRow(index, { conditionNote: e.target.value })}
                        placeholder="Ví dụ: làm lạnh nhanh, còn bảo hành"
                        className={inputClass}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        aria-label={`Xóa tài sản dòng ${index + 1}`}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <button
        type="button"
        onClick={() => onChange([...rows, emptyRow()])}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Plus className="h-3.5 w-3.5" />
        Thêm tài sản khác
      </button>

      {errors.furnishingAssets ? (
        <p className="text-[11px] font-medium text-destructive">
          {errors.furnishingAssets}
        </p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Danh mục này được dùng làm biên bản bàn giao trong hợp đồng thuê.
        </p>
      )}
    </div>
  );
}
