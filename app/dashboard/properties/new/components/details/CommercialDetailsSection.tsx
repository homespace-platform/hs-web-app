import React from "react";
import FormField, { inputClass, selectClass } from "../FormField";
import FormSectionWrapper from "../FormSectionWrapper";
import type { CommercialDetailsData, FormErrors } from "../../types";

interface CommercialDetailsSectionProps {
  data: CommercialDetailsData;
  subtype: string;
  errors: FormErrors;
  onChange: (updates: Partial<CommercialDetailsData>) => void;
}

export const SPACE_POSITIONS = [
  { value: "GROUND_LEVEL", label: "Mặt đất / Tầng trệt" },
  { value: "UPPER_FLOOR", label: "Tầng lầu" },
  { value: "MALL_SPACE", label: "Trong trung tâm thương mại / Tòa nhà phức hợp" },
  { value: "OTHER", label: "Loại khác" },
];

export const COMMERCIAL_HANDOVER_OPTIONS = [
  { value: "RAW", label: "Bàn giao thô (Dễ dàng thiết kế theo nhận diện thương hiệu)" },
  { value: "BASIC", label: "Hoàn thiện cơ bản (Sàn, tường, đèn, cửa kính)" },
  { value: "FINISHED", label: "Đã hoàn thiện (Sẵn sàng kinh doanh ngay)" },
];

export const PARKING_OPTIONS = [
  { value: "NONE", label: "Không có chỗ để xe riêng" },
  { value: "MOTORBIKE", label: "Chỗ để xe máy" },
  { value: "CAR", label: "Chỗ đỗ ô tô" },
  { value: "BOTH", label: "Cả xe máy và ô tô" },
];

export default function CommercialDetailsSection({
  data,
  subtype,
  errors,
  onChange,
}: CommercialDetailsSectionProps) {
  const isFacadeRequired =
    subtype === "shop" || subtype === "showroom" || subtype === "shophouse";

  return (
    <FormSectionWrapper
      id="section-details"
      stepNumber={2}
      title="Thông tin chi tiết — Mặt bằng kinh doanh"
      description="Thông tin về diện tích, mặt tiền, vị trí không gian và các tiêu chuẩn kinh doanh"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Diện tích (Bắt buộc) */}
        <FormField
          id="field-commercial-area"
          label="Diện tích sử dụng (m²)"
          required
          error={errors.areaM2}
        >
          <input
            type="number"
            min="1"
            step="0.1"
            value={data.areaM2 ?? ""}
            onChange={(e) => onChange({ areaM2: e.target.value })}
            placeholder="Ví dụ: 85"
            className={`${inputClass} ${
              errors.areaM2 ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Vị trí không gian (Bắt buộc) */}
        <FormField
          id="field-space-position"
          label="Vị trí không gian"
          required
          error={errors.spacePosition}
        >
          <select
            value={data.spacePosition}
            onChange={(e) => onChange({ spacePosition: e.target.value })}
            className={selectClass}
          >
            {SPACE_POSITIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Chiều ngang mặt tiền (Bắt buộc với Shop, Showroom, Shophouse) */}
        <FormField
          id="field-facade-width"
          label="Chiều ngang mặt tiền (m)"
          required={isFacadeRequired}
          error={errors.facadeWidthM}
          hint={
            isFacadeRequired
              ? "Bắt buộc đối với Cửa hàng, Showroom, Shophouse"
              : "Chiều ngang phía trước mặt bằng"
          }
        >
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={data.facadeWidthM ?? ""}
            onChange={(e) => onChange({ facadeWidthM: e.target.value })}
            placeholder="Ví dụ: 6.5"
            className={`${inputClass} ${
              errors.facadeWidthM ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Chiều dài mặt bằng */}
        <FormField
          id="field-length"
          label="Chiều dài (m)"
          error={errors.lengthM}
        >
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={data.lengthM ?? ""}
            onChange={(e) => onChange({ lengthM: e.target.value })}
            placeholder="Ví dụ: 15"
            className={inputClass}
          />
        </FormField>

        {/* Tình trạng bàn giao (Bắt buộc) */}
        <FormField
          id="field-handover-condition"
          label="Tình trạng bàn giao"
          required
          error={errors.handoverCondition}
        >
          <select
            value={data.handoverCondition}
            onChange={(e) => onChange({ handoverCondition: e.target.value })}
            className={selectClass}
          >
            {COMMERCIAL_HANDOVER_OPTIONS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Chỗ để xe */}
        <FormField
          id="field-parking-option"
          label="Chỗ để xe cho khách & nhân viên"
          error={errors.parkingOption}
        >
          <select
            value={data.parkingOption ?? "BOTH"}
            onChange={(e) => onChange({ parkingOption: e.target.value })}
            className={selectClass}
          >
            {PARKING_OPTIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Độ rộng đường phía trước & Số mặt tiền */}
        <FormField
          id="field-street-width"
          label="Độ rộng mặt đường phía trước (m)"
          error={errors.streetWidthM}
        >
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={data.streetWidthM ?? ""}
            onChange={(e) => onChange({ streetWidthM: e.target.value })}
            placeholder="Ví dụ: 12"
            className={inputClass}
          />
        </FormField>

        <FormField
          id="field-frontage-count"
          label="Số mặt tiền"
          error={errors.frontageCount}
        >
          <select
            value={data.frontageCount ?? "1"}
            onChange={(e) => onChange({ frontageCount: e.target.value })}
            className={selectClass}
          >
            <option value="1">1 mặt tiền</option>
            <option value="2">2 mặt tiền (Lô góc đắc địa)</option>
            <option value="3">3 mặt tiền</option>
          </select>
        </FormField>

        {/* Số tầng cho thuê */}
        <FormField
          id="field-rental-floors-count"
          label="Số tầng cho thuê"
          error={errors.rentalFloorsCount}
        >
          <input
            type="number"
            min="1"
            step="1"
            value={data.rentalFloorsCount ?? ""}
            onChange={(e) => onChange({ rentalFloorsCount: e.target.value })}
            placeholder="Ví dụ: 1 hoặc 2 tầng"
            className={inputClass}
          />
        </FormField>

        {/* Số nhà vệ sinh */}
        <FormField
          id="field-commercial-toilets"
          label="Số nhà vệ sinh"
          error={errors.toiletsCount}
        >
          <input
            type="number"
            min="0"
            step="1"
            value={data.toiletsCount ?? ""}
            onChange={(e) => onChange({ toiletsCount: e.target.value })}
            placeholder="Ví dụ: 1"
            className={inputClass}
          />
        </FormField>

        <FormField
          id="field-private-entrance"
          label="Lối đi của mặt bằng"
          error={errors.privateEntrance}
        >
          <select
            value={data.privateEntrance ?? "PRIVATE"}
            onChange={(e) => onChange({ privateEntrance: e.target.value })}
            className={selectClass}
          >
            <option value="PRIVATE">Lối đi riêng biệt hoàn toàn</option>
            <option value="SHARED">Chung lối đi với tầng trên / chủ nhà</option>
          </select>
        </FormField>

        {/* Giờ hoạt động & Ngành nghề hạn chế */}
        <FormField
          id="field-operating-hours"
          label="Giờ hoạt động cho phép"
          error={errors.operatingHours}
        >
          <input
            type="text"
            value={data.operatingHours ?? ""}
            onChange={(e) => onChange({ operatingHours: e.target.value })}
            placeholder="Ví dụ: Tự do 24/7 hoặc 08:00 – 22:00"
            className={inputClass}
          />
        </FormField>

        <FormField
          id="field-restricted-industries"
          label="Ngành nghề bị hạn chế (nếu có)"
          error={errors.restrictedIndustries}
          hint="Ví dụ: Không kinh doanh đồ nướng, không làm quán bar / karaoke..."
        >
          <input
            type="text"
            value={data.restrictedIndustries ?? ""}
            onChange={(e) => onChange({ restrictedIndustries: e.target.value })}
            placeholder="Ví dụ: Không kinh doanh ăn uống khói mùi..."
            className={inputClass}
          />
        </FormField>

        {/* Tiêu chuẩn kỹ thuật bổ sung */}
        <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 text-xs font-medium text-foreground cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={data.hasThreePhasePower ?? false}
              onChange={(e) => onChange({ hasThreePhasePower: e.target.checked })}
              className="h-4 w-4 rounded accent-primary"
            />
            Có điện 3 pha công nghiệp
          </label>

          <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 text-xs font-medium text-foreground cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={data.hasFireSafety ?? true}
              onChange={(e) => onChange({ hasFireSafety: e.target.checked })}
              className="h-4 w-4 rounded accent-primary"
            />
            Hệ thống PCCC đạt chuẩn
          </label>

          <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 text-xs font-medium text-foreground cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={data.hasLoft ?? false}
              onChange={(e) => onChange({ hasLoft: e.target.checked })}
              className="h-4 w-4 rounded accent-primary"
            />
            Có gác lửng chứa đồ / nghỉ ngơi
          </label>
        </div>

        {/* Khu vực bốc dỡ hàng */}
        <FormField
          id="field-loading-area"
          label="Khu vực bốc dỡ hàng hóa"
          error={errors.loadingArea}
          className="sm:col-span-2"
        >
          <input
            type="text"
            value={data.loadingArea ?? ""}
            onChange={(e) => onChange({ loadingArea: e.target.value })}
            placeholder="Ví dụ: Xe tải 2.5 tấn đỗ cửa hoặc có đường bốc dỡ riêng sau tòa nhà"
            className={inputClass}
          />
        </FormField>
      </div>
    </FormSectionWrapper>
  );
}
