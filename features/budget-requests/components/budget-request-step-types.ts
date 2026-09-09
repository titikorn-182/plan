import type { BudgetRequestState } from "@/features/budget-requests/actions";
import type {
  BudgetProposalDetails,
  BudgetProposalTextField,
} from "@/features/budget-requests/proposal-details";

export type BudgetProposalDetailChange = <Key extends keyof BudgetProposalDetails>(
  field: Key,
  value: BudgetProposalDetails[Key],
) => void;

export interface BudgetProposalStepProps {
  details: BudgetProposalDetails;
  errors: BudgetRequestState["errors"];
  onDetailChange: BudgetProposalDetailChange;
}

export function getProposalFieldErrors(
  errors: BudgetRequestState["errors"],
  field: BudgetProposalTextField | "sdgs",
): string[] | undefined {
  return errors?.[`proposalDetails.${field}`];
}
