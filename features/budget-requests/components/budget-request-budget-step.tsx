import { areaClass, FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import {
  BudgetRequestExpenses,
  type BudgetExpenseFields,
} from "@/features/budget-requests/components/budget-request-expenses";
import { BudgetRequestFormSection } from "@/features/budget-requests/components/budget-request-form-section";
import {
  getProposalFieldErrors,
  type BudgetProposalStepProps,
} from "@/features/budget-requests/components/budget-request-step-types";
import type { BudgetExpenseCategoryId } from "@/features/budget-requests/expense-categories";

interface BudgetRequestBudgetStepProps extends BudgetProposalStepProps {
  amount: string;
  expenseFields: BudgetExpenseFields;
  hasLegacyAmount: boolean;
  onExpenseChange: (category: BudgetExpenseCategoryId, value: string) => void;
}

const currency = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function BudgetRequestBudgetStep({
  amount,
  details,
  errors,
  expenseFields,
  hasLegacyAmount,
  onDetailChange,
  onExpenseChange,
}: BudgetRequestBudgetStepProps) {
  return (
    <div className="space-y-6">
      <BudgetRequestFormSection
        title="ข้อมูลแผนค่าใช้จ่าย"
        description="บันทึกรายละเอียดจากแผนค่าใช้จ่าย แล้วแจกแจงจำนวนเงินตามหมวดด้านล่าง"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label>
            <FieldLabel>ชื่อแผนค่าใช้จ่าย</FieldLabel>
            <input
              className={fieldClass}
              value={details.spendingPlanName}
              onChange={(event) => onDetailChange("spendingPlanName", event.target.value)}
              placeholder="ระบุชื่อแผนค่าใช้จ่าย"
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "spendingPlanName")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "spendingPlanName")} />
          </label>
          <label>
            <FieldLabel>ยอดรวมแผนค่าใช้จ่าย (บาท)</FieldLabel>
            <input
              className={`${fieldClass} bg-stone-50 text-right font-semibold tabular-nums`}
              value={currency.format(Number(amount))}
              readOnly
            />
          </label>
          <label>
            <FieldLabel>หมวดรายจ่ายย่อย</FieldLabel>
            <input
              className={fieldClass}
              value={details.expenseSubcategory}
              onChange={(event) => onDetailChange("expenseSubcategory", event.target.value)}
              placeholder="เช่น ค่าใช้จ่ายอุดหนุน"
              maxLength={300}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "expenseSubcategory")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "expenseSubcategory")} />
          </label>
          <label>
            <FieldLabel>รายละเอียดรายการค่าใช้จ่าย</FieldLabel>
            <textarea
              className={areaClass}
              value={details.expenseDescription}
              onChange={(event) => onDetailChange("expenseDescription", event.target.value)}
              placeholder="อธิบายรายการหรือวัตถุประสงค์ของค่าใช้จ่าย"
              maxLength={5000}
              aria-invalid={Boolean(getProposalFieldErrors(errors, "expenseDescription")?.length)}
            />
            <FieldError errors={getProposalFieldErrors(errors, "expenseDescription")} />
          </label>
        </div>
      </BudgetRequestFormSection>

      <BudgetRequestFormSection
        title="วงเงินตามหมวดค่าใช้จ่าย"
        description="ยอดรวมทุกหมวดจะเป็นวงเงินคำขอและยอดรวมแผนค่าใช้จ่ายโดยอัตโนมัติ"
      >
        <BudgetRequestExpenses
          amount={amount}
          errors={errors}
          expenseFields={expenseFields}
          hasLegacyAmount={hasLegacyAmount}
          onExpenseChange={onExpenseChange}
        />
      </BudgetRequestFormSection>
    </div>
  );
}
