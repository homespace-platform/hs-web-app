import React from "react";
import FormField, { inputClass, selectClass } from "../FormField";
import FormSectionWrapper from "../FormSectionWrapper";
import {
  FURNISHING_OPTIONS,
  LEGAL_STATUS_OPTIONS,
  ORIENTATIONS,
} from "../../constants";
import type { ApartmentDetailsData, FormErrors } from "../../types";

interface ApartmentDetailsSectionProps {
  data: ApartmentDetailsData;
  subtype: string;
  errors: FormErrors;
  onChange: (updates: Partial<ApartmentDetailsData>) => void;
}

export default function ApartmentDetailsSection({
  data,
  subtype,
  errors,
  onChange,
}: ApartmentDetailsSectionProps) {
  const isStudio = subtype === "studio";

  return (
    <FormSectionWrapper
      id="section-details"
      stepNumber={2}
      title="Thông tin chi tiết — Căn hộ / Chung cư"
      description="Chi tiết về diện tích, số phòng, tầng và hiện trạng căn hộ"
    >
      {isStudio && (
        <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200">
          <span className="font-semibold">Lưu ý loại hình Studio:</span> Cho phép số phòng ngủ bằng 0 (không gian mở liền kề).
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Tên dự án / chung cư */}
        <FormField
          id="field-project-name"
          label="Tên dự án / Chung cư"
          required
          error={errors.projectName}
          className="sm:col-span-2"
        >
          <input
            type="text"
            value={data.projectName}
            onChange={(e) => onChange({ projectName: e.target.value })}
            placeholder="Ví dụ: Vinhomes Central Park, Masteri Thảo Điền..."
            className={`${inputClass} ${
              errors.projectName ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Tòa / Block */}
        <FormField
          id="field-building-block"
          label="Tòa / Block"
          error={errors.buildingBlock}
        >
          <input
            type="text"
            value={data.buildingBlock ?? ""}
            onChange={(e) => onChange({ buildingBlock: e.target.value })}
            placeholder="Ví dụ: Landmark 81, Tòa A2"
            className={inputClass}
          />
        </FormField>

        {/* Mã căn */}
        <FormField
          id="field-unit-number"
          label="Mã căn"
          error={errors.unitNumber}
          hint="Mã số căn hộ (tùy chọn)"
        >
          <input
            type="text"
            value={data.unitNumber ?? ""}
            onChange={(e) => onChange({ unitNumber: e.target.value })}
            placeholder="Ví dụ: L81-12.04"
            className={inputClass}
          />
        </FormField>

        {/* Diện tích (m²) */}
        <FormField
          id="field-area-m2"
          label="Diện tích (m²)"
          required
          error={errors.areaM2}
        >
          <input
            type="number"
            min="1"
            step="0.1"
            value={data.areaM2 ?? ""}
            onChange={(e) => onChange({ areaM2: e.target.value })}
            placeholder="Ví dụ: 75"
            className={`${inputClass} ${
              errors.areaM2 ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Tầng căn hộ */}
        <FormField
          id="field-floor"
          label="Tầng căn hộ"
          required
          error={errors.floor}
        >
          <input
            type="number"
            min="0"
            step="1"
            value={data.floor ?? ""}
            onChange={(e) => onChange({ floor: e.target.value })}
            placeholder="Ví dụ: 12"
            className={`${inputClass} ${
              errors.floor ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Tổng số tầng tòa nhà */}
        <FormField
          id="field-total-floors"
          label="Tổng số tầng tòa nhà"
          error={errors.totalFloors}
        >
          <input
            type="number"
            min="1"
            step="1"
            value={data.totalFloors ?? ""}
            onChange={(e) => onChange({ totalFloors: e.target.value })}
            placeholder="Ví dụ: 35"
            className={inputClass}
          />
        </FormField>

        {/* Số phòng ngủ */}
        <FormField
          id="field-bedrooms"
          label="Số phòng ngủ"
          required
          error={errors.bedrooms}
          hint={isStudio ? "Có thể nhập 0 đối với căn Studio" : undefined}
        >
          <input
            type="number"
            min={isStudio ? "0" : "1"}
            step="1"
            value={data.bedrooms ?? ""}
            onChange={(e) => onChange({ bedrooms: e.target.value })}
            placeholder={isStudio ? "0 (Studio) hoặc số phòng" : "Ví dụ: 2"}
            className={`${inputClass} ${
              errors.bedrooms ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Số phòng tắm */}
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
            placeholder="Ví dụ: 2"
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

        {/* Tình trạng nội thất */}
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

        {/* Hướng cửa chính */}
        <FormField
          id="field-door-orientation"
          label="Hướng cửa chính"
          error={errors.doorOrientation}
        >
          <select
            value={data.doorOrientation ?? ""}
            onChange={(e) => onChange({ doorOrientation: e.target.value })}
            className={selectClass}
          >
            <option value="">-- Không xác định --</option>
            {ORIENTATIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Hướng ban công */}
        <FormField
          id="field-balcony-orientation"
          label="Hướng ban công"
          error={errors.balconyOrientation}
        >
          <select
            value={data.balconyOrientation ?? ""}
            onChange={(e) => onChange({ balconyOrientation: e.target.value })}
            className={selectClass}
          >
            <option value="">-- Không xác định / Không có ban công --</option>
            {ORIENTATIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Hướng view */}
        <FormField id="field-view" label="View căn hộ" error={errors.view}>
          <input
            type="text"
            value={data.view ?? ""}
            onChange={(e) => onChange({ view: e.target.value })}
            placeholder="Ví dụ: View sông Sài Gòn, View công viên, View hồ bơi..."
            className={inputClass}
          />
        </FormField>

        {/* Số người tối đa */}
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
            placeholder="Ví dụ: 4 người"
            className={inputClass}
          />
        </FormField>

        {/* Giấy tờ pháp lý */}
        <FormField
          id="field-legal-status"
          label="Giấy tờ pháp lý"
          error={errors.legalStatus}
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
      </div>
    </FormSectionWrapper>
  );
}
