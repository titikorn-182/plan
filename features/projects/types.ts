import type { Enums } from "@/types/database.generated";
import type { FiscalYearOption, OrganizationOption, SelectOption } from "@/features/shared/types";

export type ProjectStatus = Enums<"project_status">;

export type ProjectRow = {
  uuid: string;
  id: string;
  title: string;
  unit: string;
  budget: number;
  spent: number;
  progress: number;
  health: "ปกติ" | "เฝ้าระวัง" | "เสี่ยงสูง" | "ล่าช้า";
  owner: string;
  due: string;
  editable: boolean;
};

export type ProjectFormRecord = {
  id: string;
  version: number;
  code: string;
  organizationId: string;
  fiscalYearId: string;
  budgetRequestId: string;
  title: string;
  projectType: string;
  ownerName: string;
  coordinatorName: string;
  approvedBudget: number;
  disbursementTarget: number;
  startsOn: string;
  endsOn: string;
  status: ProjectStatus;
  pendingApproval: boolean;
};

export type ProjectFormOptions = {
  organizations: OrganizationOption[];
  fiscalYears: FiscalYearOption[];
  budgetRequests: SelectOption[];
  defaultOwnerName: string;
  record: ProjectFormRecord | null;
};

export type ProjectOption = SelectOption & {
  organizationId: string;
  fiscalYearId: string;
  approvedBudget: number;
  disbursedAmount: number;
};
