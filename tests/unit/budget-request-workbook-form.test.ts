import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BudgetRequestWorkbookForm } from "@/features/budget-requests/components/budget-request-workbook-form";
import { createEmptyBudgetExpenseBreakdown } from "@/features/budget-requests/expense-categories";
import { BUDGET_REQUEST_SOURCE_SECTIONS } from "@/features/budget-requests/source-fields";
import type { BudgetFormOptions } from "@/features/budget-requests/types";
import {
  createBudgetWorkbookOptions,
  createBudgetWorkbookRecord,
} from "@/tests/fixtures/budget-workbook";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", props, children),
}));
vi.mock("@/features/budget-requests/actions", () => ({ saveBudgetRequestAction: vi.fn() }));
vi.mock("@/features/budget-requests/batch-actions", () => ({
  saveBudgetRequestBatchAction: vi.fn(),
}));

function renderForm(options: BudgetFormOptions) {
  return renderToStaticMarkup(createElement(BudgetRequestWorkbookForm, { options }));
}

function decodeAttribute(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function hiddenValue(html: string, name: string): string {
  const input = html.match(new RegExp(`<input\\b[^>]*name="${name}"[^>]*>`))?.[0];
  expect(input, `hidden input ${name}`).toBeDefined();
  const value = input?.match(/value="([^"]*)"/)?.[1];
  expect(value, `value for ${name}`).toBeDefined();
  return decodeAttribute(value ?? "");
}

describe("budget request workbook form", () => {
  it("keeps new request creation and import available with all six sections", () => {
    const html = renderForm(createBudgetWorkbookOptions());

    expect(html).toContain("สร้างคำของบประมาณจากข้อมูลโครงการ");
    expect(html).toContain("นำเข้าจาก XLSX หรือ CSV");
    expect(hiddenValue(html, "budgetRequestId")).toBe("");
    expect(hiddenValue(html, "version")).toBe("1");
    expect(hiddenValue(html, "expenseDetailMode")).toBe("items");
    expect(html).toContain('<option value="fiscal-2570" selected="">ปีงบประมาณ 2570</option>');
    for (const section of BUDGET_REQUEST_SOURCE_SECTIONS) {
      expect(html).toContain(`id="section-${section.id}"`);
      expect(html).toContain(section.title);
    }
  });

  it("renders the existing record on the complete form and hides the import panel", () => {
    const record = createBudgetWorkbookRecord();
    const html = renderForm(createBudgetWorkbookOptions(record));

    expect(html).toContain("แก้ไขคำของบประมาณ");
    expect(html).toContain(record.code);
    expect(html).not.toContain("สร้างคำของบประมาณจากข้อมูลโครงการ");
    expect(html).not.toContain("นำเข้าจาก XLSX หรือ CSV");
    expect(html).not.toMatch(/<input\b[^>]*type="file"/);
    expect(hiddenValue(html, "budgetRequestId")).toBe(record.id);
    expect(hiddenValue(html, "version")).toBe("7");
    expect(hiddenValue(html, "budgetCycleId")).toBe(record.budgetCycleId);
    expect(hiddenValue(html, "organizationId")).toBe(record.organizationId);
    expect(hiddenValue(html, "title")).toBe(record.title);
    expect(hiddenValue(html, "ownerName")).toBe(record.ownerName);
    expect(hiddenValue(html, "rationale")).toBe(record.rationale);
    expect(html).toContain('<option value="fiscal-2571" selected="">ปีงบประมาณ 2571</option>');
    expect(html).not.toContain('<option value="fiscal-2570" selected="">');
    for (const section of BUDGET_REQUEST_SOURCE_SECTIONS) {
      expect(html).toContain(`id="section-${section.id}"`);
    }
  });

  it("populates source, SDGs, project members, dates and expense items without losing hidden metadata", () => {
    const record = createBudgetWorkbookRecord();
    const html = renderForm(createBudgetWorkbookOptions(record));
    const details: unknown = JSON.parse(hiddenValue(html, "proposalDetails"));

    expect(details).toEqual(record.proposalDetails);
    expect(hiddenValue(html, "amount")).toBe("12500.75");
    expect(hiddenValue(html, "expenseBreakdown")).toBe("null");
    expect(hiddenValue(html, "expenseDetailMode")).toBe("items");
    expect(html).toContain('<option value="310132000001" selected="">310132000001</option>');
    expect(html).toContain('<option value="สำนักงานเลขานุการ-งานการเงิน" selected="">');
    expect(html).toContain('value="2027-10-01"');
    expect(html).toContain('value="2027-10-31"');
    expect(html).toContain('value="กิจกรรมย่อยเดิมเพื่อทดสอบการแก้ไข"');
    expect(html).toContain("วัตถุประสงค์เดิมที่ต้องแสดงในแบบฟอร์ม");
    expect(html).toContain("คำอธิบายความเชื่อมโยง SDG เดิม");
    expect(html.match(/<input\b[^>]*type="checkbox"[^>]*checked=""/g)).toHaveLength(2);
    for (const member of record.proposalDetails.projectMembers) {
      expect(html).toContain(`value="${member.name}"`);
      expect(html).toContain(`value="${member.position}"`);
    }
    for (const item of record.proposalDetails.expenseItems) {
      expect(html).toContain(item.description);
      expect(html).toContain(`value="${item.amount}"`);
    }
  });

  it("keeps retired organization, fund and expense selections visible as saved historical data", () => {
    const original = createBudgetWorkbookRecord();
    const record = createBudgetWorkbookRecord({
      proposalDetails: {
        ...original.proposalDetails,
        organizationCode: "9999",
        organizationName: "หน่วยงานเดิมที่ยุติการใช้งาน",
        fundCode: "99",
        fundName: "กองทุนเดิมที่ยุติการใช้งาน",
        expenseItems: [
          {
            ...original.proposalDetails.expenseItems[0],
            expenditureBudget: "งบรายจ่ายเดิมที่ยุติการใช้งาน",
            expenseCategory: "หมวดรายจ่ายเดิมที่ยุติการใช้งาน",
            expenseSubcategory: "หมวดรายจ่ายย่อยเดิมที่ยุติการใช้งาน",
          },
        ],
      },
    });
    const html = renderForm(createBudgetWorkbookOptions(record));
    const details: unknown = JSON.parse(hiddenValue(html, "proposalDetails"));
    const historicalSelections = [
      record.proposalDetails.organizationCode,
      record.proposalDetails.organizationName,
      record.proposalDetails.fundCode,
      record.proposalDetails.expenseItems[0].expenditureBudget,
      record.proposalDetails.expenseItems[0].expenseCategory,
      record.proposalDetails.expenseItems[0].expenseSubcategory,
    ];

    for (const value of historicalSelections) {
      expect(html).toContain(`<option value="${value}" selected="">ข้อมูลเดิม — ${value}</option>`);
    }
    expect(details).toEqual(record.proposalDetails);
  });

  it.each([null, { ...createEmptyBudgetExpenseBreakdown(), operating_services: 12345.67 }])(
    "preserves legacy totals and breakdown %j until explicitly converted to expense items",
    (expenseBreakdown) => {
      const original = createBudgetWorkbookRecord();
      const record = createBudgetWorkbookRecord({
        amount: 12345.67,
        expenseBreakdown,
        proposalDetails: { ...original.proposalDetails, expenseItems: [] },
      });
      const html = renderForm(createBudgetWorkbookOptions(record));
      const details: unknown = JSON.parse(hiddenValue(html, "proposalDetails"));

      expect(hiddenValue(html, "amount")).toBe("12345.67");
      expect(hiddenValue(html, "expenseBreakdown")).toBe(JSON.stringify(expenseBreakdown));
      expect(hiddenValue(html, "expenseDetailMode")).not.toBe("items");
      expect(details).toEqual(record.proposalDetails);
      expect(html).toContain("12,345.67");
      expect(html).toContain("เปลี่ยนเป็นรายการค่าใช้จ่าย");
    },
  );
});
