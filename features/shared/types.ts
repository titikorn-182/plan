export type DataResult<T> = { data: T; error: string | null };

export type ReportingPeriod = {
  fiscalYearId: string | null;
  fiscalYearLabel: string;
  buddhistYear: number;
  quarter: 1 | 2 | 3 | 4;
  quarterLabel: string;
};

export type SelectOption = { id: string; label: string };
export type OrganizationOption = SelectOption & { code: string };
export type FiscalYearOption = SelectOption & { buddhistYear: number };
