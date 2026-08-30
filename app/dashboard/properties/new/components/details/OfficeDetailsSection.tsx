import React, { useState } from "react";
import { Clock, Check } from "lucide-react";
import FormField, { inputClass, selectClass } from "../FormField";
import FormSectionWrapper from "../FormSectionWrapper";
import type { OfficeDetailsData, FormErrors } from "../../types";

interface OfficeDetailsSectionProps {
  data: OfficeDetailsData;
  subtype: string;
  errors: FormErrors;
  onChange: (updates: Partial<OfficeDetailsData>) => void;
}

export const OFFICE_HANDOVER_OPTIONS = [
  { value: "RAW", label: "Bàn giao thô (Sàn bê tông, trần thô)" },
  { value: "BASIC", label: "Hoàn thiện cơ bản (Trần, sàn, hệ thống chiếu sáng, điều hòa)" },
  { value: "FULL", label: "Đầy đủ nội thất (Bàn ghế làm việc, tủ hồ sơ, vách ngăn)" },
];

export const OFFICE_GRADES = [
  { value: "GRADE_A", label: "Hạng A (Cao cấp chuẩn quốc tế)" },
  { value: "GRADE_B", label: "Hạng B" },
  { value: "GRADE_C", label: "Hạng C" },
  { value: "ECONOMY", label: "Văn phòng giá rẻ / Tòa nhà tư nhân" },
];

export default function OfficeDetailsSection({
  data,
  subtype,
  errors,
  onChange,
}: OfficeDetailsSectionProps) {
  const isTraditionalOffice = subtype === "traditional_office";

  return (
    <FormSectionWrapper
      id="section-details"
      stepNumber={2}
      title="Thông tin chi tiết — Văn phòng"
      description="Thông tin về diện tích, tòa nhà, điều kiện bàn giao và sức chứa của văn phòng"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Tên tòa nhà (Bắt buộc với VP truyền thống) */}
        <FormField
          id="field-building-name"
          label="Tên tòa nhà văn phòng"
          required={isTraditionalOffice}
          error={errors.buildingName}
          hint={
            isTraditionalOffice
              ? "Bắt buộc đối với văn phòng truyền thống"
              : "Tùy chọn đối với Coworking / Văn phòng chia sẻ"
          }
          className="sm:col-span-2"
        >
          <input
            type="text"
            value={data.buildingName ?? ""}
            onChange={(e) => onChange({ buildingName: e.target.value })}
            placeholder="Ví dụ: Bitexco Financial Tower, Deutsches Haus, Dreamplex..."
            className={`${inputClass} ${
              errors.buildingName ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Diện tích cho thuê (Bắt buộc) */}
        <FormField
          id="field-rental-area"
          label="Diện tích cho thuê (m²)"
          required
          error={errors.rentalAreaM2}
        >
          <input
            type="number"
            min="1"
            step="0.1"
            value={data.rentalAreaM2 ?? ""}
            onChange={(e) => onChange({ rentalAreaM2: e.target.value })}
            placeholder="Ví dụ: 120"
            className={`${inputClass} ${
              errors.rentalAreaM2 ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Tầng cho thuê (Bắt buộc) */}
        <FormField
          id="field-rental-floor"
          label="Tầng cho thuê"
          required
          error={errors.rentalFloor}
          hint="Ví dụ: Tầng 8, Tầng 12..."
        >
          <input
            type="text"
            value={data.rentalFloor ?? ""}
            onChange={(e) => onChange({ rentalFloor: e.target.value })}
            placeholder="Ví dụ: 8 hoặc Lầu 8"
            className={`${inputClass} ${
              errors.rentalFloor ? "border-destructive focus:border-destructive" : ""
            }`}
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
            {OFFICE_HANDOVER_OPTIONS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Hạng văn phòng */}
        <FormField
          id="field-office-grade"
          label="Hạng văn phòng"
          error={errors.officeGrade}
        >
          <select
            value={data.officeGrade ?? "GRADE_B"}
            onChange={(e) => onChange({ officeGrade: e.target.value })}
            className={selectClass}
          >
            {OFFICE_GRADES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Số chỗ ngồi dự kiến */}
        <FormField
          id="field-seats-count"
          label="Số chỗ ngồi dự kiến"
          error={errors.seatsCount}
        >
          <input
            type="number"
            min="1"
            step="1"
            value={data.seatsCount ?? ""}
            onChange={(e) => onChange({ seatsCount: e.target.value })}
            placeholder="Ví dụ: 25 - 30 người"
            className={inputClass}
          />
        </FormField>

        {/* Diện tích có thể chia nhỏ */}
        <FormField
          id="field-is-subdivisible"
          label="Khả năng chia nhỏ diện tích"
          error={errors.isSubdivisible}
        >
          <select
            value={data.isSubdivisible ? "YES" : "NO"}
            onChange={(e) => onChange({ isSubdivisible: e.target.value === "YES" })}
            className={selectClass}
          >
            <option value="NO">Cho thuê nguyên diện tích</option>
            <option value="YES">Có thể chia nhỏ linh hoạt theo nhu cầu</option>
          </select>
        </FormField>

        {/* Số nhà vệ sinh */}
        <FormField
          id="field-toilets-count"
          label="Số nhà vệ sinh"
          error={errors.toiletsCount}
        >
          <input
            type="number"
            min="0"
            step="1"
            value={data.toiletsCount ?? ""}
            onChange={(e) => onChange({ toiletsCount: e.target.value })}
            placeholder="Ví dụ: 2"
            className={inputClass}
          />
        </FormField>

        {/* Hệ thống nhà vệ sinh */}
        <FormField
          id="field-toilet-type"
          label="Hệ thống nhà vệ sinh"
          error={errors.toiletType}
        >
          <select
            value={data.toiletType ?? "SHARED"}
            onChange={(e) => onChange({ toiletType: e.target.value })}
            className={selectClass}
          >
            <option value="SHARED">Nhà vệ sinh chung tầng (Nam/Nữ riêng)</option>
            <option value="PRIVATE">Nhà vệ sinh riêng trong văn phòng</option>
          </select>
        </FormField>

        {/* Pantry / Khu bếp */}
        <FormField
          id="field-pantry"
          label="Pantry / Khu ăn uống"
          error={errors.pantry}
        >
          <select
            value={data.pantry ?? "SHARED"}
            onChange={(e) => onChange({ pantry: e.target.value })}
            className={selectClass}
          >
            <option value="PRIVATE">Pantry riêng trong văn phòng</option>
            <option value="SHARED">Pantry chung tòa nhà</option>
            <option value="NONE">Không có</option>
          </select>
        </FormField>

        {/* Giờ hoạt động của tòa nhà (Bộ chọn ngày và giờ) */}
        <div className="sm:col-span-2 space-y-3 rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <label className="text-xs font-bold text-foreground">
              Giờ hoạt động của tòa nhà
            </label>
            <span className="text-[11px] text-muted-foreground">
              Chọn khung giờ và các ngày làm việc cho phép trong tuần
            </span>
          </div>

          <OfficeOperatingHoursPicker
            value={data.operatingHours ?? "07:30 – 18:30 (Thứ 2 - Thứ 7)"}
            onChange={(val) => onChange({ operatingHours: val })}
          />

          {errors.operatingHours && (
            <p className="text-[11px] font-medium text-destructive">
              {errors.operatingHours}
            </p>
          )}
        </div>

        {/* Chỗ để xe ô tô & xe máy */}
        <FormField
          id="field-car-parking-slots"
          label="Chỗ đỗ ô tô của tòa nhà"
          error={errors.carParkingSlots}
        >
          <input
            type="text"
            value={data.carParkingSlots ?? ""}
            onChange={(e) => onChange({ carParkingSlots: e.target.value })}
            placeholder="Ví dụ: Có hầm để ô tô / 2 chỗ miễn phí"
            className={inputClass}
          />
        </FormField>

        <FormField
          id="field-motorbike-parking-slots"
          label="Chỗ đỗ xe máy"
          error={errors.motorbikeParkingSlots}
        >
          <input
            type="text"
            value={data.motorbikeParkingSlots ?? ""}
            onChange={(e) => onChange({ motorbikeParkingSlots: e.target.value })}
            placeholder="Ví dụ: Hầm xe rộng rãi"
            className={inputClass}
          />
        </FormField>
      </div>
    </FormSectionWrapper>
  );
}

function OfficeOperatingHoursPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const is24_7 = value.includes("24/7");
  const isMonSat = value.includes("Thứ 7") || value.includes("Thứ 2 - Thứ 7") || value.includes("Thứ 2 – Thứ 7");
  const isMonFri = value.includes("Thứ 6") || value.includes("Thứ 2 - Thứ 6") || value.includes("Thứ 2 – Thứ 6");

  const [mode, setMode] = useState<"preset" | "custom">(
    is24_7 || isMonSat || isMonFri ? "preset" : "custom"
  );
  const [startTime, setStartTime] = useState("07:30");
  const [endTime, setEndTime] = useState("18:30");
  const [daysRange, setDaysRange] = useState("Thứ 2 – Thứ 7");

  function handleSelectPreset(presetVal: string) {
    setMode("preset");
    onChange(presetVal);
  }

  function handleCustomTimeChange(newStart: string, newEnd: string, newDays: string) {
    setStartTime(newStart);
    setEndTime(newEnd);
    setDaysRange(newDays);
    onChange(`${newStart} – ${newEnd} (${newDays})`);
  }

  return (
    <div className="space-y-3">
      {/* Preset Buttons */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => handleSelectPreset("24/7 (Tự do ra vào)")}
          className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs font-semibold transition-all ${
            value.includes("24/7") && mode === "preset"
              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
              : "border-border bg-card text-foreground hover:border-primary/40"
          }`}
        >
          <span>24/7 (Tự do ra vào)</span>
          {value.includes("24/7") && mode === "preset" && <Check className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => handleSelectPreset("08:00 – 17:30 (Thứ 2 – Thứ 6)")}
          className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs font-semibold transition-all ${
            value.includes("Thứ 6") && mode === "preset"
              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
              : "border-border bg-card text-foreground hover:border-primary/40"
          }`}
        >
          <span>08:00 – 17:30 (T2 – T6)</span>
          {value.includes("Thứ 6") && mode === "preset" && <Check className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          onClick={() => handleSelectPreset("07:30 – 18:30 (Thứ 2 – Thứ 7)")}
          className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs font-semibold transition-all ${
            value.includes("Thứ 7") && mode === "preset"
              ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
              : "border-border bg-card text-foreground hover:border-primary/40"
          }`}
        >
          <span>07:30 – 18:30 (T2 – T7)</span>
          {value.includes("Thứ 7") && mode === "preset" && <Check className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Custom Picker Tab Toggle */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => {
            setMode("custom");
            handleCustomTimeChange(startTime, endTime, daysRange);
          }}
          className={`text-xs font-semibold transition-colors ${
            mode === "custom" ? "text-primary underline" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          + Chọn giờ &amp; ngày tùy chỉnh
        </button>

        {value && (
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
            <Clock className="h-3.5 w-3.5" />
            <span>Đang chọn: {value}</span>
          </div>
        )}
      </div>

      {/* Custom Time & Day Pickers */}
      {mode === "custom" && (
        <div className="rounded-xl border border-primary/20 bg-background/80 p-3.5 space-y-3 animate-in fade-in-50 duration-150">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                Giờ mở cửa
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) =>
                  handleCustomTimeChange(e.target.value, endTime, daysRange)
                }
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">
                Giờ đóng cửa
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) =>
                  handleCustomTimeChange(startTime, e.target.value, daysRange)
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground">
              Ngày làm việc trong tuần
            </label>
            <div className="flex flex-wrap gap-2">
              {["Thứ 2 – Thứ 6", "Thứ 2 – Thứ 7", "Cả tuần (Thứ 2 – CN)", "Tất cả các ngày"].map(
                (d) => {
                  const selected = daysRange === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleCustomTimeChange(startTime, endTime, d)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground font-bold shadow-2xs"
                          : "border-border bg-muted/40 text-foreground hover:bg-muted"
                      }`}
                    >
                      {d}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

