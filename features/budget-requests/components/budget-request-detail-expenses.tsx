import { BUDGET_EXPENSE_GROUPS } from "@/features/budget-requests/expense-categories";
import type { BudgetRequestDetail } from "@/features/budget-requests/detail-types";
import { formatThaiMoney, formatThaiNumber } from "@/features/shared/formatters";

export function BudgetRequestDetailExpenses({ record }: { record: BudgetRequestDetail }) {
  const { proposalDetails: details, expenseBreakdown, expenseLines } = record;
  return (
    <div className="space-y-5">
      <p className="flex flex-wrap items-baseline justify-between gap-3 border-b border-stone-200 pb-4">
        <span className="font-semibold">วงเงินคำขอรวมทั้งหมด</span>
        <strong className="text-xl tabular-nums">{formatThaiMoney(record.amount)} บาท</strong>
      </p>
      {details.expenseItems.length > 0 ? (
        <ol className="divide-y divide-stone-200">
          {details.expenseItems.map((item, index) => (
            <li className="min-w-0 space-y-3 py-5 first:pt-0 last:pb-0" key={index}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h3 className="font-bold">รายการค่าใช้จ่ายที่ {index + 1}</h3>
                <span className="font-semibold tabular-nums">
                  {formatThaiMoney(item.amount)} บาท
                </span>
              </div>
              <p className="max-w-prose whitespace-pre-line [overflow-wrap:anywhere]">
                {item.description || "ไม่ได้ระบุรายละเอียดรายการ"}
              </p>
              <dl className="grid gap-3 text-sm text-stone-700 sm:grid-cols-3">
                {[
                  ["งบรายจ่าย", item.expenditureBudget],
                  ["หมวดรายจ่าย", item.expenseCategory],
                  ["หมวดรายจ่ายย่อย", item.expenseSubcategory],
                  ["ชื่อกิจกรรมย่อย", item.subActivityName],
                  ["แหล่งงบประมาณ", item.fundingSource],
                  ["แหล่งงบประมาณย่อย", item.fundingSourceDetail],
                  ["รหัสกองทุน", item.fundCode],
                  ["กองทุน", item.fundName],
                ].map(([label, value]) =>
                  value ? (
                    <div className="min-w-0" key={label}>
                      <dt className="text-stone-600">{label}</dt>
                      <dd className="mt-1 whitespace-pre-line [overflow-wrap:anywhere]">{value}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            </li>
          ))}
        </ol>
      ) : expenseBreakdown ? (
        <dl className="divide-y divide-stone-200">
          {BUDGET_EXPENSE_GROUPS.flatMap((group) =>
            group.categories.map((category) => (
              <div className="flex flex-wrap justify-between gap-3 py-3" key={category.id}>
                <dt>
                  {group.label} / {category.label}
                </dt>
                <dd className="tabular-nums">
                  {formatThaiMoney(expenseBreakdown[category.id])} บาท
                </dd>
              </div>
            )),
          )}
        </dl>
      ) : expenseLines.length > 0 ? (
        <ol className="divide-y divide-stone-200">
          {expenseLines.map((line) => (
            <li className="space-y-2 py-4 first:pt-0" key={line.id}>
              <div className="flex flex-wrap justify-between gap-3">
                <b className="[overflow-wrap:anywhere]">{line.category}</b>
                <span className="font-semibold tabular-nums">
                  {formatThaiMoney(line.total)} บาท
                </span>
              </div>
              <p className="max-w-prose whitespace-pre-line [overflow-wrap:anywhere]">
                {line.description || "ไม่ได้ระบุรายละเอียดรายการ"}
              </p>
              <p className="text-sm text-stone-600">
                จำนวน {formatThaiNumber(line.quantity)} × อัตรา {formatThaiMoney(line.unitPrice)}{" "}
                บาท
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-stone-600">
          คำขอนี้บันทึกวงเงินรวมไว้ โดยไม่มีรายการค่าใช้จ่ายแยกบรรทัด
        </p>
      )}
      {details.expenseItems.length === 0 &&
      (details.expenseDescription ||
        details.expenditureBudget ||
        details.expenseCategory ||
        details.expenseSubcategory) ? (
        <div className="space-y-2 border-t border-stone-200 pt-4">
          <h3 className="font-semibold">รายละเอียดค่าใช้จ่ายที่บันทึกไว้</h3>
          <p className="text-sm text-stone-700 [overflow-wrap:anywhere]">
            {[details.expenditureBudget, details.expenseCategory, details.expenseSubcategory]
              .filter(Boolean)
              .join(" / ")}
          </p>
          <p className="max-w-prose whitespace-pre-line [overflow-wrap:anywhere]">
            {details.expenseDescription || "ไม่ได้ระบุ"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
