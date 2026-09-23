import type { Enums } from "@/types/database.generated";
import type { FiscalYearOption, OrganizationOption, SelectOption } from "@/features/shared/types";
import type { ProjectProposalDetails } from "@/features/projects/proposal-details";
import type { FiscalYearMasterData } from "@/features/shared/master-data";

export type ProjectStatus = Enums<"project_status">;

export type ApprovedBudgetRequestOption = SelectOption & {
  code: string;
  title: string;
  organizationId: string;
  fiscalYearId: string;
};

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
  status: ProjectStatus;
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
  proposalDetails: ProjectProposalDetails;
};

export type ProjectFormOptions = {
  organizations: OrganizationOption[];
  fiscalYears: FiscalYearOption[];
  masterData: FiscalYearMasterData[];
  budgetRequests: ApprovedBudgetRequestOption[];
  defaultOwnerName: string;
  record: ProjectFormRecord | null;
};
