"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { RegisterSection } from "@/components/ui/module-primitives";
import {
  saveBudgetRequestAction,
  type BudgetRequestState,
} from "@/features/budget-requests/actions";
import { BudgetRequestFormActions } from "@/features/budget-requests/components/budget-request-form-actions";
import { BudgetRequestReadiness } from "@/features/budget-requests/components/budget-request-readiness";
import { BudgetRequestStepContent } from "@/features/budget-requests/components/budget-request-step-content";
import type { BudgetProposalDetailChange } from "@/features/budget-requests/components/budget-request-step-types";
import {
  BUDGET_REQUEST_STEPS,
  BudgetRequestStepper,
} from "@/features/budget-requests/components/budget-request-stepper";
import type { BudgetFormOptions } from "@/features/budget-requests/types";
import type { BudgetExpenseFields } from "@/features/budget-requests/components/budget-request-expenses";
import {
  createEmptyBudgetExpenseBreakdown,
  getBudgetExpenseTotal,
  type BudgetExpenseBreakdown,
} from "@/features/budget-requests/expense-categories";
import {
  createEmptyBudgetProposalDetails,
  type BudgetProposalTextField,
} from "@/features/budget-requests/proposal-details";

const GENERAL_DETAIL_FIELDS: BudgetProposalTextField[] = [
  "organizationCode",
  "ownerPosition",
  "startsOn",
  "endsOn",
];
const STRATEGY_DETAIL_FIELDS: BudgetProposalTextField[] = [
  "fundingSource",
  "fundingSourceDetail",
  "missionName",
  "universityStrategy",
  "goalName",
  "strategyName",
  "fundName",
  "operationalPlanCode",
  "operationalPlanName",
  "activityCode",
  "alignmentDescription",
];
const BUDGET_DETAIL_FIELDS: BudgetProposalTextField[] = [
  "expenseSubcategory",
  "expenseDescription",
];

function getErrorStep(errors: BudgetRequestState["errors"]): number | null {
  const fields = Object.keys(errors ?? {});
  if (fields.some((field) => field === "amount" || field.startsWith("expenseBreakdown"))) return 2;
  for (const [step, detailFields] of [
    [0, GENERAL_DETAIL_FIELDS],
    [1, STRATEGY_DETAIL_FIELDS],
    [2, BUDGET_DETAIL_FIELDS],
  ] as const) {
    if (
      fields.some((field) => detailFields.some((detail) => field === `proposalDetails.${detail}`))
    ) {
      return step;
    }
  }
  if (fields.some((field) => field.startsWith("proposalDetails."))) return 3;
  if (fields.length > 0) return 0;
  return null;
}

export function BudgetRequestForm({ options }: { options: BudgetFormOptions }) {
  const record = options.record;
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(record?.title ?? "");
  const [organizationId, setOrganizationId] = useState(
    record?.organizationId ?? options.organizations[0]?.id ?? "",
  );
  const initialFiscalYear =
    options.fiscalYears.find((item) => item.id === record?.fiscalYearId) ?? options.fiscalYears[0];
  const [fiscalYearId, setFiscalYearId] = useState(initialFiscalYear?.id ?? "");
  const [budgetCycleId, setBudgetCycleId] = useState(
    record?.budgetCycleId ?? initialFiscalYear?.budgetCycleId ?? "",
  );
  const [projectType, setProjectType] = useState(
    record?.projectType ?? "โครงการพัฒนาการเรียนการสอน",
  );
  const [ownerName, setOwnerName] = useState(record?.ownerName ?? "");
  const [rationale, setRationale] = useState(record?.rationale ?? "");
  const [proposalDetails, setProposalDetails] = useState(
    record?.proposalDetails ?? createEmptyBudgetProposalDetails(),
  );
  const [expenseFields, setExpenseFields] = useState<BudgetExpenseFields>(
    () =>
      Object.fromEntries(
        Object.entries(record?.expenseBreakdown ?? createEmptyBudgetExpenseBreakdown()).map(
          ([category, value]) => [category, value === 0 ? "" : String(value)],
        ),
      ) as BudgetExpenseFields,
  );
  const [hasLegacyAmount, setHasLegacyAmount] = useState(
    Boolean(record && !record.expenseBreakdown && record.amount > 0),
  );
  const handleDetailChange: BudgetProposalDetailChange = (field, value) => {
    setProposalDetails((current) => ({ ...current, [field]: value }));
  };
  const expenseAmounts = Object.fromEntries(
    Object.entries(expenseFields).map(([category, value]) => [
      category,
      Number.isFinite(Number(value)) ? Number(value) : 0,
    ]),
  ) as BudgetExpenseBreakdown;
  const amount = String(
    hasLegacyAmount ? (record?.amount ?? 0) : getBudgetExpenseTotal(expenseAmounts),
  );
  const [formState, action, pending] = useActionState(
    async (previous: BudgetRequestState, formData: FormData) => {
      const nextState = await saveBudgetRequestAction(previous, formData);
      const errorStep = getErrorStep(nextState.errors);
      if (errorStep !== null) setStep(errorStep);
      return nextState;
    },
    {
      id: record?.id,
      code: record?.code,
      version: record?.version,
    } satisfies BudgetRequestState,
  );

  return (
    <form className="budget-request-form pb-24" action={action}>
      <input type="hidden" name="budgetRequestId" value={formState.id ?? ""} />
      <input type="hidden" name="version" value={formState.version ?? 1} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="fiscalYearId" value={fiscalYearId} />
      <input type="hidden" name="budgetCycleId" value={budgetCycleId} />
      <input type="hidden" name="projectType" value={projectType} />
      <input type="hidden" name="ownerName" value={ownerName} />
      <input type="hidden" name="rationale" value={rationale} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="proposalDetails" value={JSON.stringify(proposalDetails)} />
      <input
        type="hidden"
        name="expenseBreakdown"
        value={JSON.stringify(hasLegacyAmount ? null : expenseFields)}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-[#c9440b]"
          href="/budget-requests"
        >
          <ArrowLeft size={17} /> กลับทะเบียนคำของบ
        </Link>
        <span
          className={`text-xs ${formState.success ? "text-emerald-700" : formState.message ? "text-red-700" : "text-stone-500"}`}
          role="status"
          aria-live="polite"
        >
          {formState.message ?? "ระบบจะบันทึกเมื่อกด “บันทึกฉบับร่าง”"}
        </span>
      </div>

      <BudgetRequestStepper currentStep={step} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <RegisterSection
          title={`${step + 1}. ${BUDGET_REQUEST_STEPS[step]}`}
          aside={
            <span className="text-xs text-stone-500">{formState.code ?? "ยังไม่มีรหัสคำขอ"}</span>
          }
        >
          <div className="p-5 sm:p-6">
            <BudgetRequestStepContent
              amount={amount}
              details={proposalDetails}
              errors={formState.errors}
              expenseFields={expenseFields}
              hasLegacyAmount={hasLegacyAmount}
              fiscalYearId={fiscalYearId}
              onExpenseChange={(category, value) => {
                setHasLegacyAmount(false);
                setExpenseFields((current) => ({ ...current, [category]: value }));
              }}
              onDetailChange={handleDetailChange}
              onFiscalYearChange={(value) => {
                const fiscalYear = options.fiscalYears.find((item) => item.id === value);
                setFiscalYearId(value);
                setBudgetCycleId(fiscalYear?.budgetCycleId ?? "");
              }}
              onOrganizationChange={setOrganizationId}
              onOwnerChange={setOwnerName}
              onProjectTypeChange={setProjectType}
              onRationaleChange={setRationale}
              onTitleChange={setTitle}
              options={options}
              organizationId={organizationId}
              ownerName={ownerName}
              projectType={projectType}
              rationale={rationale}
              requestId={formState.id}
              step={step}
              title={title}
            />
          </div>
        </RegisterSection>

        <BudgetRequestReadiness
          amount={amount}
          details={proposalDetails}
          fiscalYearId={fiscalYearId}
          onNavigate={setStep}
          organizationId={organizationId}
          ownerName={ownerName}
          projectType={projectType}
          rationale={rationale}
          title={title}
        />
      </div>

      <BudgetRequestFormActions
        pending={pending}
        step={step}
        onBack={() => setStep((value) => Math.max(0, value - 1))}
        onNext={() => setStep((value) => Math.min(BUDGET_REQUEST_STEPS.length - 1, value + 1))}
      />
    </form>
  );
}
