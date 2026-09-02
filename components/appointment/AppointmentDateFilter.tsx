"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, X, CalendarDays } from "lucide-react";
import { format, addDays } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";

interface AppointmentDateFilterProps {
  selectedDate?: string;
  onSelectDate: (date?: string) => void;
}

export default function AppointmentDateFilter({
  selectedDate,
  onSelectDate,
}: AppointmentDateFilterProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const isToday = selectedDate === todayStr;
  const isTomorrow = selectedDate === tomorrowStr;
  const isAll = !selectedDate;
  const isCustom = selectedDate && !isToday && !isTomorrow;

  // Lắng nghe click bên ngoài để đóng popover lịch
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    if (isCalendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isCalendarOpen]);

  let displayLabel = "";
  let selectedDateObj: Date | undefined = undefined;

  if (selectedDate) {
    try {
      const [y, m, d] = selectedDate.split("-").map(Number);
      selectedDateObj = new Date(y, m - 1, d);
      displayLabel = format(selectedDateObj, "EEEE, dd/MM/yyyy", { locale: vi });
    } catch {
      displayLabel = selectedDate;
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-card border border-border">
      {/* Quick Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <button
          type="button"
          onClick={() => {
            onSelectDate(undefined);
            setIsCalendarOpen(false);
          }}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            isAll
              ? "bg-primary text-primary-foreground shadow-2xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          Tất cả ngày
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectDate(todayStr);
            setIsCalendarOpen(false);
          }}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            isToday
              ? "bg-primary text-primary-foreground shadow-2xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          Hôm nay
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectDate(tomorrowStr);
            setIsCalendarOpen(false);
          }}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
            isTomorrow
              ? "bg-primary text-primary-foreground shadow-2xs font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          Ngày mai
        </button>

        {/* Chọn ngày tùy ý với DayPicker */}
        <div className="relative" ref={calendarRef}>
          <button
            type="button"
            onClick={() => setIsCalendarOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
              isCustom
                ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted border border-border/80"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>{isCustom ? displayLabel : "Chọn ngày khác"}</span>
          </button>

          {isCalendarOpen && (
            <div className="absolute top-full mt-2 left-0 z-50 p-3 bg-card border border-border rounded-2xl shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="text-xs font-bold text-foreground mb-2 px-2 flex items-center justify-between">
                <span>Chọn ngày xem nhà:</span>
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDate(undefined);
                      setIsCalendarOpen(false);
                    }}
                    className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    Xóa chọn
                  </button>
                )}
              </div>
              <Calendar
                mode="single"
                selected={selectedDateObj}
                onSelect={(date) => {
                  if (date) {
                    onSelectDate(format(date, "yyyy-MM-dd"));
                  } else {
                    onSelectDate(undefined);
                  }
                  setIsCalendarOpen(false);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Thông tin ngày đang lọc kèm nút Xóa lọc */}
      {selectedDate && (
        <div className="flex items-center gap-2 text-xs bg-primary/10 text-primary px-3 py-1 rounded-xl font-semibold animate-in fade-in-50 duration-150">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{isToday ? `Hôm nay (${displayLabel})` : isTomorrow ? `Ngày mai (${displayLabel})` : displayLabel}</span>
          <button
            type="button"
            onClick={() => {
              onSelectDate(undefined);
              setIsCalendarOpen(false);
            }}
            className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary/20 cursor-pointer text-primary transition-colors"
            title="Xóa bộ lọc ngày"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
