import React from "react";
import FormField, { inputClass, selectClass } from "../FormField";
import FormSectionWrapper from "../FormSectionWrapper";
import {
  FURNISHING_OPTIONS,
  LEGAL_STATUS_OPTIONS,
} from "../../constants";
import type { HouseDetailsData, FormErrors } from "../../types";

interface HouseDetailsSectionProps {
  data: HouseDetailsData;
  rentalType: string;
  errors: FormErrors;
  onChange: (updates: Partial<HouseDetailsData>) => void;
}

export default function HouseDetailsSection({
  data,
  rentalType,
  errors,
  onChange,
}: HouseDetailsSectionProps) {
  const isPartialRental = rentalType === "PARTIAL";

  return (
    <FormSectionWrapper
      id="section-details"
      stepNumber={2}
      title="Thông tin chi tiết — Nhà nguyên căn"
      description="Chi tiết về kết cấu, diện tích sử dụng, số tầng và tiện nghi của ngôi nhà"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Tổng diện tích sử dụng (Bắt buộc) */}
        <FormField
          id="field-total-usable-area"
          label="Tổng diện tích sử dụng (m²)"
          required
          error={errors.totalUsableAreaM2}
          hint="Tổng diện tích sàn tất cả các tầng cộng lại"
        >
          <input
            type="number"
            min="1"
            step="0.1"
            value={data.totalUsableAreaM2 ?? ""}
            onChange={(e) => onChange({ totalUsableAreaM2: e.target.value })}
            placeholder="Ví dụ: 180"
            className={`${inputClass} ${
              errors.totalUsableAreaM2 ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Diện tích đất */}
        <FormField
          id="field-land-area"
          label="Diện tích đất (m²)"
          error={errors.landAreaM2}
          hint="Diện tích khuôn viên đất"
        >
          <input
            type="number"
            min="1"
            step="0.1"
            value={data.landAreaM2 ?? ""}
            onChange={(e) => onChange({ landAreaM2: e.target.value })}
            placeholder="Ví dụ: 60"
            className={inputClass}
          />
        </FormField>

        {/* Chiều ngang mặt tiền */}
        <FormField
          id="field-facade-width"
          label="Chiều ngang mặt tiền (m)"
          error={errors.facadeWidthM}
        >
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={data.facadeWidthM ?? ""}
            onChange={(e) => onChange({ facadeWidthM: e.target.value })}
            placeholder="Ví dụ: 4.5"
            className={inputClass}
          />
        </FormField>

        {/* Chiều dài */}
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

        {/* Độ rộng đường/hẻm phía trước */}
        <FormField
          id="field-street-width"
          label="Độ rộng đường/hẻm phía trước (m)"
          error={errors.streetWidthM}
          hint="Độ rộng mặt đường/hẻm xe hơi ra vào"
        >
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={data.streetWidthM ?? ""}
            onChange={(e) => onChange({ streetWidthM: e.target.value })}
            placeholder="Ví dụ: 6 (xe hơi vào tận cửa)"
            className={inputClass}
          />
        </FormField>

        {/* Số mặt tiền */}
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
            <option value="2">2 mặt tiền (Căn góc)</option>
            <option value="3">3 mặt tiền</option>
          </select>
        </FormField>

        {/* Tổng số tầng (Bắt buộc) */}
        <FormField
          id="field-total-floors"
          label="Tổng số tầng"
          required
          error={errors.totalFloors}
          hint="Ví dụ: 1 trệt 2 lầu = 3 tầng"
        >
          <input
            type="number"
            min="1"
            step="1"
            value={data.totalFloors ?? ""}
            onChange={(e) => onChange({ totalFloors: e.target.value })}
            placeholder="Ví dụ: 3"
            className={`${inputClass} ${
              errors.totalFloors ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Tình trạng nội thất (Bắt buộc) */}
        <FormField
          id="field-furnishing"
          label="Tình trạng nội thất"
          required
          error={errors.furnishing}
        >
          <select
            value={data.furnishing}
            onChange={(e) => onChange({ furnishing: e.target.value })}
            className={selectClass}
          >
            {FURNISHING_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Số phòng ngủ (Bắt buộc) */}
        <FormField
          id="field-bedrooms"
          label="Số phòng ngủ"
          required
          error={errors.bedrooms}
        >
          <input
            type="number"
            min="1"
            step="1"
            value={data.bedrooms ?? ""}
            onChange={(e) => onChange({ bedrooms: e.target.value })}
            placeholder="Ví dụ: 3"
            className={`${inputClass} ${
              errors.bedrooms ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Số phòng tắm (Bắt buộc) */}
        <FormField
          id="field-bathrooms"
          label="Số phòng tắm / WC"
          required
          error={errors.bathrooms}
        >
          <input
            type="number"
            min="1"
            step="1"
            value={data.bathrooms ?? ""}
            onChange={(e) => onChange({ bathrooms: e.target.value })}
            placeholder="Ví dụ: 3"
            className={`${inputClass} ${
              errors.bathrooms ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Số phòng khách */}
        <FormField
          id="field-living-rooms"
          label="Số phòng khách"
          error={errors.livingRooms}
        >
          <input
            type="number"
            min="0"
            step="1"
            value={data.livingRooms ?? ""}
            onChange={(e) => onChange({ livingRooms: e.target.value })}
            placeholder="Ví dụ: 1"
            className={inputClass}
          />
        </FormField>

        {/* Số phòng bếp */}
        <FormField
          id="field-kitchens"
          label="Số phòng bếp"
          error={errors.kitchens}
        >
          <input
            type="number"
            min="0"
            step="1"
            value={data.kitchens ?? ""}
            onChange={(e) => onChange({ kitchens: e.target.value })}
            placeholder="Ví dụ: 1"
            className={inputClass}
          />
        </FormField>

        {/* Tiện ích kết cấu bổ sung */}
        <div className="sm:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 text-xs font-medium text-foreground cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={data.hasRooftopTerrace ?? false}
              onChange={(e) => onChange({ hasRooftopTerrace: e.target.checked })}
              className="h-4 w-4 rounded accent-primary"
            />
            Có sân thượng
          </label>

          <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 text-xs font-medium text-foreground cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={data.hasGarage ?? false}
              onChange={(e) => onChange({ hasGarage: e.target.checked })}
              className="h-4 w-4 rounded accent-primary"
            />
            Có garage / sân để xe
          </label>

          <div className="flex h-11 items-center gap-2 rounded-xl border border-border bg-muted/30 px-3">
            <span className="text-xs text-muted-foreground">Lối đi:</span>
            <select
              value={data.privateEntrance ?? "PRIVATE"}
              onChange={(e) => onChange({ privateEntrance: e.target.value })}
              className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer"
            >
              <option value="PRIVATE">Lối đi riêng biệt</option>
              <option value="SHARED">Lối đi chung</option>
            </select>
          </div>
        </div>

        {/* Số người & xe tối đa */}
        <FormField
          id="field-max-occupants"
          label="Số người ở tối đa"
          error={errors.maxOccupants}
        >
          <input
            type="number"
            min="1"
            step="1"
            value={data.maxOccupants ?? ""}
            onChange={(e) => onChange({ maxOccupants: e.target.value })}
            placeholder="Ví dụ: 6 người"
            className={inputClass}
          />
        </FormField>

        <FormField
          id="field-max-vehicles"
          label="Số xe tối đa"
          error={errors.maxVehicles}
        >
          <input
            type="number"
            min="0"
            step="1"
            value={data.maxVehicles ?? ""}
            onChange={(e) => onChange({ maxVehicles: e.target.value })}
            placeholder="Ví dụ: 4 xe máy, 1 ô tô"
            className={inputClass}
          />
        </FormField>

        {/* Giấy tờ pháp lý */}
        <FormField
          id="field-legal-status"
          label="Giấy tờ pháp lý"
          error={errors.legalStatus}
          className="sm:col-span-2"
        >
          <select
            value={data.legalStatus ?? "PINK_BOOK"}
            onChange={(e) => onChange({ legalStatus: e.target.value })}
            className={selectClass}
          >
            {LEGAL_STATUS_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Nếu hình thức là Cho thuê Một phần căn nhà */}
        {isPartialRental && (
          <div className="sm:col-span-2 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <h3 className="text-xs font-bold text-primary">
              Thông tin bổ sung cho thuê một phần căn nhà
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                id="field-rental-scope"
                label="Phạm vi cho thuê"
                error={errors.rentalScope}
              >
                <input
                  type="text"
                  value={data.rentalScope ?? ""}
                  onChange={(e) => onChange({ rentalScope: e.target.value })}
                  placeholder="Ví dụ: Nguyên tầng trệt, Lầu 1 và 2..."
                  className={inputClass}
                />
              </FormField>

              <FormField
                id="field-rental-floor"
                label="Tầng được cho thuê"
                error={errors.rentalFloor}
              >
                <input
                  type="text"
                  value={data.rentalFloor ?? ""}
                  onChange={(e) => onChange({ rentalFloor: e.target.value })}
                  placeholder="Ví dụ: Tầng 1, Tầng 2"
                  className={inputClass}
                />
              </FormField>

              <FormField
                id="field-shared-entrance"
                label="Lối đi sử dụng"
                error={errors.sharedEntrance}
              >
                <select
                  value={data.sharedEntrance ?? "SHARED"}
                  onChange={(e) => onChange({ sharedEntrance: e.target.value })}
                  className={selectClass}
                >
                  <option value="SHARED">Đi chung với chủ nhà / người khác</option>
                  <option value="PRIVATE">Có lối đi riêng độc lập</option>
                </select>
              </FormField>
            </div>
          </div>
        )}
      </div>
    </FormSectionWrapper>
  );
}
