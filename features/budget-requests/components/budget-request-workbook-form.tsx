"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { FieldError, FieldLabel, FormActions, fieldClass } from "@/components/ui/operation-form";
import {
  saveBudgetRequestAction,
  type BudgetRequestState,
} from "@/features/budget-requests/actions";
import { BUDGET_FUND_OPTIONS } from "@/features/budget-requests/proposal-details";
import {
  getBudgetRequestOrganizationSourceCode,
  isBudgetRequestOrganizationName,
} from "@/features/budget-requests/organization-options";
import {
  BUDGET_REQUEST_SOURCE_FIELD_COUNT,
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
import { BudgetRequestExpenseItems } from "@/features/budget-requests/components/budget-request-expense-items";
import { BudgetRequestProjectMembers } from "@/features/budget-requests/components/budget-request-project-members";
import { BudgetRequestSdgSection } from "@/features/budget-requests/components/budget-request-sdg-section";
import {
  createBudgetRequestExpenseItemFromSource,
  createEmptyBudgetRequestExpenseItem,
  getBudgetRequestExpenseItemsTotal,
  toBudgetRequestExpenseItems,
  type BudgetRequestExpenseItemDraft,
} from "@/features/budget-requests/expense-items";
import {
  createEmptyBudgetRequestProjectMember,
  toBudgetRequestProjectMembers,
  type BudgetRequestProjectMemberDraft,
} from "@/features/budget-requests/project-members";
import type { BudgetFormOptions } from "@/features/budget-requests/types";

function inferOrganizationId(
  record: BudgetRequestSourceValues,
  options: BudgetFormOptions["organizations"],
): string | undefined {
  return options.find((option) => option.name.trim() === record.organizationName.trim())?.id;
}

const EXPENSE_DETAIL_COMPLETION_TOTAL = 4;

export function BudgetRequestWorkbookForm({ options }: { options: BudgetFormOptions }) {
  const initialFiscalYear = options.fiscalYears[0];
  const [values, setValues] = useState(createEmptyBudgetRequestSourceValues);
  const [organizationId, setOrganizationId] = useState("");
  const [fiscalYearId, setFiscalYearId] = useState(initialFiscalYear?.id ?? "");
  const [budgetCycleId, setBudgetCycleId] = useState(initialFiscalYear?.budgetCycleId ?? "");
  const nextExpenseItemId = useRef(2);
  const [expenseItems, setExpenseItems] = useState<BudgetRequestExpenseItemDraft[]>(() => [
    createEmptyBudgetRequestExpenseItem(1),
  ]);
  const nextProjectMemberId = useRef(2);
  const [projectMembers, setProjectMembers] = useState<BudgetRequestProjectMemberDraft[]>(() => [
    createEmptyBudgetRequestProjectMember(1),
  ]);
  const [selectedSdgs, setSelectedSdgs] = useState<string[]>([]);
  const [sdgAlignment, setSdgAlignment] = useState("");

  const proposalDetails = {
    ...toBudgetProposalDetails(values),
    alignmentDescription: sdgAlignment,
    expenseItems: toBudgetRequestExpenseItems(expenseItems),
    projectMembers: toBudgetRequestProjectMembers(projectMembers),
    sdgs: selectedSdgs,
  };
  const expenseTotal = getBudgetRequestExpenseItemsTotal(expenseItems);
  const amount = String(expenseTotal);
  const [formState, action, pending] = useActionState(
    saveBudgetRequestAction,
    {} satisfies BudgetRequestState,
  );

  const applyImportedRecord = (record: BudgetRequestSourceValues) => {
    const normalizedRecord = {
      ...record,
      organizationName: isBudgetRequestOrganizationName(record.organizationName)
        ? record.organizationName.trim()
        : "",
    };
    setValues(normalizedRecord);
    setSelectedSdgs([]);
    setSdgAlignment("");
    setProjectMembers([createEmptyBudgetRequestProjectMember(nextProjectMemberId.current)]);
    nextProjectMemberId.current += 1;
    setExpenseItems([
      createBudgetRequestExpenseItemFromSource(
        {
          expenditureBudget: normalizedRecord.expenditureBudget,
          expenseCategory: normalizedRecord.expenseCategory,
          expenseSubcategory: normalizedRecord.expenseSubcategory,
          expenseDescription: normalizedRecord.expenseDescription,
          totalBudget: normalizedRecord.totalBudget,
        },
        nextExpenseItemId.current,
      ),
    ]);
    nextExpenseItemId.current += 1;
    const inferredOrganizationId = inferOrganizationId(normalizedRecord, options.organizations);
    setOrganizationId(inferredOrganizationId ?? "");
  };

  const updateExpenseItem = (id: number, changes: Partial<BudgetRequestExpenseItemDraft>) => {
    setExpenseItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  };

  const updateProjectMember = (id: number, changes: Partial<BudgetRequestProjectMemberDraft>) => {
    setProjectMembers((current) =>
      current.map((member) => (member.id === id ? { ...member, ...changes } : member)),
    );
  };

  const handleValueChange = (key: BudgetRequestSourceKey, value: string) => {
    if (key === "organizationName") {
      const sourceCode = getBudgetRequestOrganizationSourceCode(value);
      setValues((current) => ({
        ...current,
        organizationName: value,
        organizationCode: sourceCode,
      }));
      setOrganizationId(
        options.organizations.find((option) => option.name.trim() === value.trim())?.id ?? "",
      );
      return;
    }
    if (key === "organizationCode") {
      const currentSourceCode = getBudgetRequestOrganizationSourceCode(values.organizationName);
      const organizationName = currentSourceCode === value ? values.organizationName : "";
      setValues((current) => ({ ...current, organizationCode: value, organizationName }));
      setOrganizationId(
        options.organizations.find((option) => option.name.trim() === organizationName)?.id ?? "",
      );
      return;
    }
    setValues((current) => {
      const next = { ...current, [key]: value };
      if (key === "fundCode") {
        next.fundName =
          BUDGET_FUND_OPTIONS.find((option) => option.code === value)?.name ?? current.fundName;
      }
      return next;
    });
  };

  const expenseCompletion = [
    expenseItems.every((item) => Boolean(item.expenditureBudget)),
    expenseItems.every((item) => Boolean(item.expenseCategory)),
    expenseItems.every((item) => Boolean(item.expenseSubcategory)),
    expenseItems.every((item) => Number(item.amount) > 0),
  ].filter(Boolean).length;
  const completion = getBudgetRequestSourceCompletion(values) + expenseCompletion;
  const completionTotal = BUDGET_REQUEST_SOURCE_FIELD_COUNT + EXPENSE_DETAIL_COMPLETION_TOTAL;
  const completionPercent = Math.round((completion / completionTotal) * 100);

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
      <input type="hidden" name="expenseDetailMode" value="items" />

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
              รองรับไฟล์ Executive DataProject แบบ XLSX หรือ CSV และแสดงเฉพาะข้อมูลที่ยังใช้งาน
            </p>
          </div>
          <div className="flex items-center gap-3 border-t border-stone-200 pt-4 lg:border-t-0 lg:pt-0">
            <span className="text-right">
              <b className="block text-lg tabular-nums text-stone-950">
                {completion}/{completionTotal}
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
          {BUDGET_REQUEST_SOURCE_SECTIONS.map((section) => (
            <BudgetRequestSourceSection
              key={section.id}
              section={section}
              errors={formState.errors}
              onChange={handleValueChange}
              values={values}
              footer={
                section.id === "approval" ? (
                  <BudgetRequestProjectMembers
                    errors={formState.errors}
                    members={projectMembers}
                    onAdd={() => {
                      setProjectMembers((current) => [
                        ...current,
                        createEmptyBudgetRequestProjectMember(nextProjectMemberId.current),
                      ]);
                      nextProjectMemberId.current += 1;
                    }}
                    onChange={updateProjectMember}
                    onRemove={(id) =>
                      setProjectMembers((current) => current.filter((member) => member.id !== id))
                    }
                  />
                ) : null
              }
            >
              {section.id === "source" ? (
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
                      formState.errors?.fiscalYearId?.length
                        ? "budget-fiscal-year-error"
                        : undefined
                    }
                  >
                    {options.fiscalYears.map((fiscalYear) => (
                      <option key={fiscalYear.id} value={fiscalYear.id}>
                        {fiscalYear.label}
                      </option>
                    ))}
                  </select>
                  <FieldError
                    errors={formState.errors?.fiscalYearId}
                    id="budget-fiscal-year-error"
                  />
                </label>
              ) : null}
              {section.id === "budget" ? (
                <BudgetRequestExpenseItems
                  errors={formState.errors}
                  items={expenseItems}
                  onAdd={() => {
                    setExpenseItems((current) => [
                      ...current,
                      createEmptyBudgetRequestExpenseItem(nextExpenseItemId.current),
                    ]);
                    nextExpenseItemId.current += 1;
                  }}
                  onChange={updateExpenseItem}
                  onRemove={(id) =>
                    setExpenseItems((current) => current.filter((item) => item.id !== id))
                  }
                />
              ) : null}
              {section.id === "sdgs" ? (
                <BudgetRequestSdgSection
                  alignmentDescription={sdgAlignment}
                  errors={formState.errors}
                  onAlignmentChange={setSdgAlignment}
                  onSelectionChange={setSelectedSdgs}
                  selected={selectedSdgs}
                />
              ) : null}
            </BudgetRequestSourceSection>
          ))}
        </div>

        <BudgetRequestSourceReadiness
          amount={expenseTotal}
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
