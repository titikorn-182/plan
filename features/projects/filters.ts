import { z } from "zod";
import type { SearchParamValue } from "@/features/shared/pagination";

export const PROJECT_HEALTH_FILTERS = ["normal", "watch", "at_risk", "delayed"] as const;
export const PROJECT_STATUS_FILTERS = [
  "proposed",
  "active",
  "on_hold",
  "completed",
  "cancelled",
] as const;

export type ProjectFilters = {
  search: string;
  organizationId: string;
  health: (typeof PROJECT_HEALTH_FILTERS)[number] | "";
  status: (typeof PROJECT_STATUS_FILTERS)[number] | "";
  minBudget: number | null;
  maxBudget: number | null;
  minProgress: number | null;
  maxProgress: number | null;
};

const filterSchema = z.object({
  search: z.string().trim().max(100).catch(""),
  organizationId: z.string().uuid().or(z.literal("")).catch(""),
  health: z.enum(PROJECT_HEALTH_FILTERS).or(z.literal("")).catch(""),
  status: z.enum(PROJECT_STATUS_FILTERS).or(z.literal("")).catch(""),
  minBudget: z.coerce.number().finite().min(0).nullable().catch(null),
  maxBudget: z.coerce.number().finite().min(0).nullable().catch(null),
  minProgress: z.coerce.number().finite().min(0).max(100).nullable().catch(null),
  maxProgress: z.coerce.number().finite().min(0).max(100).nullable().catch(null),
});

function first(value: SearchParamValue): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function numberInput(value: SearchParamValue): string | null {
  const raw = first(value).trim();
  return raw === "" ? null : raw;
}

export function parseProjectFilters(
  values: Readonly<Record<string, SearchParamValue>>,
): ProjectFilters {
  return filterSchema.parse({
    search: first(values.search),
    organizationId: first(values.organizationId),
    health: first(values.health),
    status: first(values.status),
    minBudget: numberInput(values.minBudget),
    maxBudget: numberInput(values.maxBudget),
    minProgress: numberInput(values.minProgress),
    maxProgress: numberInput(values.maxProgress),
  });
}

export function projectFilterQuery(filters: ProjectFilters): Record<string, string | undefined> {
  return {
    search: filters.search || undefined,
    organizationId: filters.organizationId || undefined,
    health: filters.health || undefined,
    status: filters.status || undefined,
    minBudget: filters.minBudget === null ? undefined : String(filters.minBudget),
    maxBudget: filters.maxBudget === null ? undefined : String(filters.maxBudget),
    minProgress: filters.minProgress === null ? undefined : String(filters.minProgress),
    maxProgress: filters.maxProgress === null ? undefined : String(filters.maxProgress),
  };
}

export function hasProjectFilters(filters: ProjectFilters): boolean {
  return Object.values(projectFilterQuery(filters)).some(Boolean);
}

export function isProjectStatus(value: string): value is (typeof PROJECT_STATUS_FILTERS)[number] {
  return PROJECT_STATUS_FILTERS.includes(value as (typeof PROJECT_STATUS_FILTERS)[number]);
}
