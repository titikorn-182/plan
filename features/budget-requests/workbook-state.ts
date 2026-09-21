import {
  createBudgetRequestExpenseItemFromSource,
  createEmptyBudgetRequestExpenseItem,
  type BudgetRequestExpenseItemDraft,
} from "@/features/budget-requests/expense-items";
import {
  getBudgetRequestOrganizationSourceCode,
  isBudgetRequestOrganizationName,
} from "@/features/budget-requests/organization-options";
import {
  createEmptyBudgetRequestProjectMember,
  type BudgetRequestProjectMemberDraft,
} from "@/features/budget-requests/project-members";
import {
  BUDGET_REQUEST_IMPORT_COLUMNS,
  createEmptyBudgetRequestSourceValues,
  type BudgetRequestSourceValues,
} from "@/features/budget-requests/source-fields";
import type { BudgetFormOptions } from "@/features/budget-requests/types";

export type BudgetRequestWorkbookState = {
  values: BudgetRequestSourceValues;
  organizationId: string;
  fiscalYearId: string;
  budgetCycleId: string;
  expenseItems: BudgetRequestExpenseItemDraft[];
  projectMembers: BudgetRequestProjectMemberDraft[];
  selectedSdgs: string[];
  sdgAlignment: string;
  hasLegacyBudget: boolean;
};

export function createBudgetRequestWorkbookState(
  options: BudgetFormOptions,
): BudgetRequestWorkbookState {
  const record = options.record;
  const initialFiscalYear = options.fiscalYears[0];
  const values = createEmptyBudgetRequestSourceValues();
  if (!record) {
    return {
      values,
      organizationId: "",
      fiscalYearId: initialFiscalYear?.id ?? "",
      budgetCycleId: initialFiscalYear?.budgetCycleId ?? "",
      expenseItems: [createEmptyBudgetRequestExpenseItem(1)],
      projectMembers: [createEmptyBudgetRequestProjectMember(1)],
      selectedSdgs: [],
      sdgAlignment: "",
      hasLegacyBudget: false,
    };
  }

  const details = record.proposalDetails;
  for (const { key } of BUDGET_REQUEST_IMPORT_COLUMNS) {
    switch (key) {
      case "projectActivityName":
        values[key] = record.title;
        break;
      case "projectType":
        values[key] = record.projectType;
        break;
      case "ownerName":
        values[key] = record.ownerName;
        break;
      case "rationale":
        values[key] = record.rationale;
        break;
      case "totalBudget":
        values[key] = String(record.amount);
        break;
      default:
        values[key] = details[key];
    }
  }

  if (!values.organizationName.trim()) {
    const owningOrganization = options.organizations.find(
      (organization) => organization.id === record.organizationId,
    );
    if (owningOrganization && isBudgetRequestOrganizationName(owningOrganization.name)) {
      values.organizationName = owningOrganization.name.trim();
    }
  }
  if (!values.organizationCode.trim()) {
    values.organizationCode = getBudgetRequestOrganizationSourceCode(values.organizationName);
  }

  const hasLegacyBudget = details.expenseItems.length === 0;
  const expenseItems = hasLegacyBudget
    ? [
        // Retain only known source values. The UI must require explicit conversion
        // before replacing an existing legacy amount or category breakdown.
        createBudgetRequestExpenseItemFromSource(
          {
            expenditureBudget: details.expenditureBudget,
            expenseCategory: details.expenseCategory,
            expenseSubcategory: details.expenseSubcategory,
            expenseDescription: details.expenseDescription,
            totalBudget: String(record.amount),
          },
          1,
        ),
      ]
    : details.expenseItems.map((item, index) => ({
        ...item,
        id: index + 1,
        amount: String(item.amount),
      }));

  return {
    values,
    organizationId: record.organizationId,
    fiscalYearId: record.fiscalYearId,
    budgetCycleId: record.budgetCycleId,
    expenseItems,
    projectMembers:
      details.projectMembers.length > 0
        ? details.projectMembers.map((member, index) => ({ ...member, id: index + 1 }))
        : [createEmptyBudgetRequestProjectMember(1)],
    selectedSdgs: [...details.sdgs],
    sdgAlignment: details.alignmentDescription,
    hasLegacyBudget,
  };
}
