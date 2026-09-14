export const QUERY_LIMITS = {
  defaultPageSize: 20,
  evidencePageSize: 18,
  adminPageSize: 20,
  adminAuditPageSize: 30,
  adminTrashRows: 100,
  selectOptions: 500,
  dashboardDecisionQueue: 50,
  recentAuditEvents: 8,
  reportExportRows: 5_000,
} as const;

export const INPUT_LIMITS = {
  title: 300,
  personName: 180,
  shortText: 120,
  longText: 5_000,
  reviewComment: 1_000,
  fileName: 255,
  searchText: 100,
} as const;

export const MONEY_LIMITS = {
  maximumBaht: 999_999_999_999,
  maximumExpenseFactor: 999_999,
} as const;

export const IMPORT_LIMITS = {
  budgetRequestBytes: 5 * 1024 * 1024,
  budgetRequestRows: 500,
  budgetRequestGroups: 100,
  disbursementBytes: 2 * 1024 * 1024,
  disbursementRows: 500,
  maximumSourceRowNumber: 10_000,
  previewIssues: 25,
  previewRows: 10,
} as const;

export const COLLECTION_LIMITS = {
  budgetRequestExpenseItems: 100,
  budgetRequestProjectMembers: 50,
  projectResponsiblePeople: 50,
  projectGoalIndicators: 30,
  projectActionPlanItems: 40,
  projectExpenseItems: 100,
} as const;

export const VALIDATION_LIMITS = {
  minimumNameLength: 2,
  minimumTitleLength: 5,
  minimumNarrativeLength: 10,
  minimumBudgetRationaleLength: 20,
  quarterMinimum: 1,
  quarterMaximum: 4,
  percentageMinimum: 0,
  percentageMaximum: 100,
} as const;
