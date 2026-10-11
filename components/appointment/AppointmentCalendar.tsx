"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  addWeeks,
  format,
  isSameMonth,
  isToday,
  startOfWeek,
} from "date-fns";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  UserRound,
} from "lucide-react";
import {
  getAppointmentCalendarDays,
  type AppointmentCalendarView,
} from "@/lib/appointment-calendar";
import type { AppointmentResponse } from "@/types/appointment.type";

const WEEKDAY_LABELS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

interface AppointmentCalendarProps {
  appointments: AppointmentResponse[];
  loading?: boolean;
  viewRole?: "OWNER" | "RENTER";
  onSelectAppointment: (appointment: AppointmentResponse) => void;
}

export default function AppointmentCalendar({
  appointments,
  loading = false,
  viewRole = "RENTER",
  onSelectAppointment,
}: AppointmentCalendarProps) {
  const [view, setView] = useState<AppointmentCalendarView>("month");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");

  const days = useMemo(
    () => getAppointmentCalendarDays(anchorDate, view),
    [anchorDate, view],
  );

  const appointmentsByDate = useMemo(() => {
    const grouped = new Map<string, AppointmentResponse[]>();

    appointments.forEach((appointment) => {
      const items = grouped.get(appointment.appointmentDate) ?? [];
      items.push(appointment);
      grouped.set(appointment.appointmentDate, items);
    });

    grouped.forEach((items) =>
      items.sort((first, second) => first.startTime.localeCompare(second.startTime)),
    );

    return grouped;
  }, [appointments]);

  const title =
    view === "month"
      ? `Tháng ${format(anchorDate, "MM/yyyy")}`
      : `${format(startOfWeek(anchorDate, { weekStartsOn: 1 }), "dd/MM")} – ${format(days.at(-1)!, "dd/MM/yyyy")}`;

  const moveCalendar = (amount: number) => {
    setSlideDirection(amount < 0 ? "left" : "right");
    setAnchorDate((current) =>
      view === "month" ? addMonths(current, amount) : addWeeks(current, amount),
    );
  };

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => moveCalendar(-1)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={view === "month" ? "Tháng trước" : "Tuần trước"}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setAnchorDate(new Date())}
            className="h-8 cursor-pointer rounded-xl border border-border px-3 text-xs font-bold text-foreground transition-colors hover:bg-muted"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => moveCalendar(1)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={view === "month" ? "Tháng sau" : "Tuần sau"}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="ml-1 text-sm font-bold capitalize text-foreground sm:text-base">
            {title}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-fit items-center rounded-xl bg-muted p-1 text-xs font-semibold">
            {(["month", "week"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 transition-all ${
                  view === option
                    ? "bg-card font-bold text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option === "month" ? "Tháng" : "Tuần"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div
          key={`${view}-${anchorDate.toISOString()}`}
          className={`min-w-[840px] animate-in fade-in duration-300 motion-reduce:animate-none ${
            slideDirection === "right" ? "slide-in-from-right-4" : "slide-in-from-left-4"
          }`}
        >
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="border-r border-border px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground last:border-r-0"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayAppointments = appointmentsByDate.get(dateKey) ?? [];
              const outsideMonth = view === "month" && !isSameMonth(day, anchorDate);
              const today = isToday(day);

              return (
                <div
                  key={dateKey}
                  className={`border-b border-r border-border last:border-r-0 ${
                    view === "month" ? "min-h-32 p-1.5" : "min-h-[30rem] p-2"
                  } ${
                    today
                      ? "bg-primary/[0.08] ring-2 ring-inset ring-primary/60 dark:bg-primary/10"
                      : outsideMonth
                        ? "bg-muted/25"
                        : "bg-card"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-bold ${
                        today
                          ? "bg-primary text-primary-foreground"
                          : outsideMonth
                            ? "text-muted-foreground/50"
                            : "text-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <span className="flex items-center gap-1">
                      {today && (
                        <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-black uppercase text-primary">
                          Hôm nay
                        </span>
                      )}
                      {dayAppointments.length > 0 && (
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {dayAppointments.length} lịch
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="space-y-1">
                    {dayAppointments.map((appointment) => {
                      const completed = appointment.status === "COMPLETED";

                      return (
                        <button
                          key={appointment.id}
                          type="button"
                          onClick={() => onSelectAppointment(appointment)}
                          className={`group w-full cursor-pointer rounded-lg border text-left transition-all ${
                            view === "month"
                              ? "flex items-center gap-1 px-1.5 py-1"
                              : "space-y-1.5 p-2.5"
                          } ${
                            completed
                              ? "border-emerald-500/25 bg-emerald-500/10 hover:border-emerald-500/50 hover:bg-emerald-500/15"
                              : "border-blue-500/25 bg-blue-500/10 hover:border-blue-500/50 hover:bg-blue-500/15"
                          }`}
                          title={`${appointment.startTime.slice(0, 5)} — ${appointment.listingTitle}${
                            viewRole === "OWNER" ? ` — ${appointment.renterName}` : ""
                          }`}
                        >
                          {view === "month" ? (
                            <>
                              <Clock3
                                className={`h-2.5 w-2.5 shrink-0 ${
                                  completed ? "text-emerald-600" : "text-blue-600"
                                }`}
                              />
                              <span
                                className={`shrink-0 text-[9px] font-black ${
                                  completed
                                    ? "text-emerald-700 dark:text-emerald-300"
                                    : "text-blue-700 dark:text-blue-300"
                                }`}
                              >
                                {appointment.startTime.slice(0, 5)}
                              </span>
                              <Building2 className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-foreground">
                                {appointment.listingTitle}
                              </span>
                              {completed && (
                                <span
                                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
                                  title="Đã xem xong"
                                  aria-label="Đã xem xong"
                                >
                                  <Check className="h-2.5 w-2.5" />
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="flex items-center justify-between gap-1">
                                <span
                                  className={`flex items-center gap-1 text-[10px] font-black ${
                                    completed
                                      ? "text-emerald-700 dark:text-emerald-300"
                                      : "text-blue-700 dark:text-blue-300"
                                  }`}
                                >
                                  <Clock3 className="h-3 w-3" />
                                  {appointment.startTime.slice(0, 5)}–{appointment.endTime.slice(0, 5)}
                                </span>
                                <span className="flex items-center gap-1">
                                  {completed && (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                                        <Check className="h-2.5 w-2.5" />
                                      </span>
                                      Done
                                    </span>
                                  )}
                                </span>
                              </span>
                              <span className="flex items-start gap-1 text-xs font-bold leading-4 text-foreground">
                                <Building2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                                <span>{appointment.listingTitle}</span>
                              </span>
                              {appointment.listingAddress && (
                                <span className="flex items-start gap-1 text-[10px] leading-3.5 text-muted-foreground">
                                  <MapPin className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                                  <span>{appointment.listingAddress}</span>
                                </span>
                              )}
                              {viewRole === "OWNER" && (
                                <span className="flex items-start gap-1 text-[10px] font-semibold text-foreground/80">
                                  <UserRound className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                                  <span>
                                    {appointment.renterName} · {appointment.visitorCount} người
                                  </span>
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {!loading && appointments.length === 0 && (
        <div className="flex flex-col items-center gap-2 border-t border-border px-4 py-8 text-center">
          <CalendarDays className="h-9 w-9 text-muted-foreground/40" />
          <p className="text-sm font-bold text-foreground">Chưa có lịch xem nhà trong calendar</p>
          <p className="text-xs text-muted-foreground">
            Lịch đã xác nhận và đã xem xong sẽ xuất hiện tại đây.
          </p>
        </div>
      )}
    </section>
  );
}
