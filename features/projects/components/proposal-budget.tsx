"use client";

import { Plus, Trash2 } from "lucide-react";
import { FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import { RegisterSection } from "@/components/ui/module-primitives";
import {
  calculateProjectExpenseAmount,
  createEmptyProjectExpenseItem,
  EXPENSE_CATEGORIES,
  type ProjectProposalDetails,
} from "@/features/projects/proposal-details";
import {
  applyProjectPlanStructureSelection,
  getProjectPlanStructureOptions,
  type ProjectPlanStructureLevel,
  type ProjectPlanStructureValue,
} from "@/features/projects/plan-structure";
import type { ProjectProposalSectionProps as Props } from "./project-proposal-section-types";
import { removeAt, replaceAt } from "./project-proposal-section-utils";
import { ProjectPlanStructureSelect as PlanStructureSelect } from "./project-plan-structure-select";

export function ProposalBudget({
  details,
  setDetails,
  errors,
  disabled,
  target,
  setTarget,
}: Props & { target: string; setTarget: (value: string) => void }) {
  const total =
    details.expenseItems.reduce(
      (sum, item) => sum + Math.round(calculateProjectExpenseAmount(item) * 100),
      0,
    ) / 100;
  const updateExpenseItem = (
    index: number,
    values: Partial<ProjectProposalDetails["expenseItems"][number]>,
  ) => {
    const next = { ...details.expenseItems[index], ...values };
    setDetails({
      ...details,
      expenseItems: replaceAt(details.expenseItems, index, {
        ...next,
        amount: calculateProjectExpenseAmount(next),
      }),
    });
  };
  const outputOptions = getProjectPlanStructureOptions(details, "output");
  const operationalPlanOptions = getProjectPlanStructureOptions(details, "operationalPlan");
  const activityOptions = getProjectPlanStructureOptions(details, "activity");
  const updatePlanStructure = (
    level: ProjectPlanStructureLevel,
    valueType: ProjectPlanStructureValue,
    value: string,
  ) => setDetails(applyProjectPlanStructureSelection(details, level, valueType, value));
  return (
    <RegisterSection
      title="รายละเอียดงบประมาณ"
      aside={
        <b className="text-sm tabular-nums text-[#b83b0b]">
          รวม {total.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท
        </b>
      }
    >
      <fieldset className="space-y-4 p-5 sm:p-6" disabled={disabled}>
        <section className="border-b border-stone-200 pb-5" aria-labelledby="project-plan-title">
          <div>
            <h3 id="project-plan-title" className="text-sm font-bold text-stone-950">
              โครงสร้างแผนและกิจกรรม
            </h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-stone-600">
              เชื่อมรหัสและชื่อจากระดับผลผลิตลงมาถึงกิจกรรม ระบบจะจำกัดรายการตามสายแผนที่เลือก
              และเติมข้อมูลระดับบนให้สอดคล้องกันอัตโนมัติ
            </p>
          </div>
          <div className="mt-4 grid gap-x-5 gap-y-4 md:grid-cols-2">
            <PlanStructureSelect
              label="รหัสผลผลิต/โครงการ = งาน/โครงการ (4 หลัก)"
              level="output"
              valueType="code"
              value={details.outputCode}
              options={outputOptions}
              disabled={disabled}
              errors={errors?.["proposalDetails.outputCode"]}
              onChange={(value) => updatePlanStructure("output", "code", value)}
            />
            <PlanStructureSelect
              label="ชื่อผลผลิต = งาน/โครงการ (4 หลัก)"
              level="output"
              valueType="name"
              value={details.outputName}
              options={outputOptions}
              disabled={disabled}
              errors={errors?.["proposalDetails.outputName"]}
              onChange={(value) => updatePlanStructure("output", "name", value)}
            />
            <PlanStructureSelect
              label="รหัสแผนปฏิบัติการ = โครงการย่อย (8 หลัก)"
              level="operationalPlan"
              valueType="code"
              value={details.operationalPlanCode}
              options={operationalPlanOptions}
              disabled={disabled}
              errors={errors?.["proposalDetails.operationalPlanCode"]}
              onChange={(value) => updatePlanStructure("operationalPlan", "code", value)}
            />
            <PlanStructureSelect
              label="ชื่อแผนปฏิบัติการ = โครงการย่อย (8 หลัก)"
              level="operationalPlan"
              valueType="name"
              value={details.operationalPlanName}
              options={operationalPlanOptions}
              disabled={disabled}
              errors={errors?.["proposalDetails.operationalPlanName"]}
              onChange={(value) => updatePlanStructure("operationalPlan", "name", value)}
            />
            <PlanStructureSelect
              label="รหัสโครงการ/กิจกรรม = กิจกรรม (12 หลัก)"
              level="activity"
              valueType="code"
              value={details.activityCode}
              options={activityOptions}
              disabled={disabled}
              errors={errors?.["proposalDetails.activityCode"]}
              onChange={(value) => updatePlanStructure("activity", "code", value)}
            />
            <PlanStructureSelect
              label="ชื่อโครงการกิจกรรม = กิจกรรม/โครงการ (12 หลัก)"
              level="activity"
              valueType="name"
              value={details.projectActivityName}
              options={activityOptions}
              disabled={disabled}
              errors={errors?.["proposalDetails.projectActivityName"]}
              onChange={(value) => updatePlanStructure("activity", "name", value)}
            />
          </div>
        </section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="max-w-2xl text-xs leading-5 text-stone-600">
            ระบุอัตรา หน่วย จำนวน และจำนวนครั้งของแต่ละรายการ ระบบจะคำนวณจำนวนเงินรวมและ
            วงเงินอนุมัติให้อัตโนมัติ
          </p>
          <button
            className="inline-flex min-h-10 items-center gap-2 border border-orange-300 px-4 text-sm font-bold text-orange-800 hover:bg-orange-50"
            type="button"
            onClick={() =>
              setDetails({
                ...details,
                expenseItems: [...details.expenseItems, createEmptyProjectExpenseItem()],
              })
            }
          >
            <Plus size={16} /> เพิ่มรายการ
          </button>
        </div>
        <FieldError errors={errors?.["proposalDetails.expenseItems"]} />
        <div
          className="hidden gap-3 border border-stone-200 bg-stone-100 px-3 py-2 text-xs font-bold text-stone-700 xl:grid xl:grid-cols-[minmax(260px,1fr)_120px_90px_90px_90px_150px_44px]"
          aria-hidden="true"
        >
          <span>รายการค่าใช้จ่าย</span>
          <span className="text-right">อัตรา</span>
          <span className="text-right">หน่วย</span>
          <span className="text-right">จำนวน</span>
          <span className="text-right">ครั้ง</span>
          <span className="text-right">จำนวนเงินรวม</span>
          <span />
        </div>
        <div className="space-y-3">
          {details.expenseItems.map((item, index) => (
            <div
              className="grid gap-3 border border-stone-200 bg-stone-50 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_120px_90px_90px_90px_150px_44px] xl:items-start"
              key={index}
            >
              <div className="sm:col-span-2 xl:col-span-1">
                <span className="text-xs font-semibold text-stone-700 xl:sr-only">
                  รายการค่าใช้จ่าย
                </span>
                <select
                  className={fieldClass}
                  value={item.category}
                  onChange={(e) =>
                    updateExpenseItem(index, {
                      category: e.target.value as (typeof EXPENSE_CATEGORIES)[number],
                    })
                  }
                  aria-label={`หมวดค่าใช้จ่ายรายการที่ ${index + 1}`}
                >
                  {EXPENSE_CATEGORIES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                <input
                  className={fieldClass}
                  value={item.description}
                  onChange={(e) => updateExpenseItem(index, { description: e.target.value })}
                  placeholder="รายละเอียดรายการค่าใช้จ่าย"
                  aria-label={`รายละเอียดรายการค่าใช้จ่ายที่ ${index + 1}`}
                  aria-invalid={Boolean(
                    errors?.[`proposalDetails.expenseItems.${index}.description`]?.length,
                  )}
                  aria-describedby={`project-expense-${index}-description-error`}
                />
                <FieldError
                  errors={errors?.[`proposalDetails.expenseItems.${index}.description`]}
                  id={`project-expense-${index}-description-error`}
                />
              </div>
              <label>
                <span className="text-xs font-semibold text-stone-700 xl:sr-only">อัตรา</span>
                <input
                  className={`${fieldClass} text-right tabular-nums`}
                  type="number"
                  min="0"
                  max="999999999999"
                  step="0.01"
                  value={item.rate || ""}
                  onChange={(e) => updateExpenseItem(index, { rate: Number(e.target.value) })}
                  placeholder="0.00"
                  aria-invalid={Boolean(
                    errors?.[`proposalDetails.expenseItems.${index}.rate`]?.length,
                  )}
                  aria-describedby={`project-expense-${index}-rate-error`}
                />
                <FieldError
                  errors={errors?.[`proposalDetails.expenseItems.${index}.rate`]}
                  id={`project-expense-${index}-rate-error`}
                />
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-700 xl:sr-only">หน่วย</span>
                <input
                  className={`${fieldClass} text-right tabular-nums`}
                  type="number"
                  min="0"
                  max="999999"
                  step="1"
                  value={item.units || ""}
                  onChange={(e) => updateExpenseItem(index, { units: Number(e.target.value) })}
                  placeholder="0"
                  aria-invalid={Boolean(
                    errors?.[`proposalDetails.expenseItems.${index}.units`]?.length,
                  )}
                  aria-describedby={`project-expense-${index}-units-error`}
                />
                <FieldError
                  errors={errors?.[`proposalDetails.expenseItems.${index}.units`]}
                  id={`project-expense-${index}-units-error`}
                />
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-700 xl:sr-only">จำนวน</span>
                <input
                  className={`${fieldClass} text-right tabular-nums`}
                  type="number"
                  min="0"
                  max="999999"
                  step="1"
                  value={item.quantity || ""}
                  onChange={(e) => updateExpenseItem(index, { quantity: Number(e.target.value) })}
                  placeholder="0"
                  aria-invalid={Boolean(
                    errors?.[`proposalDetails.expenseItems.${index}.quantity`]?.length,
                  )}
                  aria-describedby={`project-expense-${index}-quantity-error`}
                />
                <FieldError
                  errors={errors?.[`proposalDetails.expenseItems.${index}.quantity`]}
                  id={`project-expense-${index}-quantity-error`}
                />
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-700 xl:sr-only">ครั้ง</span>
                <input
                  className={`${fieldClass} text-right tabular-nums`}
                  type="number"
                  min="0"
                  max="999999"
                  step="1"
                  value={item.occurrences || ""}
                  onChange={(e) =>
                    updateExpenseItem(index, { occurrences: Number(e.target.value) })
                  }
                  placeholder="0"
                  aria-invalid={Boolean(
                    errors?.[`proposalDetails.expenseItems.${index}.occurrences`]?.length,
                  )}
                  aria-describedby={`project-expense-${index}-occurrences-error`}
                />
                <FieldError
                  errors={errors?.[`proposalDetails.expenseItems.${index}.occurrences`]}
                  id={`project-expense-${index}-occurrences-error`}
                />
              </label>
              <label>
                <span className="text-xs font-semibold text-stone-700 xl:sr-only">
                  จำนวนเงินรวม
                </span>
                <output
                  className="mt-1.5 flex h-11 w-full items-center justify-end border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-900 tabular-nums"
                  aria-label={`จำนวนเงินรวมรายการที่ ${index + 1}`}
                  aria-describedby={`project-expense-${index}-amount-error`}
                >
                  {calculateProjectExpenseAmount(item).toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </output>
                <FieldError
                  errors={errors?.[`proposalDetails.expenseItems.${index}.amount`]}
                  id={`project-expense-${index}-amount-error`}
                />
              </label>
              <button
                className="mt-1.5 h-11 border border-stone-300 bg-white hover:border-red-300 hover:text-red-700 sm:self-end xl:self-start"
                type="button"
                onClick={() =>
                  setDetails({ ...details, expenseItems: removeAt(details.expenseItems, index) })
                }
                aria-label={`ลบรายการค่าใช้จ่ายที่ ${index + 1}`}
                title="ลบรายการ"
              >
                <Trash2 className="mx-auto" size={16} />
              </button>
            </div>
          ))}
        </div>
        <label className="block max-w-sm border-t border-stone-200 pt-4">
          <FieldLabel required>เป้าหมายเบิกจ่าย (%)</FieldLabel>
          <input
            className={`${fieldClass} text-right tabular-nums`}
            name="disbursementTarget"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            required
          />
        </label>
      </fieldset>
    </RegisterSection>
  );
}
