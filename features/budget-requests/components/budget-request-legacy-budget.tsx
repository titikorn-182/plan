import {
  BUDGET_EXPENSE_GROUPS,
  type BudgetExpenseBreakdown,
} from "@/features/budget-requests/expense-categories";
import { formatThaiMoney } from "@/features/shared/formatters";

export function BudgetRequestLegacyBudget({
  amount,
  breakdown,
  onConvert,
}: {
  amount: number;
  breakdown: BudgetExpenseBreakdown | null;
  onConvert: () => void;
}) {
  return (
    <div className="space-y-4 md:col-span-2">
      <div className="border border-stone-200 bg-stone-50 p-4">
        <h3 className="text-sm font-bold text-stone-950">งบประมาณที่บันทึกไว้เดิม</h3>
        <p className="mt-2 text-xs leading-5 text-stone-600">
          คำขอนี้ยังไม่มีรายละเอียดค่าใช้จ่ายแบบรายรายการ
          ระบบจะคงยอดเงินและหมวดค่าใช้จ่ายเดิมเมื่อบันทึก หากต้องการแจกแจงใหม่
          ให้เลือกเปลี่ยนเป็นรายการค่าใช้จ่าย
        </p>
        <p className="mt-3 text-sm font-semibold tabular-nums text-stone-950">
          งบประมาณรวมทั้งหมด {formatThaiMoney(amount)} บาท
        </p>
        {breakdown ? (
          <dl className="mt-3 divide-y divide-stone-200 text-xs">
            {BUDGET_EXPENSE_GROUPS.flatMap((group) =>
              group.categories
                .filter((category) => breakdown[category.id] > 0)
                .map((category) => (
                  <div className="flex justify-between gap-4 py-2" key={category.id}>
                    <dt>
                      {group.label} — {category.label}
                    </dt>
                    <dd className="shrink-0 tabular-nums">
                      {formatThaiMoney(breakdown[category.id])} บาท
                    </dd>
                  </div>
                )),
            )}
          </dl>
        ) : null}
      </div>
      <div>
        <button
          className="border border-orange-300 bg-white px-4 py-2.5 text-sm font-bold text-orange-800 hover:bg-[#fff3ea]"
          type="button"
          onClick={onConvert}
          aria-describedby="legacy-budget-conversion-help"
        >
          เปลี่ยนเป็นรายการค่าใช้จ่าย
        </button>
        <p className="mt-2 text-xs leading-5 text-stone-600" id="legacy-budget-conversion-help">
          ระบบจะเตรียมยอดเดิมให้ตรวจสอบและเลือกหมวดรายจ่ายใหม่
          โดยใช้รายละเอียดชุดใหม่แทนสรุปหมวดเดิมเมื่อกดบันทึก
        </p>
      </div>
    </div>
  );
}
