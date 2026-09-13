const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function bangkokDateKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function addCalendarDays(value: string, days: number): string {
  const date = parseIsoDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function projectCompletionDueDate(endsOn: string): string {
  return addCalendarDays(endsOn, 15);
}

export function daysUntil(dueAt: string, now = new Date()): number {
  const today = parseIsoDate(bangkokDateKey(now)).getTime();
  return Math.ceil((parseIsoDate(dueAt).getTime() - today) / DAY_MS);
}
