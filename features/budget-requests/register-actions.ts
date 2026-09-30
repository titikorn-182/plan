import type { DocumentStatus } from "@/features/budget-requests/types";

// Match the existing admin deletion policy; approval history must remain intact.
export const ARCHIVABLE_BUDGET_STATUSES = ["draft", "cancelled"] satisfies DocumentStatus[];

export function isBudgetRequestArchivable(status: string): boolean {
  return ARCHIVABLE_BUDGET_STATUSES.some((allowed) => allowed === status);
}
