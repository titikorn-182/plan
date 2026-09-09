import { FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import type { BudgetRequestState } from "@/features/budget-requests/actions";
import {
  BUDGET_EXPENSE_GROUPS,
  type BudgetExpenseCategoryId,
} from "@/features/budget-requests/expense-categories";

export type BudgetExpenseFields = Record<BudgetExpenseCategoryId, string>;

const currency = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface BudgetRequestExpensesProps {
  amount: string;
  errors: BudgetRequestState["errors"];
  expenseFields: BudgetExpenseFields;
  hasLegacyAmount: boolean;
  onExpenseChange: (category: BudgetExpenseCategoryId, value: string) => void;
}

export function BudgetRequestExpenses({
  amount,
  errors,
  expenseFields,
  hasLegacyAmount,
  onExpenseChange,
}: BudgetRequestExpensesProps) {
  return (
    <div className="space-y-6">
      <div className="border-b border-stone-200 pb-5">
        <label className="block max-w-md">
          <FieldLabel>วงเงินคำขอรวม (บาท)</FieldLabel>
          <input
            className={`${fieldClass} bg-stone-50 text-right font-semibold tabular-nums`}
            type="text"
            value={currency.format(Number(amount))}
            readOnly
            aria-describedby="budget-expense-help budget-amount-error"
            aria-invalid={Boolean(errors?.amount?.length)}
          />
        </label>
        <FieldError errors={errors?.amount} id="budget-amount-error" />
        <p id="budget-expense-help" className="mt-2 text-xs leading-5 text-stone-600">
          {hasLegacyAmount
            ? "คำขอเดิมยังไม่ได้แยกหมวดค่าใช้จ่าย เมื่อกรอกจำนวนเงินด้านล่าง ระบบจะคำนวณวงเงินรวมใหม่จากทุกหมวด"
            : "กรอกจำนวนเงินตามหมวดค่าใช้จ่าย ระบบจะรวมวงเงินคำขอให้อัตโนมัติ หมวดที่ไม่ใช้เว้นว่างหรือระบุ 0"}
        </p>
        <FieldError errors={errors?.expenseBreakdown} id="budget-expense-error" />
      </div>

      {BUDGET_EXPENSE_GROUPS.map((group) => {
        const subtotal =
          group.categories.reduce((sum, category) => {
            const value = Number(expenseFields[category.id]);
            return sum + (Number.isFinite(value) ? Math.round(value * 100) : 0);
          }, 0) / 100;
        const categoryGridClass =
          group.categories.length === 4
            ? "grid gap-4 md:grid-cols-2"
            : "grid gap-4 md:grid-cols-2 2xl:grid-cols-3";

        return (
          <fieldset
            className="min-w-0 border-b border-stone-200 pb-5 last:border-b-0 last:pb-0"
            key={group.id}
          >
            <legend className="mb-3 flex w-full flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-bold text-stone-900">{group.label}</span>
              <span className="text-xs text-stone-600">
                รวม <span className="font-semibold tabular-nums">{currency.format(subtotal)}</span>{" "}
                บาท
              </span>
            </legend>
            <div className={categoryGridClass}>
              {group.categories.map((category) => {
                const fieldErrors = errors?.[`expenseBreakdown.${category.id}`];
                const errorId = `budget-expense-${category.id}-error`;

                return (
                  <label className="block min-w-0" key={category.id}>
                    <FieldLabel>{category.label} (บาท)</FieldLabel>
                    <input
                      className={`${fieldClass} text-right tabular-nums`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="999999999999"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseFields[category.id]}
                      onChange={(event) => onExpenseChange(category.id, event.target.value)}
                      aria-invalid={Boolean(fieldErrors?.length)}
                      aria-describedby={fieldErrors?.length ? errorId : undefined}
                    />
                    <FieldError errors={fieldErrors} id={errorId} />
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
