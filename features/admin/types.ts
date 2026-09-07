import type { AppRole } from "@/features/auth/types";
import type { PaginationMeta } from "@/features/shared/pagination";

export const ADMIN_SECTIONS = [
  "users",
  "reference",
  "quality",
  "audit",
  "trash",
  "settings",
] as const;

export type AdminSection = (typeof ADMIN_SECTIONS)[number];

export function parseAdminSection(value: string | string[] | undefined): AdminSection {
  const candidate = Array.isArray(value) ? value[0] : value;
  return ADMIN_SECTIONS.find((section) => section === candidate) ?? "users";
}

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  active: boolean;
  roles: AppRole[];
  organizationIds: string[];
};

export type AuditRow = {
  id: number;
  action: string;
  entityType: string;
  createdAt: string;
  actorEmail: string;
  organizationName: string;
  reason: string | null;
  changedFields: string[];
};

export type AdminSummary = {
  totalUsers: number;
  inactiveUsers: number;
  activeOrganizations: number;
  changesToday: number;
};

export type AdminUsersData = {
  users: AdminUser[];
  pagination: PaginationMeta;
};

export type ReferenceOrganization = {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  organizationType: string;
  parentId: string | null;
  active: boolean;
};

export type ReferenceFiscalYear = {
  id: string;
  buddhistYear: number;
  label: string;
  status: "open" | "closed" | "archived";
  startsOn: string;
  endsOn: string;
};

export type ReferenceBudgetCycle = {
  id: string;
  fiscalYearId: string;
  fiscalYearLabel: string;
  name: string;
  status: "open" | "closed" | "archived";
  opensAt: string;
  closesAt: string;
  allowStaffSubmit: boolean;
};

export type AdminReferenceData = {
  organizations: ReferenceOrganization[];
  fiscalYears: ReferenceFiscalYear[];
  budgetCycles: ReferenceBudgetCycle[];
};

export type DataQualityIssue = {
  id: string;
  title: string;
  detail: string;
  count: number;
  severity: "critical" | "warning" | "review";
  href: string;
  actionLabel: string;
};

export type AdminQualityData = {
  issues: DataQualityIssue[];
  checkedAt: string;
  passedChecks: number;
};

export type ArchivedRecord = {
  id: string;
  entityType: "budget_request" | "project" | "attachment" | "comment" | "fiscal_year";
  code: string;
  title: string;
  archivedAt: string;
};

export type AdminSettings = {
  id: string;
  allowedEmailDomain: string;
  defaultFiscalYearId: string | null;
  defaultQuarter: 1 | 2 | 3 | 4;
  reminderDaysBefore: number;
  updatedAt: string;
};
