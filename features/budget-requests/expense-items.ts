import {
  getExpenseCategoryOptions as getMasterExpenseCategoryOptions,
  getExpenseSubcategoryOptions as getMasterExpenseSubcategoryOptions,
  isBudgetExpenseOption,
  type BudgetExpenseOption,
} from "@/features/shared/master-data";
import { COLLECTION_LIMITS, INPUT_LIMITS, MONEY_LIMITS } from "@/lib/config/limits";

export const MAX_BUDGET_REQUEST_EXPENSE_ITEMS = COLLECTION_LIMITS.budgetRequestExpenseItems;

export type BudgetRequestExpenseItem = {
  expenditureBudget: string;
  expenseCategory: string;
  expenseSubcategory: string;
  subActivityName?: string;
  fundingSource?: string;
  fundingSourceDetail?: string;
  fundCode?: string;
  fundName?: string;
  description: string;
  amount: number;
};

export type BudgetRequestExpenseItemDraft = Omit<BudgetRequestExpenseItem, "amount"> & {
  id: number;
  amount: string;
};

type ExpenseItemsParseResult =
  | { success: true; data: BudgetRequestExpenseItem[] }
  | { success: false; errors: Record<string, string[]> };

export function getExpenseCategoryOptions(
  options: readonly BudgetExpenseOption[],
  expenditureBudget: string,
): string[] {
  return getMasterExpenseCategoryOptions(options, expenditureBudget);
}

export function getExpenseSubcategoryOptions(
  options: readonly BudgetExpenseOption[],
  expenditureBudget: string,
  expenseCategory: string,
): string[] {
  return getMasterExpenseSubcategoryOptions(options, expenditureBudget, expenseCategory);
}

export function isBudgetRequestExpenseCombination(
  options: readonly BudgetExpenseOption[],
  item: Pick<
    BudgetRequestExpenseItem,
    "expenditureBudget" | "expenseCategory" | "expenseSubcategory"
  >,
): boolean {
  return isBudgetExpenseOption(options, item);
}

export function createEmptyBudgetRequestExpenseItem(id: number): BudgetRequestExpenseItemDraft {
  return {
    id,
    expenditureBudget: "",
    expenseCategory: "",
    expenseSubcategory: "",
    subActivityName: "",
    description: "",
    amount: "",
  };
}

export function createBudgetRequestExpenseItemFromSource(
  source: Pick<
    BudgetExpenseOption,
    "expenditureBudget" | "expenseCategory" | "expenseSubcategory"
  > & { expenseDescription: string; totalBudget: string },
  id: number,
): BudgetRequestExpenseItemDraft {
  return {
    id,
    expenditureBudget: source.expenditureBudget,
    expenseCategory: source.expenseCategory,
    expenseSubcategory: source.expenseSubcategory,
    subActivityName: "",
    description: source.expenseDescription,
    amount: source.totalBudget,
  };
}

export function getBudgetRequestExpenseItemsTotal(
  items: readonly { amount: string | number }[],
): number {
  return (
    items.reduce((total, item) => {
      const amount = Number(item.amount);
      return total + (Number.isFinite(amount) ? Math.round(amount * 100) : 0);
    }, 0) / 100
  );
}

export function toBudgetRequestExpenseItems(
  items: readonly BudgetRequestExpenseItemDraft[],
): BudgetRequestExpenseItem[] {
  return items.map((item) => ({
    expenditureBudget: item.expenditureBudget,
    expenseCategory: item.expenseCategory,
    expenseSubcategory: item.expenseSubcategory,
    ...(item.subActivityName?.trim() ? { subActivityName: item.subActivityName.trim() } : {}),
    ...(item.fundingSource?.trim() ? { fundingSource: item.fundingSource.trim() } : {}),
    ...(item.fundingSourceDetail?.trim()
      ? { fundingSourceDetail: item.fundingSourceDetail.trim() }
      : {}),
    ...(item.fundCode?.trim() ? { fundCode: item.fundCode.trim() } : {}),
    ...(item.fundName?.trim() ? { fundName: item.fundName.trim() } : {}),
    description: item.description,
    amount: Number(item.amount || 0),
  }));
}

export function parseBudgetRequestExpenseItems(
  input: unknown,
  expenseOptions?: readonly BudgetExpenseOption[],
): ExpenseItemsParseResult {
  if (input === undefined || input === null) return { success: true, data: [] };
  if (!Array.isArray(input) || input.length > MAX_BUDGET_REQUEST_EXPENSE_ITEMS) {
    return {
      success: false,
      errors: {
        "proposalDetails.expenseItems": [
          `รายละเอียดค่าใช้จ่ายต้องมีไม่เกิน ${MAX_BUDGET_REQUEST_EXPENSE_ITEMS} รายการ`,
        ],
      },
    };
  }

  const data: BudgetRequestExpenseItem[] = [];
  const errors: Record<string, string[]> = {};
  input.forEach((raw, index) => {
    const prefix = `proposalDetails.expenseItems.${index}`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors[prefix] = ["ข้อมูลรายการค่าใช้จ่ายไม่ถูกต้อง"];
      return;
    }
    const source = raw as Record<string, unknown>;
    const expenditureBudget = source.expenditureBudget;
    const expenseCategory = source.expenseCategory;
    const expenseSubcategory = source.expenseSubcategory;
    const subActivityName = source.subActivityName;
    const fundingSource = source.fundingSource;
    const fundingSourceDetail = source.fundingSourceDetail;
    const fundCode = source.fundCode;
    const fundName = source.fundName;
    const description = source.description;
    if (
      typeof expenditureBudget !== "string" ||
      typeof expenseCategory !== "string" ||
      typeof expenseSubcategory !== "string" ||
      (subActivityName !== undefined && typeof subActivityName !== "string") ||
      (fundingSource !== undefined && typeof fundingSource !== "string") ||
      (fundingSourceDetail !== undefined && typeof fundingSourceDetail !== "string") ||
      (fundCode !== undefined && typeof fundCode !== "string") ||
      (fundName !== undefined && typeof fundName !== "string") ||
      typeof description !== "string"
    ) {
      errors[prefix] = ["ข้อมูลรายการค่าใช้จ่ายต้องเป็นข้อความ"];
      return;
    }
    const amount = source.amount;
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      amount > MONEY_LIMITS.maximumBaht ||
      amount !== Math.round(amount * 100) / 100
    ) {
      errors[`${prefix}.amount`] = [
        "จำนวนเงินต้องเป็นตัวเลขตั้งแต่ 0 บาท และทศนิยมไม่เกิน 2 ตำแหน่ง",
      ];
      return;
    }
    const normalizedSubActivityName =
      typeof subActivityName === "string" ? subActivityName.trim() : "";
    const normalizedFundingSource = typeof fundingSource === "string" ? fundingSource.trim() : "";
    const normalizedFundingSourceDetail =
      typeof fundingSourceDetail === "string" ? fundingSourceDetail.trim() : "";
    const normalizedFundCode = typeof fundCode === "string" ? fundCode.trim() : "";
    const normalizedFundName = typeof fundName === "string" ? fundName.trim() : "";
    const item: BudgetRequestExpenseItem = {
      expenditureBudget: expenditureBudget.trim(),
      expenseCategory: expenseCategory.trim(),
      expenseSubcategory: expenseSubcategory.trim(),
      ...(normalizedSubActivityName ? { subActivityName: normalizedSubActivityName } : {}),
      ...(normalizedFundingSource ? { fundingSource: normalizedFundingSource } : {}),
      ...(normalizedFundingSourceDetail
        ? { fundingSourceDetail: normalizedFundingSourceDetail }
        : {}),
      ...(normalizedFundCode ? { fundCode: normalizedFundCode } : {}),
      ...(normalizedFundName ? { fundName: normalizedFundName } : {}),
      description: description.trim(),
      amount,
    };
    if ((item.subActivityName?.length ?? 0) > INPUT_LIMITS.title) {
      errors[`${prefix}.subActivityName`] = [
        `ชื่อกิจกรรมย่อยต้องไม่เกิน ${INPUT_LIMITS.title.toLocaleString("th-TH")} ตัวอักษร`,
      ];
    } else if ((item.fundingSource?.length ?? 0) > INPUT_LIMITS.shortText) {
      errors[`${prefix}.fundingSource`] = ["แหล่งงบประมาณยาวเกินกำหนด"];
    } else if ((item.fundingSourceDetail?.length ?? 0) > INPUT_LIMITS.longText) {
      errors[`${prefix}.fundingSourceDetail`] = ["แหล่งงบประมาณย่อยยาวเกินกำหนด"];
    } else if ((item.fundCode?.length ?? 0) > INPUT_LIMITS.shortText) {
      errors[`${prefix}.fundCode`] = ["รหัสกองทุนยาวเกินกำหนด"];
    } else if ((item.fundName?.length ?? 0) > INPUT_LIMITS.title) {
      errors[`${prefix}.fundName`] = ["ชื่อกองทุนยาวเกินกำหนด"];
    } else if (item.description.length > INPUT_LIMITS.longText) {
      errors[`${prefix}.description`] = [
        `รายละเอียดค่าใช้จ่ายต้องไม่เกิน ${INPUT_LIMITS.longText.toLocaleString("th-TH")} ตัวอักษร`,
      ];
    } else if (
      item.expenditureBudget &&
      item.expenseCategory &&
      item.expenseSubcategory &&
      expenseOptions &&
      !isBudgetRequestExpenseCombination(expenseOptions, item)
    ) {
      errors[prefix] = ["งบรายจ่าย หมวดรายจ่าย และหมวดรายจ่ายย่อยไม่สัมพันธ์กัน"];
    } else {
      data.push(item);
    }
  });

  const total = data.reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100;
  if (total > MONEY_LIMITS.maximumBaht) {
    errors["proposalDetails.expenseItems"] = ["งบประมาณรวมทั้งหมดเกินวงเงินสูงสุดที่ระบบรองรับ"];
  }
  return Object.keys(errors).length > 0 ? { success: false, errors } : { success: true, data };
}

export function validateBudgetRequestExpenseItemsForSubmission(
  items: readonly BudgetRequestExpenseItem[],
  expenseOptions?: readonly BudgetExpenseOption[],
): Record<string, string[]> {
  if (items.length === 0) {
    return { "proposalDetails.expenseItems": ["กรุณาเพิ่มรายละเอียดค่าใช้จ่ายอย่างน้อย 1 รายการ"] };
  }
  const errors: Record<string, string[]> = {};
  items.forEach((item, index) => {
    const prefix = `proposalDetails.expenseItems.${index}`;
    const hasCompleteCategory = Boolean(
      item.expenditureBudget && item.expenseCategory && item.expenseSubcategory,
    );
    if (
      !hasCompleteCategory ||
      (expenseOptions && !isBudgetRequestExpenseCombination(expenseOptions, item))
    ) {
      errors[prefix] = ["กรุณาเลือกงบรายจ่าย หมวดรายจ่าย และหมวดรายจ่ายย่อยให้ครบ"];
    }
    if (item.amount <= 0) errors[`${prefix}.amount`] = ["กรุณาระบุจำนวนเงินมากกว่า 0 บาท"];
  });
  return errors;
}
