"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { vi } from "date-fns/locale";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({
  className,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <div className={cn("calendar-wrapper flex justify-center", className)}>
      <style jsx global>{`
        .rdp-root {
          --rdp-accent-color: #2563eb;
          --rdp-accent-background-color: #eff6ff;
          --rdp-day-height: 38px;
          --rdp-day-width: 38px;
          --rdp-day_button-border-radius: 12px;
          --rdp-day_button-width: 36px;
          --rdp-day_button-height: 36px;
          margin: 0;
          font-family: inherit;
        }
        .dark .rdp-root {
          --rdp-accent-color: #3b82f6;
          --rdp-accent-background-color: #1e293b;
        }
        .rdp-caption_label {
          font-size: 0.95rem;
          font-weight: 700;
          text-transform: capitalize;
        }
        .rdp-weekday {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--muted-foreground, #64748b);
          padding-bottom: 6px;
        }
        .rdp-day_button {
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.15s ease;
        }
        .rdp-day_button:hover:not([disabled]) {
          background-color: rgba(37, 99, 235, 0.1);
          color: #2563eb;
        }
        .rdp-selected .rdp-day_button {
          background-color: #2563eb !important;
          color: #ffffff !important;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
        }
        .rdp-disabled {
          opacity: 0.25 !important;
          cursor: not-allowed;
        }
      `}</style>
      <DayPicker
        locale={vi}
        showOutsideDays={showOutsideDays}
        {...props}
      />
    </div>
  );
}
