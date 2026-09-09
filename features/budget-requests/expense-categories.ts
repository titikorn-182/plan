export const BUDGET_EXPENSE_GROUPS = [
  {
    id: "operating",
    label: "งบดำเนินงาน",
    categories: [
      { id: "operating_compensation", label: "หมวดค่าตอบแทน" },
      { id: "operating_services", label: "หมวดค่าใช้สอย" },
      { id: "operating_materials", label: "หมวดค่าวัสดุ" },
    ],
  },
  {
    id: "capital",
    label: "งบลงทุน",
    categories: [
      { id: "capital_equipment", label: "หมวดครุภัณฑ์" },
      { id: "capital_construction", label: "หมวดค่าสิ่งก่อสร้าง" },
    ],
  },
  {
    id: "personnel",
    label: "งบบุคลากร",
    categories: [
      { id: "personnel_compensation", label: "หมวดค่าตอบแทน" },
      { id: "personnel_salary", label: "เงินเดือน/ค่าจ้าง" },
    ],
  },
] as const;

export type BudgetExpenseCategoryId =
  (typeof BUDGET_EXPENSE_GROUPS)[number]["categories"][number]["id"];
export type BudgetExpenseBreakdown = Record<BudgetExpenseCategoryId, number>;

export const MAX_BUDGET_REQUEST_AMOUNT = 999_999_999_999;

const categoryIds = BUDGET_EXPENSE_GROUPS.flatMap((group) =>
  group.categories.map((category) => category.id),
);

export function createEmptyBudgetExpenseBreakdown(): BudgetExpenseBreakdown {
  return Object.fromEntries(categoryIds.map((id) => [id, 0])) as BudgetExpenseBreakdown;
}

export function getBudgetExpenseTotal(breakdown: BudgetExpenseBreakdown): number {
  // Sum integer satang so values such as 0.10 + 0.20 remain exactly 0.30 baht.
  return categoryIds.reduce((total, id) => total + Math.round(breakdown[id] * 100), 0) / 100;
}

type BudgetExpenseParseResult =
  | { success: true; data: BudgetExpenseBreakdown | null }
  | { success: false; errors: Record<string, string[]> };

export function parseBudgetExpenseBreakdown(input: unknown): BudgetExpenseParseResult {
  let value = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {
        success: false,
        errors: { expenseBreakdown: ["ข้อมูลหมวดค่าใช้จ่ายไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"] },
      };
    }
  }
  // Existing requests and older clients can retain their total without a breakdown.
  if (value === null || value === undefined) return { success: true, data: null };
  if (
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== categoryIds.length ||
    !categoryIds.every((id) => Object.hasOwn(value, id))
  ) {
    return {
      success: false,
      errors: { expenseBreakdown: ["กรุณาระบุข้อมูลให้ครบทั้ง 7 หมวดค่าใช้จ่ายที่กำหนด"] },
    };
  }

  const breakdown = createEmptyBudgetExpenseBreakdown();
  const errors: Record<string, string[]> = {};
  const entries = value as Record<string, unknown>;
  for (const id of categoryIds) {
    const raw = entries[id];
    const text = typeof raw === "string" ? raw.trim() : String(raw);
    const amount = text === "" ? 0 : Number(text);
    if (
      (typeof raw !== "string" && typeof raw !== "number") ||
      (text !== "" && !/^\d+(?:\.\d{1,2})?$/.test(text)) ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > MAX_BUDGET_REQUEST_AMOUNT
    ) {
      errors[`expenseBreakdown.${id}`] = [
        "กรุณาระบุจำนวนเงินตั้งแต่ 0 ถึง 999,999,999,999 บาท และทศนิยมไม่เกิน 2 ตำแหน่ง",
      ];
    } else {
      breakdown[id] = amount;
    }
  }
  if (Object.keys(errors).length > 0) return { success: false, errors };
  if (getBudgetExpenseTotal(breakdown) > MAX_BUDGET_REQUEST_AMOUNT) {
    return {
      success: false,
      errors: { expenseBreakdown: ["วงเงินคำขอรวมต้องไม่เกิน 999,999,999,999 บาท"] },
    };
  }
  return { success: true, data: breakdown };
}
