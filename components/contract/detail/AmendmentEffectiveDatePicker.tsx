"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CalendarDays, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { amendmentDate, amendmentInput } from "./ContractAmendmentWorkspace";

/** Local date strings must not be parsed as UTC instants: never shift a billing boundary. */
const parseDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const dateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

export default function AmendmentEffectiveDatePicker({ availableDates, value, onChange, disabled }: {
  availableDates: string[]; value: string; onChange: (value: string) => void; disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>();
  const dates = [...new Set(availableDates)].sort();
  const allowed = new Set(dates);
  const selected = allowed.has(value) ? parseDate(value) : undefined;
  const first = dates[0] ? parseDate(dates[0]) : undefined;
  const last = dates.at(-1) ? parseDate(dates.at(-1)!) : undefined;
  const openCalendar = () => { setMonth(selected ?? first); setOpen(true); };

  return <fieldset className="min-w-0 space-y-2" disabled={disabled}>
    <legend className="text-xs font-medium">Thời điểm áp dụng</legend>
    <p className="text-xs text-muted-foreground">Mọi điều chỉnh chỉ áp dụng từ đầu kỳ thuê tương lai, sau khi hai bên ký đủ.</p>
      <button type="button" aria-label="Ngày dự kiến áp dụng" aria-haspopup="dialog" aria-expanded={open} onClick={openCalendar} disabled={disabled || !dates.length} className={`${amendmentInput} flex items-center justify-between gap-3 text-left font-normal`}>
        <span>{allowed.has(value) ? `${amendmentDate(value)} · Đầu kỳ thuê` : "Chọn ngày trên lịch…"}</span><CalendarDays className="h-4 w-4 shrink-0 text-primary" />
      </button>
      <p className="text-xs text-muted-foreground">{dates.length ? `Chỉ chọn ngày đầu chu kỳ còn hợp lệ: ${dates.map(amendmentDate).join(", ")}.` : "Không còn đầu kỳ hợp lệ trong thời hạn hợp đồng. Không thể đổi giá/phí cho kỳ đã chốt hóa đơn."}</p>
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%_-_2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-background p-4 shadow-2xl">
        <div className="mb-1 flex items-start justify-between gap-3"><Dialog.Title className="font-semibold">Chọn ngày đầu kỳ áp dụng</Dialog.Title><Dialog.Close aria-label="Đóng lịch" className="rounded-lg p-1"><X className="h-4 w-4" /></Dialog.Close></div>
        <Dialog.Description className="mb-4 text-xs text-muted-foreground">Chỉ ngày được tô nổi bật mới có thể chọn. Ngày khác, kỳ đã chốt và ngày ngoài thời hạn thuê đều bị khóa.</Dialog.Description>
        <Calendar mode="single" required selected={selected} month={month ?? selected ?? first} onMonthChange={setMonth}
          startMonth={first} endMonth={last} showOutsideDays={false}
          disabled={day => disabled || !allowed.has(dateKey(day))}
          modifiers={{ eligible: day => allowed.has(dateKey(day)) }}
          modifiersClassNames={{ eligible: "bg-primary/10 text-primary font-semibold rounded-xl" }}
          labels={{ labelDayButton: day => `Ngày ${amendmentDate(dateKey(day))}`, labelNext: () => "Tháng sau", labelPrevious: () => "Tháng trước" }}
          onSelect={day => { if (day && allowed.has(dateKey(day))) { onChange(dateKey(day)); setOpen(false); } }}
        />
        <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">Ngày này là đầu chu kỳ thuê, không phải ngày 01 hằng tháng. Hệ thống không cho chọn tùy ý giữa kỳ.</p>
      </Dialog.Content>
    </Dialog.Portal></Dialog.Root>
  </fieldset>;
}
