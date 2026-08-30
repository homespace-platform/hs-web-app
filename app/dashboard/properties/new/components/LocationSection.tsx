import React, { useState } from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import AddressMapPreview from "@/components/address/AddressMapPreview";
import FormField, { inputClass } from "./FormField";
import FormSectionWrapper from "./FormSectionWrapper";
import type { Province, Ward } from "@/types/province.type";
import type { UserAddress } from "@/types/user.type";
import type { FormErrors } from "../types";

export type AddressMode = "saved" | "new";

interface LocationOption {
  code: string | number;
  name: string;
  full_name?: string;
}

function matchesLocation(option: LocationOption, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return `${option.name} ${option.full_name ?? ""}`
    .toLowerCase()
    .includes(normalizedQuery);
}

function SearchableLocationDropdown({
  name,
  placeholder,
  value,
  onChange,
  open,
  onOpen,
  onClose,
  options,
  selectedCode,
  onSelect,
  disabled,
  emptyText,
}: {
  name: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  options: LocationOption[];
  selectedCode: string;
  onSelect: (option: LocationOption) => void;
  disabled: boolean;
  emptyText: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        name={name}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={onOpen}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} pl-9 pr-9`}
      />
      <ChevronDown
        className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform ${
          open ? "rotate-180" : ""
        }`}
      />
      {open && !disabled && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={onClose}
          />
          <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl">
            {options.length ? (
              options.map((option) => (
                <button
                  key={option.code}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onSelect(option);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-muted ${
                    String(option.code) === selectedCode
                      ? "bg-primary/10 text-primary"
                      : "text-foreground"
                  }`}
                >
                  <span className="truncate">{option.name}</span>
                  {String(option.code) === selectedCode && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-center text-xs text-muted-foreground">
                {emptyText}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface LocationSectionProps {
  addressMode: AddressMode;
  savedUserAddress: UserAddress | null;
  streetLine: string;
  provinceCode: string;
  provinceQuery: string;
  wardCode: string;
  wardQuery: string;
  provinces: Province[];
  wards: Ward[];
  wardLoading: boolean;
  locationError: string;
  previewFullAddress: string;
  errors: FormErrors;
  onAddressModeChange: (mode: AddressMode) => void;
  onStreetLineChange: (val: string) => void;
  onProvinceSelect: (province: Province) => void;
  onProvinceQueryChange: (val: string) => void;
  onWardSelect: (ward: Ward) => void;
  onWardQueryChange: (val: string) => void;
}

export default function LocationSection({
  addressMode,
  savedUserAddress,
  streetLine,
  provinceCode,
  provinceQuery,
  wardCode,
  wardQuery,
  provinces,
  wards,
  wardLoading,
  locationError,
  previewFullAddress,
  errors,
  onAddressModeChange,
  onStreetLineChange,
  onProvinceSelect,
  onProvinceQueryChange,
  onWardSelect,
  onWardQueryChange,
}: LocationSectionProps) {
  const [openDropdown, setOpenDropdown] = useState<"province" | "ward" | null>(
    null
  );

  return (
    <FormSectionWrapper
      id="section-location"
      stepNumber={6}
      title="Vị trí"
      description="Địa chỉ chính xác giúp khách hàng dễ dàng tìm kiếm và di chuyển đến xem"
    >
      <div className="space-y-4">
        {/* Lựa chọn dùng địa chỉ đã lưu hoặc nhập mới */}
        {savedUserAddress && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onAddressModeChange("saved")}
              className={`rounded-xl border px-4 py-2.5 text-left text-xs font-semibold transition-all ${
                addressMode === "saved"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
            >
              Sử dụng địa chỉ đã lưu trong cài đặt
            </button>
            <button
              type="button"
              onClick={() => onAddressModeChange("new")}
              className={`rounded-xl border px-4 py-2.5 text-left text-xs font-semibold transition-all ${
                addressMode === "new"
                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
            >
              Nhập địa chỉ mới
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addressMode === "saved" && savedUserAddress ? (
            <div className="sm:col-span-2 rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-xs font-bold text-foreground">
                Địa chỉ liên kết từ tài khoản:
              </p>
              <p className="mt-1 text-xs text-foreground font-medium">
                {savedUserAddress.fullAddress ||
                  [
                    savedUserAddress.streetLine,
                    savedUserAddress.wardName,
                    savedUserAddress.provinceName,
                  ]
                    .filter(Boolean)
                    .join(", ")}
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Hệ thống sẽ tạo bản ghi địa chỉ riêng cho tin đăng này, không làm thay đổi thông tin cài đặt cá nhân của bạn.
              </p>
            </div>
          ) : (
            <>
              {/* Tỉnh / Thành phố */}
              <FormField
                id="field-province"
                label="Tỉnh / Thành phố"
                required
                error={errors.province}
              >
                <SearchableLocationDropdown
                  name="provinceName"
                  placeholder="Tìm tỉnh / thành phố..."
                  value={provinceQuery}
                  onChange={onProvinceQueryChange}
                  open={openDropdown === "province"}
                  onOpen={() => setOpenDropdown("province")}
                  onClose={() => setOpenDropdown(null)}
                  options={provinces.filter((p) =>
                    matchesLocation(p, provinceQuery)
                  )}
                  selectedCode={provinceCode}
                  onSelect={onProvinceSelect}
                  disabled={!provinces.length}
                  emptyText="Không tìm thấy tỉnh/thành phố"
                />
              </FormField>

              {/* Phường / Xã */}
              <FormField
                id="field-ward"
                label="Phường / Xã"
                required
                error={errors.ward}
              >
                <SearchableLocationDropdown
                  name="wardCode"
                  placeholder={
                    wardLoading
                      ? "Đang tải danh sách phường/xã..."
                      : "Tìm phường / xã..."
                  }
                  value={wardQuery}
                  onChange={onWardQueryChange}
                  open={openDropdown === "ward"}
                  onOpen={() => setOpenDropdown("ward")}
                  onClose={() => setOpenDropdown(null)}
                  options={wards.filter((w) => matchesLocation(w, wardQuery))}
                  selectedCode={wardCode}
                  onSelect={onWardSelect}
                  disabled={wardLoading || !wards.length}
                  emptyText="Không tìm thấy phường/xã"
                />
              </FormField>

              {/* Địa chỉ chi tiết (Số nhà, tên đường) */}
              <FormField
                id="field-street-line"
                label="Địa chỉ cụ thể (Số nhà, tên đường)"
                required
                error={errors.streetLine}
                className="sm:col-span-2"
              >
                <input
                  type="text"
                  value={streetLine}
                  onChange={(e) => onStreetLineChange(e.target.value)}
                  placeholder="Ví dụ: 12 Nguyễn Huệ hoặc 208 Nguyễn Hữu Cảnh..."
                  className={`${inputClass} ${
                    errors.streetLine ? "border-destructive focus:border-destructive" : ""
                  }`}
                />
              </FormField>
            </>
          )}

          {locationError && (
            <p className="sm:col-span-2 text-xs text-destructive">
              {locationError}
            </p>
          )}

          {/* Xem trước địa chỉ và bản đồ */}
          {previewFullAddress && (
            <div className="sm:col-span-2 space-y-3 pt-2">
              <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-medium text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span>{previewFullAddress}</span>
              </div>
              <AddressMapPreview fullAddress={previewFullAddress} />
            </div>
          )}
        </div>
      </div>
    </FormSectionWrapper>
  );
}
