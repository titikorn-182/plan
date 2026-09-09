import { FileUp } from "lucide-react";
import Link from "next/link";
import type { BudgetRequestState } from "@/features/budget-requests/actions";
import { BudgetRequestBudgetStep } from "@/features/budget-requests/components/budget-request-budget-step";
import type { BudgetExpenseFields } from "@/features/budget-requests/components/budget-request-expenses";
import { BudgetRequestGeneralStep } from "@/features/budget-requests/components/budget-request-general-step";
import { BudgetRequestOutputsStep } from "@/features/budget-requests/components/budget-request-outputs-step";
import { BudgetRequestStrategyStep } from "@/features/budget-requests/components/budget-request-strategy-step";
import type { BudgetProposalDetailChange } from "@/features/budget-requests/components/budget-request-step-types";
import type { BudgetExpenseCategoryId } from "@/features/budget-requests/expense-categories";
import type { BudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import type { BudgetFormOptions } from "@/features/budget-requests/types";

export interface BudgetRequestStepContentProps {
  amount: string;
  details: BudgetProposalDetails;
  errors: BudgetRequestState["errors"];
  expenseFields: BudgetExpenseFields;
  hasLegacyAmount: boolean;
  onDetailChange: BudgetProposalDetailChange;
  onExpenseChange: (category: BudgetExpenseCategoryId, value: string) => void;
  onFiscalYearChange: (value: string) => void;
  onOrganizationChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onProjectTypeChange: (value: string) => void;
  onRationaleChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  options: BudgetFormOptions;
  fiscalYearId: string;
  organizationId: string;
  ownerName: string;
  projectType: string;
  rationale: string;
  requestId?: string;
  step: number;
  title: string;
}

function EvidenceStep({ requestId }: { requestId?: string }) {
  return (
    <div className="grid min-h-48 place-items-center border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center">
      <span>
        <FileUp className="mx-auto mb-3 text-stone-400" size={30} />
        <b className="block text-sm">อัปโหลดผ่านทะเบียนหลักฐานส่วนกลาง</b>
        <small className="mt-1 block max-w-md text-xs leading-5 text-stone-500">
          บันทึกคำขอให้ได้รับรหัสก่อน แล้วเลือกคำขอนี้ในเมนูหลักฐานและเอกสาร
        </small>
        {requestId ? (
          <Link
            className="mt-4 inline-flex bg-[#cf430c] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#a93508]"
            href="/evidence"
          >
            ไปทะเบียนหลักฐาน
          </Link>
        ) : null}
      </span>
    </div>
  );
}

export function BudgetRequestStepContent(props: BudgetRequestStepContentProps) {
  if (props.step === 0) return <BudgetRequestGeneralStep {...props} />;
  if (props.step === 1) return <BudgetRequestStrategyStep {...props} />;
  if (props.step === 2) return <BudgetRequestBudgetStep {...props} />;
  if (props.step === 3) return <BudgetRequestOutputsStep {...props} />;
  return <EvidenceStep requestId={props.requestId} />;
}
