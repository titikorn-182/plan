import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BudgetRequestStepContent } from "@/features/budget-requests/components/budget-request-step-content";
import type { BudgetFormOptions } from "@/features/budget-requests/types";
import { createEmptyBudgetExpenseBreakdown } from "@/features/budget-requests/expense-categories";
import type { BudgetExpenseFields } from "@/features/budget-requests/components/budget-request-expenses";

const options: BudgetFormOptions = {
  organizations: [{ id: "organization-1", name: "สำนักงานเลขานุการ-งานการเงิน" }],
  fiscalYears: [
    { id: "fiscal-2570", label: "ปีงบประมาณ 2570", budgetCycleId: "cycle-2570" },
    { id: "fiscal-2571", label: "ปีงบประมาณ 2571", budgetCycleId: "cycle-2571" },
    { id: "fiscal-2572", label: "ปีงบประมาณ 2572", budgetCycleId: "cycle-2572" },
  ],
  record: null,
};

describe("new budget request general fields", () => {
  it("leaves the owner blank and renders selectable fiscal years", () => {
    const html = renderToStaticMarkup(
      createElement(BudgetRequestStepContent, {
        amount: "0",
        errors: undefined,
        fiscalYearId: "fiscal-2570",
        expenseFields: Object.fromEntries(
          Object.keys(createEmptyBudgetExpenseBreakdown()).map((category) => [category, ""]),
        ) as BudgetExpenseFields,
        hasLegacyAmount: false,
        onExpenseChange: () => undefined,
        onFiscalYearChange: () => undefined,
        onOrganizationChange: () => undefined,
        onOwnerChange: () => undefined,
        onProjectTypeChange: () => undefined,
        onRationaleChange: () => undefined,
        onTitleChange: () => undefined,
        options,
        organizationId: "organization-1",
        ownerName: "",
        projectType: "โครงการพัฒนาการเรียนการสอน",
        rationale: "",
        step: 0,
        title: "",
      }),
    );

    expect(html).toMatch(/<input[^>]+placeholder="กรอกชื่อ-นามสกุล"[^>]+value=""/);
    expect(html).toContain('<option value="fiscal-2570" selected="">ปีงบประมาณ 2570</option>');
    expect(html).toContain('<option value="fiscal-2571">ปีงบประมาณ 2571</option>');
    expect(html).toContain('<option value="fiscal-2572">ปีงบประมาณ 2572</option>');
  });
});
