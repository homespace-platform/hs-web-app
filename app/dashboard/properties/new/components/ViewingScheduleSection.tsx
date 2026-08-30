import React from "react";
import { Check } from "lucide-react";
import FormSectionWrapper from "./FormSectionWrapper";
import { VIEWING_DAYS, VIEWING_SLOTS } from "../constants";
import type { FormErrors } from "../types";

interface ViewingScheduleSectionProps {
  selectedDays: string[];
  selectedSlots: string[];
  errors: FormErrors;
  onChangeDays: (days: string[]) => void;
  onChangeSlots: (slots: string[]) => void;
}

export default function ViewingScheduleSection({
  selectedDays,
  selectedSlots,
  errors,
  onChangeDays,
  onChangeSlots,
}: ViewingScheduleSectionProps) {
  function toggleDay(day: string) {
    if (selectedDays.includes(day)) {
      onChangeDays(selectedDays.filter((d) => d !== day));
    } else {
      onChangeDays([...selectedDays, day]);
    }
  }

  function toggleSlot(slot: string) {
    if (selectedSlots.includes(slot)) {
      onChangeSlots(selectedSlots.filter((s) => s !== slot));
    } else {
      onChangeSlots([...selectedSlots, slot]);
    }
  }

  return (
    <FormSectionWrapper
      id="section-viewing-schedule"
      stepNumber={7}
      title="Lịch xem nhà"
      description="Thời gian bạn sẵn sàng tiếp khách đến xem thực tế (chọn ít nhất 1 ngày và 1 buổi)"
    >
      <div className="space-y-5">
        {/* Ngày trong tuần */}
        <div id="field-viewing-days" className="space-y-2">
          <label className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>
              Ngày trong tuần <span className="text-destructive">*</span>
            </span>
          </label>
          <div className="flex flex-wrap gap-2">
            {VIEWING_DAYS.map(([val, label]) => {
              const isSelected = selectedDays.includes(val);
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => toggleDay(val)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground shadow-2xs ring-2 ring-primary/20"
                      : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted/40"
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                  {label}
                </button>
              );
            })}
          </div>
          {errors.viewingDays && (
            <p className="text-[11px] font-medium text-destructive">
              {errors.viewingDays}
            </p>
          )}
        </div>

        {/* Buổi trong ngày */}
        <div id="field-viewing-slots" className="space-y-2">
          <label className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span>
              Khung giờ / Buổi có thể xem <span className="text-destructive">*</span>
            </span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {VIEWING_SLOTS.map((slot) => {
              const isSelected = selectedSlots.includes(slot.value);
              return (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => toggleSlot(slot.value)}
                  className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-1 ring-primary shadow-xs"
                      : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {slot.label}
                    </span>
                    {isSelected && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                  <span className="mt-1 text-[11px] text-muted-foreground">
                    {slot.time}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.viewingSlots && (
            <p className="text-[11px] font-medium text-destructive">
              {errors.viewingSlots}
            </p>
          )}
        </div>
      </div>
    </FormSectionWrapper>
  );
}
