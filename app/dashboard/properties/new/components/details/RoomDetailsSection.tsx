import React from "react";
import { Check } from "lucide-react";
import FormField, { inputClass, selectClass } from "../FormField";
import FormSectionWrapper from "../FormSectionWrapper";
import {
  FURNISHING_OPTIONS,
} from "../../constants";
import type { ListingOptionItem } from "@/types/listing.type";
import type { RoomDetailsData, FormErrors } from "../../types";

interface RoomDetailsSectionProps {
  data: RoomDetailsData;
  errors: FormErrors;
  onChange: (updates: Partial<RoomDetailsData>) => void;
  furnishingOptions: ListingOptionItem[];
}

export default function RoomDetailsSection({
  data,
  errors,
  onChange,
  furnishingOptions,
}: RoomDetailsSectionProps) {
  function toggleFurniture(item: string) {
    const list = data.selectedFurniture || [];
    const exists = list.includes(item);
    const updated = exists
      ? list.filter((f) => f !== item)
      : [...list, item];
    onChange({ selectedFurniture: updated });
  }

  return (
    <FormSectionWrapper
      id="section-details"
      stepNumber={2}
      title="Thông tin chi tiết — Nhà trọ / Căn hộ dịch vụ"
      description="Chi tiết về tiện nghi phòng, khu vệ sinh, nội thất và quy định sinh hoạt"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Diện tích (Bắt buộc) */}
        <FormField
          id="field-room-area"
          label="Diện tích phòng (m²)"
          required
          error={errors.areaM2}
        >
          <input
            type="number"
            min="1"
            step="0.1"
            value={data.areaM2 ?? ""}
            onChange={(e) => onChange({ areaM2: e.target.value })}
            placeholder="Ví dụ: 25"
            className={`${inputClass} ${
              errors.areaM2 ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Mã phòng / Số phòng */}
        <FormField
          id="field-room-code"
          label="Mã phòng / Tên phòng"
          error={errors.roomCode}
          hint="Mã định danh phòng (nếu có)"
        >
          <input
            type="text"
            value={data.roomCode ?? ""}
            onChange={(e) => onChange({ roomCode: e.target.value })}
            placeholder="Ví dụ: P.202, Phòng A3"
            className={inputClass}
          />
        </FormField>

        {/* Nhà vệ sinh (Bắt buộc) */}
        <FormField
          id="field-toilet-type"
          label="Nhà vệ sinh"
          required
          error={errors.toiletType}
        >
          <select
            value={data.toiletType}
            onChange={(e) => onChange({ toiletType: e.target.value })}
            className={selectClass}
          >
            <option value="PRIVATE">Nhà vệ sinh riêng khép kín trong phòng</option>
            <option value="SHARED">Nhà vệ sinh chung ngoài phòng</option>
          </select>
        </FormField>

        {/* Khu bếp */}
        <FormField
          id="field-kitchen-type"
          label="Khu bếp nấu ăn"
          error={errors.kitchenType}
        >
          <select
            value={data.kitchenType ?? "PRIVATE"}
            onChange={(e) => onChange({ kitchenType: e.target.value })}
            className={selectClass}
          >
            <option value="PRIVATE">Kệ bếp riêng trong phòng</option>
            <option value="SHARED">Khu bếp chung</option>
            <option value="NONE">Không nấu ăn / Không có bếp</option>
          </select>
        </FormField>

        {/* Cửa sổ (Tách riêng với Ban công) */}
        <FormField
          id="field-has-window"
          label="Cửa sổ phòng"
          error={errors.hasWindow}
        >
          <select
            value={data.hasWindow ?? "YES"}
            onChange={(e) => onChange({ hasWindow: e.target.value })}
            className={selectClass}
          >
            <option value="YES">Có cửa sổ thông thoáng đón gió/sáng</option>
            <option value="NO">Không có cửa sổ (Phòng kín máy lạnh)</option>
          </select>
        </FormField>

        {/* Ban công (Tách riêng với Cửa sổ) */}
        <FormField
          id="field-has-balcony"
          label="Ban công"
          error={errors.hasBalcony}
        >
          <select
            value={data.hasBalcony ?? "PRIVATE"}
            onChange={(e) => onChange({ hasBalcony: e.target.value })}
            className={selectClass}
          >
            <option value="PRIVATE">Ban công riêng phơi đồ / ngắm cảnh</option>
            <option value="SHARED">Ban công / sân phơi chung</option>
            <option value="NONE">Không có ban công</option>
          </select>
        </FormField>

        {/* Tầng của phòng */}
        <FormField
          id="field-room-floor"
          label="Tầng của phòng"
          error={errors.roomFloor}
        >
          <input
            type="number"
            min="0"
            step="1"
            value={data.roomFloor ?? ""}
            onChange={(e) => onChange({ roomFloor: e.target.value })}
            placeholder="Ví dụ: 2 (Tầng 2)"
            className={inputClass}
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

        {/* Gác lửng */}
        <div className="sm:col-span-2">
          <label className="flex h-11 items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 text-xs font-medium text-foreground cursor-pointer hover:bg-muted/50">
            <input
              type="checkbox"
              checked={data.hasLoft ?? false}
              onChange={(e) => onChange({ hasLoft: e.target.checked })}
              className="h-4 w-4 rounded accent-primary"
            />
            Phòng có gác lửng cao ráo (tăng diện tích sinh hoạt)
          </label>
        </div>

        {/* Nội thất có sẵn trong phòng (Tag chips) */}
        <FormField
          id="field-selected-furniture"
          label="Nội thất & trang thiết bị có sẵn trong phòng"
          error={errors.selectedFurniture}
          className="sm:col-span-2"
        >
          <div className="flex flex-wrap gap-2">
            {furnishingOptions.map((item) => {
              const selected = (data.selectedFurniture || []).includes(item.code);
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => toggleFurniture(item.code)}
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
        </FormField>

        {/* Số người tối đa / phòng (Bắt buộc) */}
        <FormField
          id="field-max-occupants"
          label="Số người tối đa / phòng"
          required
          error={errors.maxOccupants}
        >
          <input
            type="number"
            min="1"
            step="1"
            value={data.maxOccupants ?? ""}
            onChange={(e) => onChange({ maxOccupants: e.target.value })}
            placeholder="Ví dụ: 2 người"
            className={`${inputClass} ${
              errors.maxOccupants ? "border-destructive focus:border-destructive" : ""
            }`}
          />
        </FormField>

        {/* Số xe tối đa / phòng */}
        <FormField
          id="field-max-vehicles"
          label="Số xe tối đa / phòng"
          error={errors.maxVehicles}
        >
          <input
            type="number"
            min="0"
            step="1"
            value={data.maxVehicles ?? ""}
            onChange={(e) => onChange({ maxVehicles: e.target.value })}
            placeholder="Ví dụ: 2 xe máy"
            className={inputClass}
          />
        </FormField>

        {/* Lối đi & Giờ giấc */}
        <FormField id="field-entrance-type" label="Lối đi" error={errors.entranceType}>
          <select
            value={data.entranceType ?? "PRIVATE"}
            onChange={(e) => onChange({ entranceType: e.target.value })}
            className={selectClass}
          >
            <option value="PRIVATE">Lối đi riêng biệt (Tự do ra vào)</option>
            <option value="SHARED">Lối đi chung với chủ nhà</option>
          </select>
        </FormField>

        <FormField id="field-curfew-type" label="Giờ giấc sinh hoạt" error={errors.curfewType}>
          <select
            value={data.curfewType ?? "FREE"}
            onChange={(e) => onChange({ curfewType: e.target.value })}
            className={selectClass}
          >
            <option value="FREE">Tự do 24/7 (Khóa vân tay / Thẻ từ)</option>
            <option value="CURFEW">Có giờ đóng cửa buổi tối (VD: 23:00)</option>
          </select>
        </FormField>

        {/* Đồng hồ điện & nước */}
        <FormField
          id="field-electricity-meter"
          label="Đồng hồ điện"
          error={errors.electricityMeter}
        >
          <select
            value={data.electricityMeter ?? "PRIVATE"}
            onChange={(e) => onChange({ electricityMeter: e.target.value })}
            className={selectClass}
          >
            <option value="PRIVATE">Đồng hồ điện riêng từng phòng</option>
            <option value="SHARED">Dùng chung đồng hồ tổng</option>
          </select>
        </FormField>

        <FormField
          id="field-water-meter"
          label="Đồng hồ nước"
          error={errors.waterMeter}
        >
          <select
            value={data.waterMeter ?? "PRIVATE"}
            onChange={(e) => onChange({ waterMeter: e.target.value })}
            className={selectClass}
          >
            <option value="PRIVATE">Đồng hồ nước riêng từng phòng</option>
            <option value="SHARED">Dùng chung / Tính theo đầu người</option>
          </select>
        </FormField>

        {/* Chính sách gửi xe */}
        <FormField
          id="field-parking-policy"
          label="Chính sách chỗ để xe"
          error={errors.parkingPolicy}
          className="sm:col-span-2"
        >
          <select
            value={data.parkingPolicy ?? "FREE"}
            onChange={(e) => onChange({ parkingPolicy: e.target.value })}
            className={selectClass}
          >
            <option value="FREE">Miễn phí chỗ để xe trong nhà / hầm xe</option>
            <option value="PAID">Có thu phí gửi xe hàng tháng (Kê khai ở mục Chi phí)</option>
            <option value="NONE">Không có chỗ để xe (Gửi bãi ngoài)</option>
          </select>
        </FormField>
      </div>
    </FormSectionWrapper>
  );
}
