"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { FieldError, FieldLabel, FormActions, fieldClass } from "@/components/ui/operation-form";
import {
  saveBudgetRequestAction,
  type BudgetRequestState,
} from "@/features/budget-requests/actions";
import {
  BUDGET_FUND_OPTIONS,
  BUDGET_ORGANIZATION_CODE_OPTIONS,
} from "@/features/budget-requests/proposal-details";
import {
  BUDGET_REQUEST_IMPORT_COLUMNS,
  BUDGET_REQUEST_SOURCE_SECTIONS,
  createEmptyBudgetRequestSourceValues,
  getBudgetRequestSourceCompletion,
  toBudgetProposalDetails,
  type BudgetRequestSourceKey,
  type BudgetRequestSourceValues,
} from "@/features/budget-requests/source-fields";
import { BudgetRequestSourceSection } from "@/features/budget-requests/components/budget-request-source-section";
import { BudgetRequestImportPanel } from "@/features/budget-requests/components/budget-request-import-panel";
import { BudgetRequestSourceReadiness } from "@/features/budget-requests/components/budget-request-source-readiness";
import type { BudgetFormOptions } from "@/features/budget-requests/types";

function inferOrganizationId(
  record: BudgetRequestSourceValues,
  options: BudgetFormOptions["organizations"],
): string | undefined {
  const direct = options.find((option) => option.name.trim() === record.organizationName.trim());
  if (direct) return direct.id;
  const keyword =
    record.organizationCode === "2302"
      ? "ภาควิชาการเมืองและความสัมพันธ์ระหว่างประเทศ"
      : record.organizationCode === "2303"
        ? "ภาควิชารัฐประศาสนศาสตร์"
        : "";
  return keyword ? options.find((option) => option.name.includes(keyword))?.id : undefined;
}

export function BudgetRequestWorkbookForm({ options }: { options: BudgetFormOptions }) {
  const initialFiscalYear = options.fiscalYears[0];
  const [values, setValues] = useState(createEmptyBudgetRequestSourceValues);
  const [organizationId, setOrganizationId] = useState("");
  const [fiscalYearId, setFiscalYearId] = useState(initialFiscalYear?.id ?? "");
  const [budgetCycleId, setBudgetCycleId] = useState(initialFiscalYear?.budgetCycleId ?? "");

  const proposalDetails = toBudgetProposalDetails(values);
  const amount = values.totalBudget.trim() || "0";
  const [formState, action, pending] = useActionState(
    saveBudgetRequestAction,
    {} satisfies BudgetRequestState,
  );

  const applyImportedRecord = (record: BudgetRequestSourceValues) => {
    setValues(record);
    const inferredOrganizationId = inferOrganizationId(record, options.organizations);
    setOrganizationId(inferredOrganizationId ?? "");
  };

  const handleValueChange = (key: BudgetRequestSourceKey, value: string) => {
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "organizationCode") {
        next.organizationName =
          BUDGET_ORGANIZATION_CODE_OPTIONS.find((option) => option.value === value)?.label ??
          current.organizationName;
      }
      if (key === "fundCode") {
        next.fundName =
          BUDGET_FUND_OPTIONS.find((option) => option.code === value)?.name ?? current.fundName;
      }
      return next;
    });
  };

  const completion = getBudgetRequestSourceCompletion(values);
  const completionPercent = Math.round((completion / BUDGET_REQUEST_IMPORT_COLUMNS.length) * 100);

  return (
    <form className="budget-request-form pb-24" action={action}>
      <input type="hidden" name="budgetRequestId" value={formState.id ?? ""} />
      <input type="hidden" name="version" value={formState.version ?? 1} />
      <input type="hidden" name="title" value={values.projectActivityName} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="fiscalYearId" value={fiscalYearId} />
      <input type="hidden" name="budgetCycleId" value={budgetCycleId} />
      <input type="hidden" name="projectType" value={values.projectType} />
      <input type="hidden" name="ownerName" value={values.ownerName} />
      <input type="hidden" name="rationale" value={values.rationale} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="proposalDetails" value={JSON.stringify(proposalDetails)} />
      <input type="hidden" name="expenseBreakdown" value="null" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-[#c9440b]"
          href="/budget-requests"
        >
          <ArrowLeft size={17} /> กลับทะเบียนคำของบ
        </Link>
        <p
          className={`text-xs ${formState.success ? "text-emerald-700" : formState.message ? "text-red-700" : "text-stone-500"}`}
          role="status"
          aria-live="polite"
        >
          {formState.message ?? "บันทึกฉบับร่างได้ทุกเมื่อ และส่งคำขอเมื่อข้อมูลสำคัญครบ"}
        </p>
      </div>

      <header className="border border-stone-200 border-t-2 border-t-[#ee4f16] bg-white px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <h1 className="text-xl font-extrabold tracking-[-0.025em] text-stone-950 sm:text-2xl">
              สร้างคำของบประมาณจากข้อมูลโครงการ
            </h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              แบบฟอร์มนี้ใช้หัวตารางครบทั้ง 36 คอลัมน์จากชุดข้อมูล Executive DataProject
              และรองรับการเติมข้อมูลจาก XLSX หรือ CSV
            </p>
          </div>
          <div className="flex items-center gap-3 border-t border-stone-200 pt-4 lg:border-t-0 lg:pt-0">
            <span className="text-right">
              <b className="block text-lg tabular-nums text-stone-950">
                {completion}/{BUDGET_REQUEST_IMPORT_COLUMNS.length}
              </b>
              <small className="text-xs text-stone-500">หัวข้อที่มีข้อมูล</small>
            </span>
            <div
              className="h-2 w-28 bg-stone-200"
              role="progressbar"
              aria-label="ความครบถ้วนของหัวข้อจากไฟล์ต้นทาง"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionPercent}
            >
              <div className="h-full bg-[#ee4f16]" style={{ width: `${completionPercent}%` }} />
            </div>
          </div>
        </div>
      </header>

      <BudgetRequestImportPanel
        hasExistingValues={completion > 0}
        locked={Boolean(formState.id)}
        onApplyRecord={applyImportedRecord}
      />

      <nav
        className="mt-5 flex gap-px overflow-x-auto border border-stone-200 bg-stone-200 p-px xl:hidden"
        aria-label="ไปยังส่วนของแบบฟอร์ม"
      >
        <a
          className="shrink-0 bg-white px-4 py-3 text-xs font-semibold text-stone-700 hover:bg-[#fff3ea]"
          href="#section-workflow"
        >
          ข้อมูลระบบ
        </a>
        {BUDGET_REQUEST_SOURCE_SECTIONS.map((section) => (
          <a
            className="shrink-0 bg-white px-4 py-3 text-xs font-semibold text-stone-700 hover:bg-[#fff3ea]"
            href={`#section-${section.id}`}
            key={section.id}
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <section className="scroll-mt-24 border border-stone-200 bg-white" id="section-workflow">
            <header className="border-b border-stone-200 bg-stone-50 px-5 py-4 sm:px-6">
              <h2 className="text-base font-bold text-stone-950">ข้อมูลสำหรับบันทึกในระบบ</h2>
              <p className="mt-1 text-xs leading-5 text-stone-600">
                เลือกหน่วยงานที่มีสิทธิ์ดูแลคำขอและปีงบประมาณก่อนบันทึก
              </p>
            </header>
            <div className="grid gap-5 p-5 md:grid-cols-2 sm:p-6">
              <label>
                <FieldLabel required>หน่วยงานเจ้าของคำขอในระบบ</FieldLabel>
                <select
                  className={fieldClass}
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  required
                  aria-invalid={Boolean(formState.errors?.organizationId?.length)}
                  aria-describedby={
                    formState.errors?.organizationId?.length
                      ? "budget-organization-error"
                      : undefined
                  }
                >
                  <option value="">เลือกหน่วยงานเจ้าของคำขอ</option>
                  {options.organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
                <FieldError
                  errors={formState.errors?.organizationId}
                  id="budget-organization-error"
                />
              </label>
              <label>
                <FieldLabel required>ปีงบประมาณ</FieldLabel>
                <select
                  className={fieldClass}
                  value={fiscalYearId}
                  onChange={(event) => {
                    const fiscalYear = options.fiscalYears.find(
                      (item) => item.id === event.target.value,
                    );
                    setFiscalYearId(event.target.value);
                    setBudgetCycleId(fiscalYear?.budgetCycleId ?? "");
                  }}
                  required
                  aria-invalid={Boolean(formState.errors?.fiscalYearId?.length)}
                  aria-describedby={
                    formState.errors?.fiscalYearId?.length ? "budget-fiscal-year-error" : undefined
                  }
                >
                  {options.fiscalYears.map((fiscalYear) => (
                    <option key={fiscalYear.id} value={fiscalYear.id}>
                      {fiscalYear.label}
                    </option>
                  ))}
                </select>
                <FieldError errors={formState.errors?.fiscalYearId} id="budget-fiscal-year-error" />
              </label>
            </div>
          </section>

          {BUDGET_REQUEST_SOURCE_SECTIONS.map((section) => (
            <BudgetRequestSourceSection
              key={section.id}
              section={section}
              errors={formState.errors}
              onChange={handleValueChange}
              values={values}
            />
          ))}
        </div>

        <BudgetRequestSourceReadiness
          fiscalYearId={fiscalYearId}
          organizationId={organizationId}
          organizationName={
            options.organizations.find((organization) => organization.id === organizationId)
              ?.name ?? ""
          }
          values={values}
        />
      </div>

      <FormActions pending={pending} backHref="/budget-requests" submitLabel="ส่งคำขอ" />
    </form>
  );
}
