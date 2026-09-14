import type { FiscalYearOption } from "@/features/shared/types";

export function sortProjectFiscalYears(
  fiscalYears: readonly FiscalYearOption[],
): FiscalYearOption[] {
  return [...fiscalYears].sort(
    (first, second) =>
      first.buddhistYear - second.buddhistYear || first.label.localeCompare(second.label, "th"),
  );
}
