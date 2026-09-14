import { isRecord } from "@/features/shared/query-utils";

const thaiDateTime = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : thaiDateTime.format(date);
}

export function changedFields(oldData: unknown, newData: unknown): string[] {
  if (!isRecord(oldData) || !isRecord(newData)) return [];
  return Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)])).filter(
    (key) => JSON.stringify(oldData[key]) !== JSON.stringify(newData[key]),
  );
}
