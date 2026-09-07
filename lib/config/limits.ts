export const QUERY_LIMITS = {
  defaultPageSize: 20,
  evidencePageSize: 18,
  adminPageSize: 20,
  adminAuditPageSize: 30,
  adminTrashRows: 100,
  selectOptions: 500,
  dashboardDecisionQueue: 50,
  recentAuditEvents: 8,
} as const;

export const INPUT_LIMITS = {
  title: 300,
  personName: 180,
  shortText: 120,
  longText: 5_000,
  reviewComment: 1_000,
  fileName: 255,
} as const;
