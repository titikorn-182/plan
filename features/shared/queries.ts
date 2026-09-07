import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import {
  parseReportingPeriodPreference,
  REPORTING_PERIOD_COOKIE,
} from "@/features/shared/period-preference";
import type {
  FiscalYearOption,
  OrganizationOption,
  ReportingContext,
  ReportingPeriod,
} from "@/features/shared/types";
import { createClient } from "@/lib/supabase/server";
import { reportServerError } from "@/lib/observability/server-logger";

function toQuarter(value: number): ReportingPeriod["quarter"] {
  if (value <= 1) return 1;
  if (value === 2) return 2;
  if (value === 3) return 3;
  return 4;
}

function fallbackReportingPeriod(now = new Date()): ReportingPeriod {
  const month = now.getMonth();
  const quarter: ReportingPeriod["quarter"] = month >= 9 ? 1 : month <= 2 ? 2 : month <= 5 ? 3 : 4;
  const buddhistYear = now.getFullYear() + (month >= 9 ? 544 : 543);
  return {
    fiscalYearId: null,
    fiscalYearLabel: `ปีงบประมาณ ${buddhistYear}`,
    buddhistYear,
    quarter,
    quarterLabel: `ไตรมาส ${quarter}`,
  };
}

function quarterForDate(
  startsOn: string,
  endsOn: string,
  now = new Date(),
): ReportingPeriod["quarter"] {
  const start = new Date(`${startsOn}T00:00:00+07:00`);
  const end = new Date(`${endsOn}T23:59:59+07:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return fallbackReportingPeriod(now).quarter;
  }
  if (now <= start) return 1;
  if (now >= end) return 4;
  const monthDifference =
    (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  return toQuarter(Math.floor(monthDifference / 3) + 1);
}

export const getReportingContext = cache(async (): Promise<ReportingContext> => {
  const supabase = await createClient();
  const [query, cookieStore] = await Promise.all([
    supabase
      .from("fiscal_years")
      .select("id,buddhist_year,label,starts_on,ends_on,status")
      .in("status", ["open", "closed"])
      .order("buddhist_year", { ascending: false }),
    cookies(),
  ]);
  const { data, error } = query;
  if (error) {
    reportServerError("reporting_period.load", error);
    return { period: fallbackReportingPeriod(), fiscalYears: [] };
  }
  if (!data?.length) return { period: fallbackReportingPeriod(), fiscalYears: [] };

  const today = new Date();
  const todayKey = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Bangkok" }).format(today);
  const preferred = parseReportingPeriodPreference(cookieStore.get(REPORTING_PERIOD_COOKIE)?.value);
  const active =
    data.find((item) => item.id === preferred?.fiscalYearId) ??
    data.find((item) => item.starts_on <= todayKey && item.ends_on >= todayKey) ??
    data.find((item) => item.status === "open") ??
    data[0];
  const quarter = toQuarter(
    preferred?.quarter ?? quarterForDate(active.starts_on, active.ends_on, today),
  );
  return {
    period: {
      fiscalYearId: active.id,
      fiscalYearLabel: active.label,
      buddhistYear: active.buddhist_year,
      quarter,
      quarterLabel: `ไตรมาส ${quarter}`,
    },
    fiscalYears: data.map((item) => ({
      id: item.id,
      buddhistYear: item.buddhist_year,
      label: item.label,
    })),
  };
});

export async function getReportingPeriod(): Promise<ReportingPeriod> {
  return (await getReportingContext()).period;
}

export async function getOrganizationsAndYears(): Promise<{
  organizations: OrganizationOption[];
  fiscalYears: FiscalYearOption[];
  error: { message: string } | null;
}> {
  const supabase = await createClient();
  const [organizations, fiscalYears] = await Promise.all([
    supabase.from("organizations").select("id,code,name_th").eq("is_active", true).order("name_th"),
    supabase
      .from("fiscal_years")
      .select("id,buddhist_year,label")
      .in("status", ["open", "closed"])
      .order("buddhist_year", { ascending: false }),
  ]);
  return {
    organizations: (organizations.data ?? []).map<OrganizationOption>((row) => ({
      id: row.id,
      code: row.code,
      label: row.name_th,
    })),
    fiscalYears: (fiscalYears.data ?? []).map<FiscalYearOption>((row) => ({
      id: row.id,
      buddhistYear: row.buddhist_year,
      label: row.label,
    })),
    error: organizations.error ?? fiscalYears.error,
  };
}
