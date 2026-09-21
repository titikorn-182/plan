import { describe, expect, it } from "vitest";
import {
  createEmptyBudgetRequestExpenseItem,
  toBudgetRequestExpenseItems,
} from "@/features/budget-requests/expense-items";
import { createEmptyBudgetExpenseBreakdown } from "@/features/budget-requests/expense-categories";
import {
  createEmptyBudgetRequestProjectMember,
  toBudgetRequestProjectMembers,
} from "@/features/budget-requests/project-members";
import { createEmptyBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import {
  BUDGET_REQUEST_IMPORT_COLUMNS,
  createEmptyBudgetRequestSourceValues,
  toBudgetProposalDetails,
} from "@/features/budget-requests/source-fields";
import type { BudgetFormOptions, BudgetFormRecord } from "@/features/budget-requests/types";
import { createBudgetRequestWorkbookState } from "@/features/budget-requests/workbook-state";

function sourceValuesFixture() {
  const values = createEmptyBudgetRequestSourceValues();
  for (const { key } of BUDGET_REQUEST_IMPORT_COLUMNS) values[key] = `ข้อมูล ${key}`;
  values.organizationName = "สำนักงานเลขานุการ-งานการเงิน";
  values.organizationCode = "2301";
  return values;
}

function recordFixture(): BudgetFormRecord {
  return {
    id: "existing-request",
    code: "BR-EXISTING",
    version: 7,
    title: "ชื่อโครงการที่บันทึกไว้",
    organizationId: "stored-owner",
    fiscalYearId: "fiscal-2571",
    budgetCycleId: "stored-cycle-2571",
    projectType: "2 โครงการประจำตามภารกิจ",
    ownerName: "หัวหน้าโครงการเดิม",
    rationale: "หลักการและเหตุผลที่บันทึกไว้",
    amount: 1500.75,
    expenseBreakdown: null,
    status: "revision_required",
    proposalDetails: {
      ...toBudgetProposalDetails(sourceValuesFixture()),
      universityStrategy: "ยุทธศาสตร์เดิมที่ไม่แสดงในแบบฟอร์มใหม่",
      goalName: "เป้าประสงค์เดิม",
      successIndicators: "ตัวชี้วัดเดิม",
      alignmentDescription: "คำอธิบายความเชื่อมโยง SDG",
      sdgs: ["SDG 4 การศึกษาที่มีคุณภาพ"],
      projectMembers: [
        { name: "ผู้รับผิดชอบหนึ่ง", position: "นักวิชาการ" },
        { name: "ผู้รับผิดชอบสอง", position: "เจ้าหน้าที่" },
      ],
      expenseItems: [
        {
          expenditureBudget: "งบดำเนินงาน",
          expenseCategory: "ค่าใช้สอย",
          expenseSubcategory: "ค่าจ้างเหมาบริการ",
          subActivityName: "กิจกรรมย่อยจากไฟล์",
          fundingSource: "งบประมาณเงินรายได้",
          fundingSourceDetail: "รายได้จากค่าธรรมเนียมการศึกษา",
          fundCode: "2",
          fundName: "กองทุนจัดการศึกษา",
          description: "รายละเอียดหนึ่ง",
          amount: 1000.5,
        },
        {
          expenditureBudget: "งบดำเนินงาน",
          expenseCategory: "ค่าใช้สอย",
          expenseSubcategory: "ค่าใช้สอยอื่น ๆ",
          description: "รายละเอียดสอง",
          amount: 500.25,
        },
      ],
    },
  };
}

function optionsFixture(record: BudgetFormRecord | null): BudgetFormOptions {
  return {
    organizations: [
      { id: "stored-owner", name: "สำนักงานเลขานุการ-งานสารบรรณและธุรการ" },
      { id: "other-owner", name: "สำนักงานเลขานุการ-งานการเงิน" },
    ],
    fiscalYears: [
      { id: "fiscal-2570", label: "ปีงบประมาณ 2570", budgetCycleId: "cycle-2570" },
      { id: "fiscal-2571", label: "ปีงบประมาณ 2571", budgetCycleId: "current-cycle-2571" },
    ],
    masterData: [],
    record,
  };
}

describe("budget request workbook initial state", () => {
  it("preserves the existing new-form defaults", () => {
    expect(createBudgetRequestWorkbookState(optionsFixture(null))).toEqual({
      values: createEmptyBudgetRequestSourceValues(),
      organizationId: "",
      fiscalYearId: "fiscal-2570",
      budgetCycleId: "cycle-2570",
      expenseItems: [createEmptyBudgetRequestExpenseItem(1)],
      projectMembers: [createEmptyBudgetRequestProjectMember(1)],
      selectedSdgs: [],
      sdgAlignment: "",
      hasLegacyBudget: false,
    });
  });

  it("hydrates all 36 source fields and retains stored fiscal cycle and organization scope", () => {
    const record = recordFixture();
    const state = createBudgetRequestWorkbookState(optionsFixture(record));
    expect(Object.keys(state.values)).toHaveLength(36);
    expect(state.values).toEqual({
      ...sourceValuesFixture(),
      projectActivityName: record.title,
      projectType: record.projectType,
      ownerName: record.ownerName,
      rationale: record.rationale,
      totalBudget: String(record.amount),
    });
    expect(state).toMatchObject({
      organizationId: record.organizationId,
      fiscalYearId: record.fiscalYearId,
      budgetCycleId: record.budgetCycleId,
      selectedSdgs: record.proposalDetails.sdgs,
      sdgAlignment: record.proposalDetails.alignmentDescription,
      hasLegacyBudget: false,
    });
    expect(state.organizationId).not.toBe("other-owner");
    expect(state.expenseItems.map(({ id, amount }) => ({ id, amount }))).toEqual([
      { id: 1, amount: "1000.5" },
      { id: 2, amount: "500.25" },
    ]);
    expect(state.projectMembers.map(({ id }) => id)).toEqual([1, 2]);
  });

  it("round-trips unseen proposal fields and imported expense metadata without mutating the record", () => {
    const record = recordFixture();
    const original = structuredClone(record);
    const state = createBudgetRequestWorkbookState(optionsFixture(record));
    expect(toBudgetProposalDetails(state.values, record.proposalDetails)).toEqual(
      record.proposalDetails,
    );
    expect(toBudgetRequestExpenseItems(state.expenseItems)).toEqual(
      record.proposalDetails.expenseItems,
    );
    expect(toBudgetRequestProjectMembers(state.projectMembers)).toEqual(
      record.proposalDetails.projectMembers,
    );
    state.expenseItems[0].description = "แก้ไขในฟอร์ม";
    state.projectMembers[0].name = "ชื่อใหม่";
    state.selectedSdgs.push("SDG เพิ่มเติม");
    expect(record).toEqual(original);
  });

  it("fills missing source organization metadata only from a recognized matching stored organization", () => {
    const record = recordFixture();
    record.proposalDetails.organizationName = "";
    record.proposalDetails.organizationCode = "";
    const state = createBudgetRequestWorkbookState(optionsFixture(record));
    expect(state.values.organizationName).toBe("สำนักงานเลขานุการ-งานสารบรรณและธุรการ");
    expect(state.values.organizationCode).toBe("2301");
    expect(state.organizationId).toBe("stored-owner");
  });

  it.each(["หน่วยงานที่ไม่อยู่ในรายการ", "สำนักงานเลขานุการ-งานการเงิน (ปิดใช้งาน)"])(
    "does not infer a suborganization from an unrecognized owning-unit label: %s",
    (name) => {
      const record = recordFixture();
      record.proposalDetails.organizationName = "";
      record.proposalDetails.organizationCode = "";
      const options = optionsFixture(record);
      options.organizations = [{ id: record.organizationId, name }];
      const state = createBudgetRequestWorkbookState(options);
      expect(state.values.organizationName).toBe("");
      expect(state.values.organizationCode).toBe("");
      expect(state.organizationId).toBe(record.organizationId);
    },
  );

  it("retains an existing source name and infers its missing code without changing ownership", () => {
    const record = recordFixture();
    record.proposalDetails.organizationName = "ภาควิชารัฐประศาสนศาสตร์";
    record.proposalDetails.organizationCode = "";
    const state = createBudgetRequestWorkbookState(optionsFixture(record));
    expect(state.values.organizationName).toBe("ภาควิชารัฐประศาสนศาสตร์");
    expect(state.values.organizationCode).toBe("2303");
    expect(state.organizationId).toBe(record.organizationId);
  });

  it.each([0, 88399.94])(
    "marks itemless existing budgets as legacy and retains amount %s without fabricated classification",
    (amount) => {
      const record = recordFixture();
      record.amount = amount;
      record.expenseBreakdown = {
        ...createEmptyBudgetExpenseBreakdown(),
        operating_services: amount,
      };
      record.proposalDetails = createEmptyBudgetProposalDetails();
      const state = createBudgetRequestWorkbookState(optionsFixture(record));
      expect(state.hasLegacyBudget).toBe(true);
      expect(state.expenseItems).toEqual([
        { ...createEmptyBudgetRequestExpenseItem(1), amount: String(amount) },
      ]);
      expect(state.projectMembers).toEqual([createEmptyBudgetRequestProjectMember(1)]);
      expect(record.expenseBreakdown.operating_services).toBe(amount);
      expect(record.proposalDetails.expenseItems).toEqual([]);
    },
  );

  it("uses only known detail categories and descriptions to prepare explicit legacy conversion", () => {
    const record = recordFixture();
    record.proposalDetails.expenseItems = [];
    const state = createBudgetRequestWorkbookState(optionsFixture(record));
    expect(state.expenseItems).toEqual([
      {
        id: 1,
        expenditureBudget: record.proposalDetails.expenditureBudget,
        expenseCategory: record.proposalDetails.expenseCategory,
        expenseSubcategory: record.proposalDetails.expenseSubcategory,
        subActivityName: "",
        description: record.proposalDetails.expenseDescription,
        amount: String(record.amount),
      },
    ]);
    expect(state.hasLegacyBudget).toBe(true);
  });
});
