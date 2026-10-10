import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { format } from "date-fns";
import { getAppointmentCalendarDays } from "./appointment-calendar.ts";

describe("appointment calendar", () => {
  it("builds a Monday-to-Sunday month grid", () => {
    const days = getAppointmentCalendarDays(new Date(2026, 9, 15), "month");

    assert.equal(format(days[0], "yyyy-MM-dd"), "2026-09-28");
    assert.equal(format(days.at(-1)!, "yyyy-MM-dd"), "2026-11-01");
    assert.equal(days.length, 35);
  });

  it("builds the selected Monday-to-Sunday week", () => {
    const days = getAppointmentCalendarDays(new Date(2026, 9, 15), "week");

    assert.deepEqual(
      days.map((day) => format(day, "yyyy-MM-dd")),
      [
        "2026-10-12",
        "2026-10-13",
        "2026-10-14",
        "2026-10-15",
        "2026-10-16",
        "2026-10-17",
        "2026-10-18",
      ],
    );
  });
});
