import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type AppointmentCalendarView = "month" | "week";

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

export function getAppointmentCalendarDays(
  anchorDate: Date,
  view: AppointmentCalendarView,
): Date[] {
  const rangeStart =
    view === "month"
      ? startOfWeek(startOfMonth(anchorDate), WEEK_OPTIONS)
      : startOfWeek(anchorDate, WEEK_OPTIONS);
  const rangeEnd =
    view === "month"
      ? endOfWeek(endOfMonth(anchorDate), WEEK_OPTIONS)
      : endOfWeek(anchorDate, WEEK_OPTIONS);

  return eachDayOfInterval({ start: rangeStart, end: rangeEnd });
}
