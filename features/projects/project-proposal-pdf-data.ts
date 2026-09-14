import type { ProjectProposalDetails } from "@/features/projects/proposal-details";
import type { ProjectFormOptions, ProjectStatus } from "@/features/projects/types";

export type ProjectProposalPdfData = {
  code: string;
  title: string;
  organizationName: string;
  fiscalYearLabel: string;
  budgetRequestLabel: string;
  projectType: string;
  ownerName: string;
  coordinatorName: string;
  approvedBudget: number;
  disbursementTarget: number;
  startsOn: string;
  endsOn: string;
  status: ProjectStatus;
  proposalDetails: ProjectProposalDetails;
};

export function resolveProjectProposalPdfData(
  options: ProjectFormOptions,
): ProjectProposalPdfData | null {
  const record = options.record;
  if (!record) return null;

  const organizationName =
    options.organizations.find((item) => item.id === record.organizationId)?.label ?? "-";
  const fiscalYearLabel =
    options.fiscalYears.find((item) => item.id === record.fiscalYearId)?.label ?? "-";
  const budgetRequestLabel = record.budgetRequestId
    ? (options.budgetRequests.find((item) => item.id === record.budgetRequestId)?.label ?? "-")
    : "ไม่ได้อ้างอิงคำของบ";

  return {
    code: record.code,
    title: record.title,
    organizationName,
    fiscalYearLabel,
    budgetRequestLabel,
    projectType: record.projectType,
    ownerName: record.ownerName,
    coordinatorName: record.coordinatorName,
    approvedBudget: record.approvedBudget,
    disbursementTarget: record.disbursementTarget,
    startsOn: record.startsOn,
    endsOn: record.endsOn,
    status: record.status,
    proposalDetails: record.proposalDetails,
  };
}
