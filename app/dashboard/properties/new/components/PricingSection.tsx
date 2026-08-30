import React, { useMemo } from "react";
import FormField, { inputClass, selectClass } from "./FormField";
import FormSectionWrapper from "./FormSectionWrapper";
import {
  PRICE_UNITS_BY_CATEGORY,
  DEPOSIT_TYPES,
  PAYMENT_CYCLES,
} from "../constants";
import type {
  PricingData,
  PropertyCategoryKey,
  FormErrors,
  DepositType,
  PaymentCycleType,
} from "../types";

interface PricingSectionProps {
  category: PropertyCategoryKey;
  data: PricingData;
  errors: FormErrors;
  onChange: (updates: Partial<PricingData>) => void;
}

function formatVnd(value: number | string | undefined): string {
  if (value === undefined || value === "") return "";
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return new Intl.NumberFormat("vi-VN").format(num);
}

export default function PricingSection({
  category,
  data,
  errors,
  onChange,
}: PricingSectionProps) {
  const currentUnits = PRICE_UNITS_BY_CATEGORY[category] || [
    { value: "VND_MONTH", label: "VNĐ / tháng" },
  ];

  const formattedPriceHint = useMemo(() => {
    const raw = Number(data.priceMonthly);
    if (!raw || isNaN(raw)) return null;
    return `${formatVnd(raw)} ₫`;
  }, [data.priceMonthly]);

  const formattedDepositHint = useMemo(() => {
    if (data.depositType !== "AMOUNT") return null;
    const raw = Number(data.depositAmount);
    if (!raw || isNaN(raw)) return null;
    return `${formatVnd(raw)} ₫`;
  }, [data.depositType, data.depositAmount]);

  const showVatOption = category === "office" || category === "commercial";

  return (
    <FormSectionWrapper
      id="section-pricing"
      stepNumber={5}
      title="Giá &amp; Điều kiện thuê"
      description="Thiết lập mức giá cho thuê, tiền cọc, chu kỳ thanh toán và điều kiện hợp đồng"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Giá thuê */}
        <FormField
          id="field-price-monthly"
          label="Giá thuê"
          required
          error={errors.priceMonthly}
          hint={
            formattedPriceHint
              ? `Bằng chữ số: ${formattedPriceHint}`
              : "Nhập số tiền thuê bằng VNĐ (VD: 15000000)"
          }
        >
          <div className="relative">
            <input
              type="number"
              min="100000"
              step="50000"
              value={data.priceMonthly ?? ""}
              onChange={(e) => onChange({ priceMonthly: e.target.value })}
              placeholder="Ví dụ: 12000000"
              className={`${inputClass} ${
                errors.priceMonthly ? "border-destructive focus:border-destructive" : ""
              }`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
              VNĐ
            </span>
          </div>
        </FormField>

        {/* Đơn vị tính giá */}
        <FormField
          id="field-price-unit"
          label="Đơn vị tính giá"
          required
          error={errors.priceUnit}
        >
          <select
            value={data.priceUnit}
            onChange={(e) => onChange({ priceUnit: e.target.value })}
            className={selectClass}
          >
            {currentUnits.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Tiền cọc */}
        <FormField
          id="field-deposit-type"
          label="Quy định tiền cọc"
          required
          error={errors.depositType}
        >
          <select
            value={data.depositType}
            onChange={(e) =>
              onChange({ depositType: e.target.value as DepositType })
            }
            className={selectClass}
          >
            {DEPOSIT_TYPES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Số tiền cọc hoặc số tháng cọc */}
        {data.depositType === "AMOUNT" && (
          <FormField
            id="field-deposit-amount"
            label="Số tiền cọc (VNĐ)"
            required
            error={errors.depositAmount}
            hint={
              formattedDepositHint
                ? `Bằng chữ số: ${formattedDepositHint}`
                : undefined
            }
          >
            <div className="relative">
              <input
                type="number"
                min="0"
                step="100000"
                value={data.depositAmount ?? ""}
                onChange={(e) => onChange({ depositAmount: e.target.value })}
                placeholder="Ví dụ: 24000000"
                className={`${inputClass} ${
                  errors.depositAmount ? "border-destructive focus:border-destructive" : ""
                }`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                VNĐ
              </span>
            </div>
          </FormField>
        )}

        {data.depositType === "MONTHS" && (
          <FormField
            id="field-deposit-months"
            label="Số tháng tiền cọc"
            required
            error={errors.depositMonths}
          >
            <div className="relative">
              <input
                type="number"
                min="1"
                step="0.5"
                value={data.depositMonths ?? ""}
                onChange={(e) => onChange({ depositMonths: e.target.value })}
                placeholder="Ví dụ: 1 hoặc 2 tháng"
                className={`${inputClass} ${
                  errors.depositMonths ? "border-destructive focus:border-destructive" : ""
                }`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                tháng
              </span>
            </div>
          </FormField>
        )}

        {/* Chu kỳ thanh toán */}
        <FormField
          id="field-payment-cycle"
          label="Chu kỳ thanh toán"
          required
          error={errors.paymentCycle}
        >
          <select
            value={data.paymentCycle}
            onChange={(e) =>
              onChange({ paymentCycle: e.target.value as PaymentCycleType })
            }
            className={selectClass}
          >
            {PAYMENT_CYCLES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Thời hạn thuê tối thiểu */}
        <FormField
          id="field-minimum-lease"
          label="Thời hạn thuê tối thiểu"
          required
          error={errors.minimumLeaseMonths}
        >
          <div className="relative">
            <input
              type="number"
              min="1"
              step="1"
              value={data.minimumLeaseMonths ?? ""}
              onChange={(e) => onChange({ minimumLeaseMonths: e.target.value })}
              placeholder="Ví dụ: 6 hoặc 12"
              className={`${inputClass} ${
                errors.minimumLeaseMonths ? "border-destructive focus:border-destructive" : ""
              }`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
              tháng
            </span>
          </div>
        </FormField>

        {/* Checkbox tùy chọn thương lượng & thuế VAT */}
        <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 text-xs font-medium text-foreground cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={data.isNegotiable}
              onChange={(e) => onChange({ isNegotiable: e.target.checked })}
              className="h-4 w-4 rounded accent-primary"
            />
            Giá thuê có thương lượng
          </label>

          {showVatOption && (
            <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 text-xs font-medium text-foreground cursor-pointer hover:bg-muted/50">
              <input
                type="checkbox"
                checked={data.includeVat}
                onChange={(e) => onChange({ includeVat: e.target.checked })}
                className="h-4 w-4 rounded accent-primary"
              />
              Giá đã bao gồm thuế VAT (Xuất hóa đơn)
            </label>
          )}
        </div>
      </div>
    </FormSectionWrapper>
  );
}
