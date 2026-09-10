import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BudgetRequestExpenseItems } from "@/features/budget-requests/components/budget-request-expense-items";
import {
  createEmptyBudgetRequestExpenseItem,
  getBudgetRequestExpenseItemsTotal,
  getExpenseCategoryOptions,
  getExpenseSubcategoryOptions,
  parseBudgetRequestExpenseItems,
  validateBudgetRequestExpenseItemsForSubmission,
} from "@/features/budget-requests/expense-items";

const validItem = {
  expenditureBudget: "งบดำเนินงาน",
  expenseCategory: "ค่าใช้สอย",
  expenseSubcategory: "ค่าจ้างเหมาบริการ",
  description: "ค่าจ้างจัดทำเอกสาร",
  amount: 1250.5,
};

describe("budget request expense items", () => {
  it("filters categories and subcategories by their parent choices", () => {
    expect(getExpenseCategoryOptions("งบลงทุน")).toEqual(["ครุภัณฑ์", "ค่าสิ่งก่อสร้าง"]);
    expect(getExpenseSubcategoryOptions("งบลงทุน", "ค่าสิ่งก่อสร้าง")).toEqual(["สิ่งก่อสร้าง"]);
    expect(getExpenseSubcategoryOptions("งบดำเนินงาน", "ค่าใช้สอย")).toContain("ค่าจ้างเหมาบริการ");
  });

  it("adds line amounts using integer satang precision", () => {
    expect(
      getBudgetRequestExpenseItemsTotal([
        { amount: "0.10" },
        { amount: "0.20" },
        { amount: "1250.50" },
      ]),
    ).toBe(1250.8);
  });

  it("parses valid persisted items and trims their text", () => {
    expect(
      parseBudgetRequestExpenseItems([{ ...validItem, description: "  ค่าจ้างจัดทำเอกสาร  " }]),
    ).toEqual({
      success: true,
      data: [validItem],
    });
  });

  it("preserves optional source and sub-activity metadata from a grouped import", () => {
    const parsed = parseBudgetRequestExpenseItems([
      {
        ...validItem,
        subActivityName: "  กิจกรรมย่อย  ",
        fundingSource: "  งบประมาณเงินรายได้  ",
        fundingSourceDetail: "  เงินรายได้จากค่าธรรมเนียมการศึกษา  ",
        fundCode: "  2  ",
        fundName: "  กองทุนจัดการศึกษา  ",
      },
    ]);

    expect(parsed).toMatchObject({
      success: true,
      data: [
        {
          subActivityName: "กิจกรรมย่อย",
          fundingSource: "งบประมาณเงินรายได้",
          fundingSourceDetail: "เงินรายได้จากค่าธรรมเนียมการศึกษา",
          fundCode: "2",
          fundName: "กองทุนจัดการศึกษา",
        },
      ],
    });
  });

  it("allows an incomplete draft but requires complete positive items before submission", () => {
    const draft = createEmptyBudgetRequestExpenseItem(1);
    expect(parseBudgetRequestExpenseItems([{ ...draft, id: undefined, amount: 0 }])).toMatchObject({
      success: true,
    });
    expect(
      validateBudgetRequestExpenseItemsForSubmission([
        { ...validItem, expenditureBudget: "", amount: 0 },
      ]),
    ).toEqual(
      expect.objectContaining({
        "proposalDetails.expenseItems.0": expect.any(Array),
        "proposalDetails.expenseItems.0.amount": expect.any(Array),
      }),
    );
  });

  it("rejects a category combination that does not exist in the approved source data", () => {
    const parsed = parseBudgetRequestExpenseItems([
      { ...validItem, expenditureBudget: "งบลงทุน", expenseCategory: "ค่าใช้สอย" },
    ]);
    expect(parsed).toMatchObject({
      success: false,
      errors: { "proposalDetails.expenseItems.0": expect.any(Array) },
    });
  });

  it("renders the dependent controls, total, and add action", () => {
    const html = renderToStaticMarkup(
      createElement(BudgetRequestExpenseItems, {
        errors: undefined,
        items: [{ ...validItem, id: 1, amount: "1250.50" }],
        onAdd: () => undefined,
        onChange: () => undefined,
        onRemove: () => undefined,
      }),
    );
    expect(html).toContain("งบประมาณรวมทั้งหมด");
    expect(html).toContain("1,250.50 บาท");
    expect(html).toContain("หมวดรายจ่ายย่อย");
    expect(html).toContain("เพิ่มรายการค่าใช้จ่าย");
    expect(html).toContain("ค่าจ้างเหมาบริการ");
  });
});
