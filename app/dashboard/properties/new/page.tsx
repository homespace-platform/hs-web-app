"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ImagePlus, LoaderCircle, Save, Search, X } from "lucide-react";
import { toast } from "sonner";
import { addMockRentListing } from "@/lib/mock-rent-listings";
import provinceService from "@/services/province.service";
import type { Province, Ward } from "@/types/province.type";

const CATEGORIES = [
  ["room", "Phòng trọ"],
  ["studio", "Studio"],
  ["commercial", "Mặt bằng kinh doanh"],
] as const;
const MAX_IMAGES = 6;

type SelectedImage = { name: string; dataUrl: string };

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject();
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CreateMockListingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [provinceCode, setProvinceCode] = useState("79");
  const [wardCode, setWardCode] = useState("");
  const [provinceQuery, setProvinceQuery] = useState("");
  const [wardQuery, setWardQuery] = useState("");
  const [openLocation, setOpenLocation] = useState<"province" | "ward" | null>(null);
  const [wardLoading, setWardLoading] = useState(true);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    let cancelled = false;

    provinceService.getCurrentProvinces()
      .then((data) => {
        if (cancelled) return;
        setProvinces(data);
        const defaultProvince = data.find((province) => String(province.code) === "79") ?? data[0];
        setProvinceCode(String(defaultProvince?.code ?? ""));
        setProvinceQuery(defaultProvince?.name ?? "");
      })
      .catch(() => {
        if (!cancelled) setLocationError("Không tải được danh sách tỉnh/thành. Hãy kiểm tra location-service.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!provinceCode) return;
    let cancelled = false;

    provinceService.getCurrentWardsByProvince(provinceCode)
      .then((data) => {
        if (cancelled) return;
        setWards(data);
        setWardLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setWards([]);
        setWardLoading(false);
        setLocationError("Không tải được danh sách phường/xã. Hãy kiểm tra location-service.");
      });

    return () => {
      cancelled = true;
    };
  }, [provinceCode]);

  const selectedProvince = provinces.find((province) => String(province.code) === provinceCode);
  const selectedWard = wards.find((ward) => String(ward.code) === wardCode);

  function handleProvinceSelect(province: Province) {
    setProvinceCode(String(province.code));
    setProvinceQuery(province.name);
    setWardCode("");
    setWardQuery("");
    setWards([]);
    setWardLoading(true);
    setLocationError("");
    setOpenLocation(null);
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const remainingSlots = MAX_IMAGES - selectedImages.length;
    const files = Array.from(event.target.files ?? []).slice(0, remainingSlots);
    event.target.value = "";
    if (!files.length) {
      if (remainingSlots === 0) toast.info(`Bạn đã chọn đủ ${MAX_IMAGES} ảnh.`);
      return;
    }

    try {
      const dataUrls = await Promise.all(files.map(readImage));
      setSelectedImages((current) => [
        ...current,
        ...files.map((file, index) => ({ name: file.name, dataUrl: dataUrls[index] })),
      ]);
    } catch {
      toast.error("Không thể đọc ảnh đã chọn.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const form = new FormData(event.currentTarget);
    setSubmitting(true);

    if (!selectedProvince || !selectedWard) {
      toast.error("Vui lòng chọn tỉnh/thành và phường/xã.");
      setSubmitting(false);
      return;
    }

    try {
      const property = addMockRentListing({
        title: String(form.get("title") ?? ""),
        category: String(form.get("category")) as "room" | "studio" | "commercial",
        priceMillion: Number(form.get("priceMillion")),
        areaM2: Number(form.get("areaM2")),
        beds: Number(form.get("beds")),
        baths: Number(form.get("baths")),
        address: String(form.get("address") ?? ""),
        provinceCode,
        provinceName: selectedProvince.name,
        wardCode,
        wardName: selectedWard.name,
        description: String(form.get("description") ?? ""),
        imageUrls: selectedImages.map((image) => image.dataUrl),
        landlordName: String(form.get("landlordName") ?? ""),
        phone: String(form.get("phone") ?? ""),
      });
      toast.success("Đã tạo tin đăng mock.");
      router.push(`/rent/${property.id}`);
    } catch {
      toast.error("Không thể tạo tin đăng mock.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-in fade-in-50 duration-200">
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">Đăng tin cho thuê</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">Bản mock để kiểm tra giao diện; chưa gửi dữ liệu đến API.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-foreground">Thông tin cơ bản</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tiêu đề tin đăng" className="sm:col-span-2">
              <input name="title" required minLength={10} placeholder="Ví dụ: Phòng trọ đầy đủ nội thất gần đại học" className={inputClass} />
            </Field>
            <Field label="Loại hình">
              <select name="category" defaultValue="room" className={inputClass}>
                {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Giá thuê (triệu/tháng)">
              <input name="priceMillion" required min="0.1" step="0.1" type="number" defaultValue="3.5" className={inputClass} />
            </Field>
            <Field label="Diện tích (m²)">
              <input name="areaM2" required min="1" step="1" type="number" defaultValue="25" className={inputClass} />
            </Field>
            <Field label="Phòng ngủ">
              <input name="beds" required min="0" step="1" type="number" defaultValue="1" className={inputClass} />
            </Field>
            <Field label="Phòng tắm / WC">
              <input name="baths" required min="0" step="1" type="number" defaultValue="1" className={inputClass} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <h2 className="text-base font-bold text-foreground">Vị trí &amp; mô tả</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Địa chỉ">
              <input name="address" required placeholder="12 Nguyễn Huệ" className={inputClass} />
            </Field>
            <Field label="Tỉnh / Thành phố">
              <SearchableLocationField
                name="provinceName"
                placeholder="Tìm tỉnh/thành phố..."
                value={provinceQuery}
                onChange={(value) => {
                  setProvinceQuery(value);
                  if (value !== selectedProvince?.name) {
                    setProvinceCode("");
                    setWardCode("");
                    setWardQuery("");
                    setWards([]);
                  }
                }}
                open={openLocation === "province"}
                onOpen={() => {
                  setOpenLocation("province");
                  setProvinceQuery("");
                }}
                options={provinces.filter((province) => matchesLocation(province, provinceQuery))}
                selectedCode={provinceCode}
                onSelect={handleProvinceSelect}
                disabled={!provinces.length}
                emptyText="Không tìm thấy tỉnh/thành phố"
              />
            </Field>
            <Field label="Phường / Xã">
              <SearchableLocationField
                name="wardCode"
                placeholder={wardLoading ? "Đang tải phường/xã..." : "Tìm phường/xã..."}
                value={wardQuery}
                onChange={setWardQuery}
                open={openLocation === "ward"}
                onOpen={() => {
                  setOpenLocation("ward");
                  setWardQuery("");
                }}
                options={wards.filter((ward) => matchesLocation(ward, wardQuery))}
                selectedCode={wardCode}
                onSelect={(ward) => {
                  setWardCode(String(ward.code));
                  setWardQuery(ward.name);
                  setOpenLocation(null);
                }}
                disabled={wardLoading || !wards.length}
                emptyText="Không tìm thấy phường/xã"
              />
            </Field>
            {locationError && <p className="sm:col-span-2 text-xs text-destructive">{locationError}</p>}
            <Field label={`Hình ảnh (${selectedImages.length}/${MAX_IMAGES})`} className="sm:col-span-2">
              <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
                <label
                  htmlFor="listing-images"
                  className="inline-flex cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  {selectedImages.length ? "Thêm ảnh" : "Chọn ảnh"}
                </label>
                <input
                  id="listing-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="sr-only"
                />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {selectedImages.length ? "Bạn có thể thêm ảnh mà không mất ảnh đã chọn." : `Chọn tối đa ${MAX_IMAGES} ảnh để xem trước.`}
                </p>
                {selectedImages.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedImages.map((image, index) => (
                      <div key={`${image.name}-${index}`} className="group relative overflow-hidden rounded-xl border border-border bg-card">
                        <Image src={image.dataUrl} alt={image.name} width={240} height={160} unoptimized className="h-28 w-full object-cover" />
                        <button
                          type="button"
                          aria-label={`Xoá ảnh ${index + 1}`}
                          onClick={() => setSelectedImages((current) => current.filter((_, imageIndex) => imageIndex !== index))}
                          className="absolute right-2 top-2 rounded-full bg-black/65 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Mô tả chi tiết" className="sm:col-span-2">
              <textarea name="description" rows={5} placeholder="Mô tả nội thất, tiện ích, điều kiện thuê..." className={`${inputClass} h-auto py-3`} />
            </Field>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-2xs sm:p-6">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Thông tin liên hệ</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tên người đăng">
              <input name="landlordName" defaultValue="Bạn" className={inputClass} />
            </Field>
            <Field label="Số điện thoại">
              <input name="phone" inputMode="tel" placeholder="0901234567" className={inputClass} />
            </Field>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="h-10 rounded-xl border border-border px-4 text-xs font-bold text-foreground hover:bg-muted">Hủy</button>
          <button type="submit" disabled={submitting} className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitting ? "Đang tạo..." : "Tạo tin mock"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass = "h-10 w-full rounded-xl border border-border bg-muted/40 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background";

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return <label className={`space-y-1.5 ${className ?? ""}`}><span className="block text-xs font-semibold text-foreground">{label}</span>{children}</label>;
}

type LocationOption = { code: string | number; name: string; full_name?: string };

function matchesLocation(option: LocationOption, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return `${option.name} ${option.full_name ?? ""}`.toLowerCase().includes(normalizedQuery);
}

function SearchableLocationField({
  name,
  placeholder,
  value,
  onChange,
  open,
  onOpen,
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
        required
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={onOpen}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pl-9 pr-9`}
      />
      <ChevronDown className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-60 overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-xl">
          {options.length ? options.map((option) => (
            <button
              key={option.code}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(option)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors hover:bg-muted ${String(option.code) === selectedCode ? "bg-primary/10 text-primary" : "text-foreground"}`}
            >
              <span className="truncate">{option.name}</span>
              {String(option.code) === selectedCode && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          )) : (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">{emptyText}</p>
          )}
        </div>
      )}
    </div>
  );
}
