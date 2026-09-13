import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  bangkokDateKey,
  daysUntil,
  projectCompletionDueDate,
} from "@/features/project-completion-reports/deadline";

describe("project completion report deadline", () => {
  it.each([
    ["2027-09-30", "2027-10-15"],
    ["2027-12-25", "2028-01-09"],
    ["2028-02-20", "2028-03-06"],
  ])("adds 15 calendar days to %s", (endsOn, expected) => {
    expect(projectCompletionDueDate(endsOn)).toBe(expected);
  });

  it("supports arbitrary calendar-day offsets", () => {
    expect(addCalendarDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("reports remaining and overdue days against a UTC calendar date", () => {
    const now = new Date("2027-10-10T10:00:00.000Z");
    expect(daysUntil("2027-10-15", now)).toBe(5);
    expect(daysUntil("2027-10-08", now)).toBe(-2);
  });

  it("changes day at Bangkok midnight instead of UTC midnight", () => {
    expect(bangkokDateKey(new Date("2027-10-10T17:00:00.000Z"))).toBe("2027-10-11");
    expect(daysUntil("2027-10-15", new Date("2027-10-10T16:59:59.000Z"))).toBe(5);
    expect(daysUntil("2027-10-15", new Date("2027-10-10T17:00:00.000Z"))).toBe(4);
  });
});
