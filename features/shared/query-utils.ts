import "server-only";

import type { DataResult } from "@/features/shared/types";

const thaiDate = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : thaiDate.format(date);
}

export function result<T>(data: T, error?: { message: string } | null): DataResult<T> {
  return { data, error: error?.message ?? null };
}

export function hasValues<T extends object, K extends keyof T>(
  row: T,
  keys: readonly K[],
): row is T & { [P in K]-?: NonNullable<T[P]> } {
  return keys.every((key) => row[key] !== null && row[key] !== undefined);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
