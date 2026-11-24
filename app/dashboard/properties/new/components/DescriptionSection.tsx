import React from "react";
import { Sparkles } from "lucide-react";
import FormField, { textareaClass } from "./FormField";
import FormSectionWrapper from "./FormSectionWrapper";
import type { FormErrors } from "../types";

interface DescriptionSectionProps {
  value: string;
  errors: FormErrors;
  onChange: (value: string) => void;
  onGenerateAiDescription: () => void;
}

export default function DescriptionSection({
  value,
  errors,
  onChange,
  onGenerateAiDescription,
}: DescriptionSectionProps) {
  return (
    <FormSectionWrapper
      stepNumber={8}
      title="Mô tả chi tiết"
      description="Giúp người thuê hiểu rõ không gian."
    >
      <div className="space-y-3">
        <FormField
          id="field-description"
          label="Nội dung mô tả chi tiết bài đăng"
          required
          error={errors.description}
          hint="Mô tả rõ ràng giúp người thuê đặt lịch xem nhanh hơn."
          action={
            <button
              type="button"
              onClick={onGenerateAiDescription}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 min-h-10 text-sm font-bold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-95 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tạo mô tả AI</span>
            </button>
          }
        >
          <div className="relative">
            <textarea
              rows={8}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Nhập mô tả chi tiết về không gian, đặc điểm nổi bật, môi trường sống, giao thông thuận tiện..."
              className={`${textareaClass} min-h-[160px] leading-relaxed ${
                errors.description ? "border-destructive focus:border-destructive" : ""
              }`}
            />
            <div className="flex items-center justify-between pt-1 px-1 text-sm text-muted-foreground">
              <span>Độ dài khuyến nghị: 100 - 1000 từ</span>
              <span className={value.length < 30 ? "text-amber-500 font-medium" : "text-emerald-600 font-medium"}>
                {value.length} ký tự {value.length < 30 ? "(tối thiểu 30 ký tự)" : ""}
              </span>
            </div>
          </div>
        </FormField>
      </div>
    </FormSectionWrapper>
  );
}
