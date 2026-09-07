export const REPORTING_PERIOD_COOKIE = "plan-reporting-period";

export function parseReportingPeriodPreference(value: string | undefined): {
  fiscalYearId: string;
  quarter: 1 | 2 | 3 | 4;
} | null {
  if (!value) return null;
  const [fiscalYearId, quarterValue] = value.split(":");
  const quarter = Number(quarterValue);
  if (
    !/^[0-9a-f-]{36}$/i.test(fiscalYearId) ||
    !Number.isInteger(quarter) ||
    quarter < 1 ||
    quarter > 4
  ) {
    return null;
  }
  return { fiscalYearId, quarter: quarter as 1 | 2 | 3 | 4 };
}
