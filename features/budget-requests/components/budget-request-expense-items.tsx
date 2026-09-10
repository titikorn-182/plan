import { Plus, Trash2 } from "lucide-react";
import { FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import type { BudgetRequestState } from "@/features/budget-requests/actions";
import { BUDGET_REQUEST_EXPENDITURE_BUDGET_OPTIONS } from "@/features/budget-requests/expense-source-options";
import {
  MAX_BUDGET_REQUEST_EXPENSE_ITEMS,
  getBudgetRequestExpenseItemsTotal,
  getExpenseCategoryOptions,
  getExpenseSubcategoryOptions,
  type BudgetRequestExpenseItemDraft,
} from "@/features/budget-requests/expense-items";

const currency = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function BudgetRequestExpenseItems({
  errors,
  items,
  onAdd,
  onChange,
  onRemove,
}: {
  errors: BudgetRequestState["errors"];
  items: readonly BudgetRequestExpenseItemDraft[];
  onAdd: () => void;
  onChange: (id: number, changes: Partial<BudgetRequestExpenseItemDraft>) => void;
  onRemove: (id: number) => void;
}) {
  const total = getBudgetRequestExpenseItemsTotal(items);

  return (
    <div className="md:col-span-2">
      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-end">
        <div>
          <h3 className="text-sm font-bold text-stone-950">รายการค่าใช้จ่าย</h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-stone-600">
            เพิ่มได้หลายรายการ ตัวเลือกหมวดรายจ่ายและหมวดย่อยจะเปลี่ยนตามงบรายจ่ายที่เลือก
          </p>
        </div>
        <div className="min-w-44 bg-[#fff3ea] px-4 py-3 text-right">
          <span className="block text-xs text-orange-900">งบประมาณรวมทั้งหมด</span>
          <strong className="mt-0.5 block text-lg tabular-nums text-stone-950">
            {currency.format(total)} บาท
          </strong>
        </div>
      </div>

      <FieldError errors={errors?.amount} id="budget-expense-total-error" />
      <FieldError errors={errors?.["proposalDetails.expenseItems"]} id="expense-items-error" />

      <div className="space-y-4">
        {items.map((item, index) => {
          const categories = getExpenseCategoryOptions(item.expenditureBudget);
          const subcategories = getExpenseSubcategoryOptions(
            item.expenditureBudget,
            item.expenseCategory,
          );
          const prefix = `proposalDetails.expenseItems.${index}`;
          return (
            <fieldset className="border border-stone-200 bg-stone-50/60 p-4 sm:p-5" key={item.id}>
              <legend className="px-2 text-xs font-bold text-stone-700">
                รายการที่ {index + 1}
              </legend>
              <div className="grid gap-4 lg:grid-cols-12">
                <label className="lg:col-span-4">
                  <FieldLabel required>งบรายจ่าย</FieldLabel>
                  <select
                    className={fieldClass}
                    value={item.expenditureBudget}
                    onChange={(event) =>
                      onChange(item.id, {
                        expenditureBudget: event.target.value,
                        expenseCategory: "",
                        expenseSubcategory: "",
                      })
                    }
                    required
                  >
                    <option value="">เลือกงบรายจ่าย</option>
                    {BUDGET_REQUEST_EXPENDITURE_BUDGET_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lg:col-span-4">
                  <FieldLabel required>หมวดรายจ่าย</FieldLabel>
                  <select
                    className={fieldClass}
                    value={item.expenseCategory}
                    onChange={(event) =>
                      onChange(item.id, {
                        expenseCategory: event.target.value,
                        expenseSubcategory: "",
                      })
                    }
                    disabled={!item.expenditureBudget}
                    required
                  >
                    <option value="">
                      {item.expenditureBudget ? "เลือกหมวดรายจ่าย" : "เลือกงบรายจ่ายก่อน"}
                    </option>
                    {categories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lg:col-span-4">
                  <FieldLabel required>หมวดรายจ่ายย่อย</FieldLabel>
                  <select
                    className={fieldClass}
                    value={item.expenseSubcategory}
                    onChange={(event) =>
                      onChange(item.id, { expenseSubcategory: event.target.value })
                    }
                    disabled={!item.expenseCategory}
                    required
                  >
                    <option value="">
                      {item.expenseCategory ? "เลือกหมวดรายจ่ายย่อย" : "เลือกหมวดรายจ่ายก่อน"}
                    </option>
                    {subcategories.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="lg:col-span-4">
                  <FieldLabel>ชื่อกิจกรรมย่อย</FieldLabel>
                  <input
                    className={fieldClass}
                    value={item.subActivityName ?? ""}
                    onChange={(event) => onChange(item.id, { subActivityName: event.target.value })}
                    maxLength={300}
                    placeholder="ชื่อกิจกรรมย่อยของรายการนี้"
                    aria-invalid={Boolean(errors?.[`${prefix}.subActivityName`]?.length)}
                  />
                  <FieldError errors={errors?.[`${prefix}.subActivityName`]} />
                </label>
                <label className="lg:col-span-4">
                  <FieldLabel>รายละเอียดรายการค่าใช้จ่าย</FieldLabel>
                  <input
                    className={fieldClass}
                    value={item.description}
                    onChange={(event) => onChange(item.id, { description: event.target.value })}
                    maxLength={5_000}
                    placeholder="เช่น ค่าจ้างเหมาจัดทำเอกสารประกอบกิจกรรม"
                  />
                </label>
                <label className="lg:col-span-3">
                  <FieldLabel required>จำนวนเงิน (บาท)</FieldLabel>
                  <input
                    className={`${fieldClass} text-right font-semibold tabular-nums`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="999999999999"
                    step="0.01"
                    value={item.amount}
                    onChange={(event) => onChange(item.id, { amount: event.target.value })}
                    placeholder="0.00"
                    required
                    aria-invalid={Boolean(errors?.[`${prefix}.amount`]?.length)}
                  />
                  <FieldError errors={errors?.[`${prefix}.amount`]} />
                </label>
                <div className="flex items-end justify-end lg:col-span-1">
                  <button
                    className="inline-flex h-11 w-11 items-center justify-center border border-stone-300 bg-white text-stone-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                    type="button"
                    onClick={() => onRemove(item.id)}
                    disabled={items.length === 1}
                    aria-label={`ลบรายการค่าใช้จ่ายที่ ${index + 1}`}
                    title={items.length === 1 ? "ต้องมีอย่างน้อย 1 รายการ" : "ลบรายการ"}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <FieldError errors={errors?.[prefix]} />
            </fieldset>
          );
        })}
      </div>

      <button
        className="mt-4 inline-flex items-center gap-2 border border-orange-300 bg-white px-4 py-2.5 text-sm font-bold text-orange-800 hover:border-[#ee4f16] hover:bg-[#fff3ea] disabled:cursor-not-allowed disabled:border-stone-200 disabled:text-stone-400"
        type="button"
        onClick={onAdd}
        disabled={items.length >= MAX_BUDGET_REQUEST_EXPENSE_ITEMS}
      >
        <Plus size={17} /> เพิ่มรายการค่าใช้จ่าย
      </button>
    </div>
  );
}
