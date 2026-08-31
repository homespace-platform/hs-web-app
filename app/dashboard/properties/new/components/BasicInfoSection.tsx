import React, { ChangeEvent } from "react";
import Image from "next/image";
import { ImagePlus, Video as VideoIcon, X } from "lucide-react";
import FormField, { inputClass, selectClass } from "./FormField";
import FormSectionWrapper from "./FormSectionWrapper";
import {
  PROPERTY_CATEGORIES,
  SUBTYPES_BY_CATEGORY,
  RENTAL_TYPES_BY_CATEGORY,
  MAX_IMAGES,
  MAX_VIDEOS,
} from "../constants";
import type {
  BasicInfoData,
  PropertyCategoryKey,
  SelectedMediaImage,
  SelectedMediaVideo,
  FormErrors,
} from "../types";

interface BasicInfoSectionProps {
  data: BasicInfoData;
  errors: FormErrors;
  onChange: (updates: Partial<BasicInfoData>) => void;
  onRequestCategoryChange: (newCategory: PropertyCategoryKey) => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string" ? resolve(reader.result) : reject();
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function BasicInfoSection({
  data,
  errors,
  onChange,
  onRequestCategoryChange,
}: BasicInfoSectionProps) {
  const currentSubtypes = SUBTYPES_BY_CATEGORY[data.category] || [];
  const currentRentalTypes = RENTAL_TYPES_BY_CATEGORY[data.category] || [];

  async function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const remainingSlots = MAX_IMAGES - data.images.length;
    const files = Array.from(e.target.files ?? []).slice(0, remainingSlots);
    e.target.value = "";

    if (!files.length) return;

    try {
      const dataUrls = await Promise.all(files.map(readFileAsDataUrl));
      const newImages: SelectedMediaImage[] = files.map((file, i) => ({
        name: file.name,
        dataUrl: dataUrls[i],
        file,
      }));
      onChange({ images: [...data.images, ...newImages] });
    } catch {
      // ignore
    }
  }

  function handleRemoveImage(index: number) {
    onChange({
      images: data.images.filter((_, i) => i !== index),
    });
  }

  function handleVideoUpload(e: ChangeEvent<HTMLInputElement>) {
    const remainingSlots = MAX_VIDEOS - data.videos.length;
    const files = Array.from(e.target.files ?? []).slice(0, remainingSlots);
    e.target.value = "";

    if (!files.length) return;

    const newVideos: SelectedMediaVideo[] = files.map((file) => ({
      name: file.name,
      file,
    }));
    onChange({ videos: [...data.videos, ...newVideos] });
  }

  function handleRemoveVideo(index: number) {
    onChange({
      videos: data.videos.filter((_, i) => i !== index),
    });
  }

  return (
    <FormSectionWrapper
      id="section-basic-info"
      stepNumber={1}
      title="Thông tin cơ bản"
      description="Cung cấp các thông tin tổng quan, hình ảnh và loại hình cho thuê"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {/* Tiêu đề tin đăng */}
        <FormField
          id="field-title"
          label="Tiêu đề tin đăng"
          required
          error={errors.title}
          hint="Tiêu đề hấp dẫn, rõ ràng (tối thiểu 10 ký tự)"
          className="sm:col-span-2"
        >
          <input
            type="text"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Ví dụ: Căn hộ 2PN cao cấp view sông thoáng mát tại Vinhomes Central Park"
            className={`${inputClass} ${errors.title ? "border-destructive focus:border-destructive" : ""}`}
            maxLength={150}
          />
        </FormField>

        {/* Hình ảnh */}
        <FormField
          id="field-images"
          label={`Hình ảnh (${data.images.length}/${MAX_IMAGES})`}
          required
          error={errors.images}
          hint={`Tối thiểu 1 ảnh và tối đa ${MAX_IMAGES} ảnh chất lượng rõ nét. Ảnh đầu tiên sẽ làm ảnh bìa.`}
          className="sm:col-span-2"
        >
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="upload-listing-images"
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-2xs transition-colors hover:bg-primary/90 ${
                  data.images.length >= MAX_IMAGES ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <ImagePlus className="h-4 w-4" />
                {data.images.length ? "Thêm ảnh khác" : "Chọn tải ảnh lên"}
              </label>
              <input
                id="upload-listing-images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={data.images.length >= MAX_IMAGES}
                onChange={handleImageUpload}
                className="sr-only"
              />
              <span className="text-xs text-muted-foreground">
                Hỗ trợ JPG, PNG, WEBP (tối đa 10MB/ảnh)
              </span>
            </div>

            {data.images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                {data.images.map((img, idx) => (
                  <div
                    key={`${img.name}-${idx}`}
                    className="group relative aspect-4/3 overflow-hidden rounded-xl border border-border bg-card shadow-2xs"
                  >
                    <Image
                      src={img.dataUrl}
                      alt={img.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-md bg-primary/90 px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground backdrop-blur-xs">
                        Ảnh bìa
                      </span>
                    )}
                    <button
                      type="button"
                      aria-label={`Xóa ảnh ${idx + 1}`}
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormField>

        {/* Video */}
        <FormField
          id="field-videos"
          label={`Video (${data.videos.length}/${MAX_VIDEOS})`}
          error={errors.videos}
          hint={`Không bắt buộc. Tối đa ${MAX_VIDEOS} video quay cận cảnh không gian.`}
          className="sm:col-span-2"
        >
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="upload-listing-videos"
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xs transition-colors hover:bg-muted ${
                  data.videos.length >= MAX_VIDEOS ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <VideoIcon className="h-4 w-4 text-primary" />
                {data.videos.length ? "Thêm video khác" : "Chọn tải video"}
              </label>
              <input
                id="upload-listing-videos"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                multiple
                disabled={data.videos.length >= MAX_VIDEOS}
                onChange={handleVideoUpload}
                className="sr-only"
              />
              <span className="text-xs text-muted-foreground">
                Hỗ trợ MP4, WebM, MOV (tối đa 50MB/video)
              </span>
            </div>

            {data.videos.length > 0 && (
              <div className="mt-3 space-y-2">
                {data.videos.map((vid, idx) => (
                  <div
                    key={`${vid.name}-${idx}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <VideoIcon className="h-4 w-4 shrink-0 text-primary" />
                      <span className="truncate font-medium text-foreground">
                        {vid.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveVideo(idx)}
                      className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FormField>

        {/* 5 Loại hình chính */}
        <div className="sm:col-span-2 space-y-2">
          <label className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>
              Loại hình <span className="text-destructive">*</span>
            </span>
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {PROPERTY_CATEGORIES.map((cat) => {
              const active = data.category === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => onRequestCategoryChange(cat.key)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                    active
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      active ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {cat.label}
                  </span>
                  <span className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
                    {cat.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loại chi tiết (Subtype) */}
        <FormField
          id="field-subtype"
          label="Loại chi tiết"
          required
          error={errors.subtype}
        >
          <select
            value={data.subtype}
            onChange={(e) => onChange({ subtype: e.target.value })}
            className={selectClass}
          >
            <option value="" disabled>
              -- Chọn loại chi tiết --
            </option>
            {currentSubtypes.map((sub) => (
              <option key={sub.value} value={sub.value}>
                {sub.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Hình thức cho thuê */}
        <FormField
          id="field-rental-type"
          label="Hình thức cho thuê"
          required
          error={errors.rentalType}
        >
          <select
            value={data.rentalType}
            onChange={(e) => onChange({ rentalType: e.target.value })}
            className={selectClass}
          >
            {currentRentalTypes.map((rt) => (
              <option key={rt.value} value={rt.value}>
                {rt.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Ngày có thể vào thuê / bàn giao */}
        <FormField
          id="field-available-date"
          label="Ngày có thể vào thuê / bàn giao"
          required
          error={errors.availableDate}
          hint="Thời điểm người thuê có thể nhận nhà/phòng/mặt bằng"
        >
          <div className="relative">
            <input
              type="date"
              value={data.availableDate}
              onChange={(e) => onChange({ availableDate: e.target.value })}
              className={`${inputClass} ${
                errors.availableDate ? "border-destructive focus:border-destructive" : ""
              }`}
            />
          </div>
        </FormField>
      </div>
    </FormSectionWrapper>
  );
}
