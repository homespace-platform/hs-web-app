import React, { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import FormSectionWrapper from "./FormSectionWrapper";
import { inputClass } from "./FormField";
import type { ListingOptionItem } from "@/types/listing.type";
import type { FormErrors } from "../types";

interface AmenitiesSectionProps {
  selectedAmenities: string[];
  errors: FormErrors;
  onChange: (amenities: string[]) => void;
  options: ListingOptionItem[];
}

export default function AmenitiesSection({
  selectedAmenities,
  errors,
  onChange,
  options,
}: AmenitiesSectionProps) {
  const [customAmenityInput, setCustomAmenityInput] = useState("");

  const defaultAmenityCodes = options.map((item) => item.code);

  function toggleAmenity(amenity: string) {
    if (selectedAmenities.includes(amenity)) {
      onChange(selectedAmenities.filter((item) => item !== amenity));
    } else {
      onChange([...selectedAmenities, amenity]);
    }
  }

  function handleAddCustomAmenity() {
    const trimmed = customAmenityInput.trim();
    if (!trimmed || selectedAmenities.includes(trimmed)) return;
    onChange([...selectedAmenities, trimmed]);
    setCustomAmenityInput("");
  }

  const customAddedAmenities = selectedAmenities.filter(
    (item) => !defaultAmenityCodes.includes(item)
  );

  return (
    <FormSectionWrapper
      id="section-amenities"
      stepNumber={3}
      title="Tiện ích & Dịch vụ"
      description="Chọn các tiện ích sẵn có phù hợp với mô hình cho thuê để thu hút khách hàng"
    >
      <div className="space-y-4">
        {/* Danh sách tiện ích theo loại hình */}
        <div className="flex flex-wrap gap-2.5">
          {options.map((amenity) => {
            const isSelected = selectedAmenities.includes(amenity.code);
            return (
              <button
                key={amenity.code}
                type="button"
                onClick={() => toggleAmenity(amenity.code)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-2xs ring-2 ring-primary/20"
                    : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                {isSelected && <Check className="h-3.5 w-3.5" />}
                {amenity.name}
              </button>
            );
          })}

          {/* Tiện ích tùy chỉnh đã thêm */}
          {customAddedAmenities.map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/90 px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-2xs transition-all hover:bg-primary"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{amenity}</span>
              <X className="ml-1 h-3.5 w-3.5 opacity-70 hover:opacity-100" />
            </button>
          ))}
        </div>

        {/* Thêm tiện ích tùy chỉnh */}
        <div className="flex max-w-md items-center gap-2 pt-2">
          <input
            type="text"
            value={customAmenityInput}
            onChange={(e) => setCustomAmenityInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomAmenity();
              }
            }}
            placeholder="Nhập tiện ích khác (ví dụ: Trạm sạc xe điện, Sân bóng rổ...)"
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleAddCustomAmenity}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-4 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
            Thêm
          </button>
        </div>

        {errors.amenities && (
          <p className="text-xs font-medium text-destructive">
            {errors.amenities}
          </p>
        )}
      </div>
    </FormSectionWrapper>
  );
}
