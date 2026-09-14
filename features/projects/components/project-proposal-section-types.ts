import type { OperationState } from "@/features/shared/action-state";
import type { ProjectProposalDetails } from "@/features/projects/proposal-details";

export type ProjectProposalSectionProps = {
  details: ProjectProposalDetails;
  setDetails: (details: ProjectProposalDetails) => void;
  errors: OperationState["errors"];
  disabled: boolean;
};
