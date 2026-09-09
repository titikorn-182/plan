import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BudgetRequestStepContent } from "@/features/budget-requests/components/budget-request-step-content";
import type { BudgetExpenseFields } from "@/features/budget-requests/components/budget-request-expenses";
import { createEmptyBudgetExpenseBreakdown } from "@/features/budget-requests/expense-categories";
import { createEmptyBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import type { BudgetFormOptions } from "@/features/budget-requests/types";

const options: BudgetFormOptions = {
  organizations: [{ id: "organization-1", name: "สำนักงานเลขานุการ-งานการเงิน" }],
  fiscalYears: [
    { id: "fiscal-2570", label: "ปีงบประมาณ 2570", budgetCycleId: "cycle-2570" },
    { id: "fiscal-2571", label: "ปีงบประมาณ 2571", budgetCycleId: "cycle-2571" },
    { id: "fiscal-2572", label: "ปีงบประมาณ 2572", budgetCycleId: "cycle-2572" },
  ],
  record: null,
};

const commonProps = {
  amount: "0",
  details: createEmptyBudgetProposalDetails(),
  errors: undefined,
  fiscalYearId: "fiscal-2570",
  expenseFields: Object.fromEntries(
    Object.keys(createEmptyBudgetExpenseBreakdown()).map((category) => [category, ""]),
  ) as BudgetExpenseFields,
  hasLegacyAmount: false,
  onDetailChange: () => undefined,
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
  title: "",
};

function renderStep(step: number) {
  return renderToStaticMarkup(createElement(BudgetRequestStepContent, { ...commonProps, step }));
}

describe("new budget request fields", () => {
  it("keeps existing general fields and adds project schedule metadata", () => {
    const html = renderStep(0);
    expect(html).toMatch(/<input[^>]+placeholder="กรอกชื่อ-นามสกุล"[^>]+value=""/);
    expect(html).toContain("รหัสหน่วยงานย่อย");
    expect(html).toContain("ตำแหน่งผู้รับผิดชอบโครงการ");
    expect(html).toContain("วันที่เริ่ม");
    expect(html).toContain("วันที่สิ้นสุด");
    expect(html).toContain('<option value="fiscal-2570" selected="">ปีงบประมาณ 2570</option>');
    expect(html).toContain('<option value="fiscal-2572">ปีงบประมาณ 2572</option>');
  });

  it("renders funding, strategy, plan, and existing SDG choices", () => {
    const html = renderStep(1);
    expect(html).toContain("แหล่งงบประมาณและกองทุน");
    expect(html).toContain("ชื่อพันธกิจ");
    expect(html).toContain("ชื่อกลยุทธ์");
    expect(html).toContain("รหัสแผนปฏิบัติการ");
    expect(html).toContain("SDG 4 การศึกษาที่มีคุณภาพ");
  });

  it("keeps every expense group and adds source expense metadata", () => {
    const html = renderStep(2);
    expect(html).toContain("ชื่อแผนค่าใช้จ่าย");
    expect(html).toContain("รายละเอียดรายการค่าใช้จ่าย");
    expect(html).toContain("งบดำเนินงาน");
    expect(html).toContain("งบลงทุน");
    expect(html).toContain("งบบุคลากร");
    expect(html).toContain("งบอุดหนุนทั่วไป");
  });

  it("replaces the placeholder with output, outcome, and approval fields", () => {
    const html = renderStep(3);
    expect(html).toContain("รหัสผลผลิต/โครงการ");
    expect(html).toContain("ชื่อกิจกรรมย่อยภายใต้โครงการ");
    expect(html).toContain("วัตถุประสงค์");
    expect(html).toContain("กลุ่มเป้าหมาย");
    expect(html).toContain("ตัวชี้วัดความสำเร็จ");
    expect(html).toContain("ผู้เห็นชอบโครงการ");
    expect(html).toContain("ผู้อนุมัติโครงการ");
  });
});
