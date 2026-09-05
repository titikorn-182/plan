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
import {
  BUDGET_REQUEST_STEPS,
  BudgetRequestStepper,
} from "@/features/budget-requests/components/budget-request-stepper";
import type { BudgetFormOptions } from "@/features/budget-requests/types";

export function BudgetRequestForm({ options }: { options: BudgetFormOptions }) {
  const record = options.record;
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(record?.title ?? "");
  const [organizationId, setOrganizationId] = useState(
    record?.organizationId ?? options.organizations[0]?.id ?? "",
  );
  const [projectType, setProjectType] = useState(
    record?.projectType ?? "โครงการพัฒนาการเรียนการสอน",
  );
  const [ownerName, setOwnerName] = useState(record?.ownerName ?? options.defaultOwnerName);
  const [rationale, setRationale] = useState(record?.rationale ?? "");
  const [amount, setAmount] = useState(String(record?.amount ?? 0));
  const [formState, action, pending] = useActionState(saveBudgetRequestAction, {
    id: record?.id,
    code: record?.code,
    version: record?.version,
  } satisfies BudgetRequestState);

  return (
    <form className="budget-request-form pb-24" action={action}>
      <input type="hidden" name="id" value={formState.id ?? ""} />
      <input type="hidden" name="version" value={formState.version ?? 1} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="fiscalYearId" value={options.fiscalYearId} />
      <input type="hidden" name="budgetCycleId" value={options.budgetCycleId} />
      <input type="hidden" name="projectType" value={projectType} />
      <input type="hidden" name="ownerName" value={ownerName} />
      <input type="hidden" name="rationale" value={rationale} />
      <input type="hidden" name="amount" value={amount} />

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
              errors={formState.errors}
              onAmountChange={setAmount}
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

        <BudgetRequestReadiness />
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
