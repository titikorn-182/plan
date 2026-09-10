export type BudgetRequestExpenseOption = Readonly<{
  expenditureBudget: string;
  expenseCategory: string;
  expenseSubcategory: string;
}>;

export const BUDGET_REQUEST_EXPENSE_OPTIONS = [
  {
    expenditureBudget: "งบเงินอุดหนุน",
    expenseCategory: "เงินอุดหนุนทั่วไป-ค่าใช้จ่ายอุดหนุน",
    expenseSubcategory: "เงินอุดหนุนทั่วไป-ค่าใช้จ่ายอุดหนุน",
  },
  {
    expenditureBudget: "งบดำเนินงาน",
    expenseCategory: "ค่าใช้สอย",
    expenseSubcategory: "ค่าใช้สอยอื่น ๆ",
  },
  {
    expenditureBudget: "งบดำเนินงาน",
    expenseCategory: "ค่าตอบแทน",
    expenseSubcategory: "ค่าตอบแทนวิทยากร",
  },
  {
    expenditureBudget: "งบดำเนินงาน",
    expenseCategory: "ค่าวัสดุ",
    expenseSubcategory: "ค่าวัสดุอื่น",
  },
  {
    expenditureBudget: "งบรายจ่ายอื่น",
    expenseCategory: "งบรายจ่ายอื่น-ค่าใช้สอย",
    expenseSubcategory: "งบรายจ่ายอื่น-ค่าใช้สอย",
  },
  {
    expenditureBudget: "งบดำเนินงาน",
    expenseCategory: "ค่าตอบแทน",
    expenseSubcategory: "ค่าตอบแทนตามตำแหน่ง",
  },
  {
    expenditureBudget: "งบลงทุน",
    expenseCategory: "ครุภัณฑ์",
    expenseSubcategory: "ครุภัณฑ์คอมพิวเตอร์",
  },
  {
    expenditureBudget: "งบลงทุน",
    expenseCategory: "ครุภัณฑ์",
    expenseSubcategory: "ครุภัณฑ์สำนักงาน",
  },
  {
    expenditureBudget: "งบลงทุน",
    expenseCategory: "ครุภัณฑ์",
    expenseSubcategory: "ครุภัณฑ์โฆษณาและเผยแพร่",
  },
  {
    expenditureBudget: "งบดำเนินงาน",
    expenseCategory: "ค่าตอบแทน",
    expenseSubcategory: "ค่าใช้สอยอื่น ๆ",
  },
  {
    expenditureBudget: "งบเงินอุดหนุน",
    expenseCategory: "เงินอุดหนุนทั่วไป-ค่าจ้างพนักงาน",
    expenseSubcategory: "เงินอุดหนุนทั่วไป-ค่าจ้างพนักงาน",
  },
  {
    expenditureBudget: "งบดำเนินงาน",
    expenseCategory: "ค่าตอบแทน",
    expenseSubcategory: "ค่าตอบแทนพนักงาน",
  },
  {
    expenditureBudget: "งบดำเนินงาน",
    expenseCategory: "ค่าใช้สอย",
    expenseSubcategory: "ค่าซ่อมแซม/ปรับปรุง",
  },
  {
    expenditureBudget: "งบดำเนินงาน",
    expenseCategory: "ค่าตอบแทน",
    expenseSubcategory: "ค่าตอบแทนที่ปรึกษา",
  },
  {
    expenditureBudget: "งบดำเนินงาน",
    expenseCategory: "ค่าสาธารณูปโภค",
    expenseSubcategory: "ค่าไฟฟ้า",
  },
  {
    expenditureBudget: "งบดำเนินงาน",
    expenseCategory: "ค่าใช้สอย",
    expenseSubcategory: "ค่าจ้างทำความสะอาด",
  },
  {
    expenditureBudget: "งบดำเนินงาน",
    expenseCategory: "ค่าใช้สอย",
    expenseSubcategory: "ค่าจ้างเหมาบริการ",
  },
  {
    expenditureBudget: "งบลงทุน",
    expenseCategory: "ค่าสิ่งก่อสร้าง",
    expenseSubcategory: "สิ่งก่อสร้าง",
  },
] as const satisfies readonly BudgetRequestExpenseOption[];

export const BUDGET_REQUEST_EXPENDITURE_BUDGET_OPTIONS = [
  ...new Set(BUDGET_REQUEST_EXPENSE_OPTIONS.map((option) => option.expenditureBudget)),
];
export const BUDGET_REQUEST_EXPENSE_CATEGORY_OPTIONS = [
  ...new Set(BUDGET_REQUEST_EXPENSE_OPTIONS.map((option) => option.expenseCategory)),
];
export const BUDGET_REQUEST_EXPENSE_SUBCATEGORY_OPTIONS = [
  ...new Set(BUDGET_REQUEST_EXPENSE_OPTIONS.map((option) => option.expenseSubcategory)),
];
