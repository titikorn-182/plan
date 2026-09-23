import { describe, expect, it } from "vitest";
import {
  createEmptyBudgetProposalDetails,
  type BudgetProposalDetails,
} from "@/features/budget-requests/proposal-details";
import {
  createApprovedBudgetProjectSource,
  type ApprovedBudgetSourceRow,
} from "@/features/projects/approved-budget-source";
import {
  FACULTY_STRATEGIES,
  PROJECT_CHARACTERISTICS,
  sumProjectExpenses,
} from "@/features/projects/proposal-details";
import { SDG_OPTIONS } from "@/features/shared/sdgs";
import { validateProjectPlanStructure } from "@/features/projects/plan-structure";
import { INPUT_LIMITS, MONEY_LIMITS } from "@/lib/config/limits";
import { TEST_MASTER_DATA } from "@/tests/fixtures/master-data";

const sourceDetails = (): BudgetProposalDetails => ({
  ...createEmptyBudgetProposalDetails(),
  subActivityName: "กิจกรรมพัฒนาทักษะนักศึกษา",
  startsOn: "2026-10-01",
  endsOn: "2027-09-30",
  objectives: "ส่งเสริมทักษะการทำงานร่วมกัน",
  targetGroup: "นักศึกษาชั้นปีที่ 1 จำนวน 50 คน",
  expectedBenefits: "นักศึกษาสามารถทำงานร่วมกันได้",
  ownerPosition: "อาจารย์",
  projectMembers: [{ name: "ผู้รับผิดชอบ ก", position: "ผู้ประสานงาน" }],
  strategyName: FACULTY_STRATEGIES[0],
  sdgs: [SDG_OPTIONS[3]],
  alignmentDescription: "สนับสนุนการศึกษาที่มีคุณภาพ",
  outputCode: "1002",
  outputName: "ผลิตบัณฑิตด้านสังคมศาสตร์",
  operationalPlanCode: "10021023",
  operationalPlanName: "แผนการผลิตบัณฑิต",
  activityCode: "100210230001",
  expenseItems: [
    {
      expenditureBudget: "งบดำเนินงาน",
      expenseCategory: "ค่าตอบแทน",
      expenseSubcategory: "ค่าตอบแทนวิทยากร",
      description: "วิทยากรกิจกรรม",
      amount: 1250.25,
    },
    {
      expenditureBudget: "งบดำเนินงาน",
      expenseCategory: "ค่าวัสดุ",
      expenseSubcategory: "วัสดุสำนักงาน",
      description: "วัสดุประกอบกิจกรรม",
      amount: 750.5,
    },
  ],
});

function sourceRow(details: unknown = sourceDetails()): ApprovedBudgetSourceRow {
  return {
    id: "755030d6-709f-4443-9df6-4e07938c6987",
    code: "BR700001",
    title_th: "โครงการส่งเสริมการเรียนรู้",
    organization_id: "e562c379-a1eb-4f6b-9a5b-bf43a295e01d",
    fiscal_year_id: "a54b0761-b52c-4220-9e29-4f72f9020e91",
    owner_name: "หัวหน้าโครงการ",
    rationale: "นักศึกษาต้องได้รับการพัฒนาทักษะการทำงานร่วมกันอย่างต่อเนื่อง",
    project_type: PROJECT_CHARACTERISTICS[0],
    requested_amount: 2000.75,
    proposal_details: details,
  };
}

describe("approved budget project source", () => {
  it("prefills common fields, personnel, SDGs, dates and plan hierarchy", () => {
    const source = sourceRow();
    const result = createApprovedBudgetProjectSource(source);
    expect(result).toMatchObject({
      success: true,
      data: {
        budgetRequestId: source.id,
        code: source.code,
        title: "กิจกรรมพัฒนาทักษะนักศึกษา",
        organizationId: source.organization_id,
        fiscalYearId: source.fiscal_year_id,
        ownerName: source.owner_name,
        startsOn: "2026-10-01",
        endsOn: "2027-09-30",
        requestedAmount: source.requested_amount,
        details: {
          characteristics: [PROJECT_CHARACTERISTICS[0]],
          strategies: [FACULTY_STRATEGIES[0]],
          projectHeadPosition: "อาจารย์",
          responsiblePeople: [{ name: "ผู้รับผิดชอบ ก", position: "ผู้ประสานงาน" }],
          rationale: source.rationale,
          objectives: "ส่งเสริมทักษะการทำงานร่วมกัน",
          targetGroup: "นักศึกษาชั้นปีที่ 1 จำนวน 50 คน",
          expectedResults: "นักศึกษาสามารถทำงานร่วมกันได้",
          sdgs: [SDG_OPTIONS[3]],
          sdgAlignmentDescription: "สนับสนุนการศึกษาที่มีคุณภาพ",
          outputCode: "1002",
          outputName: "ผลิตบัณฑิตด้านสังคมศาสตร์",
          operationalPlanCode: "10021023",
          operationalPlanName: "แผนการผลิตบัณฑิต",
          activityCode: "100210230001",
          projectActivityName: source.title_th,
          startWeek: null,
          endWeek: null,
          actionPlan: [],
          goalIndicators: [],
        },
      },
    });
  });

  it("preserves row totals and explains the default calculation factors", () => {
    const result = createApprovedBudgetProjectSource(sourceRow());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(sumProjectExpenses(result.data.details)).toBe(2000.75);
    expect(result.data.details.expenseItems).toMatchObject([
      {
        category: "ค่าตอบแทน",
        rate: 1250.25,
        units: 1,
        quantity: 1,
        occurrences: 1,
        amount: 1250.25,
      },
      { category: "ค่าวัสดุ", rate: 750.5, units: 1, quantity: 1, occurrences: 1, amount: 750.5 },
    ]);
    expect(result.data.warnings).toContainEqual(
      expect.stringContaining("หน่วย จำนวน ครั้ง เป็น 1"),
    );
  });

  it("keeps imported categories, long descriptions and per-row funding metadata unchanged", () => {
    const details = sourceDetails();
    details.expenseItems[0] = {
      expenditureBudget: "งบลงทุน",
      expenseCategory: "ค่าครุภัณฑ์",
      expenseSubcategory: "ครุภัณฑ์คอมพิวเตอร์",
      subActivityName: details.subActivityName,
      fundingSource: "งบประมาณเงินรายได้",
      fundingSourceDetail: "รายได้จากการจัดการศึกษา",
      fundCode: "2",
      fundName: "กองทุนจัดการศึกษา",
      description: "รายละเอียด ".repeat(50),
      amount: 1250.25,
    };
    const result = createApprovedBudgetProjectSource(sourceRow(details));
    expect(result.success).toBe(true);
    if (!result.success) return;
    const { expenseCategory, ...metadata } = details.expenseItems[0];
    expect(result.data.details.expenseItems[0]).toMatchObject({
      ...metadata,
      description: metadata.description.trim(),
      category: expenseCategory,
    });
    expect(result.data.details.expenseItems[0].description.length).toBeGreaterThan(
      INPUT_LIMITS.title,
    );
  });

  it("uses the source project title when there is no top-level subactivity name", () => {
    const row = sourceRow({ ...sourceDetails(), subActivityName: "   " });
    const result = createApprovedBudgetProjectSource(row);
    expect(result).toMatchObject({ success: true, data: { title: row.title_th } });
  });

  it("preserves long funding detail metadata accepted by approved budget requests", () => {
    const details = sourceDetails();
    details.expenseItems[0].fundingSourceDetail = "ก".repeat(INPUT_LIMITS.longText);
    const result = createApprovedBudgetProjectSource(sourceRow(details));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.details.expenseItems[0].fundingSourceDetail).toBe(
      details.expenseItems[0].fundingSourceDetail,
    );
    expect(sumProjectExpenses(result.data.details)).toBe(2000.75);
  });

  it("does not use a legacy free-text title as a plan name when no hierarchy was recorded", () => {
    const row = sourceRow({
      objectives: "พัฒนาทักษะการทำงานร่วมกัน",
      targetGroup: "นักศึกษาปีที่ 1",
    });
    const result = createApprovedBudgetProjectSource(row);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.title).toBe(row.title_th);
    expect(result.data.details).toMatchObject({
      projectActivityName: "",
      activityCode: "",
      outputCode: "",
      outputName: "",
      operationalPlanCode: "",
      operationalPlanName: "",
      rationale: row.rationale,
      objectives: "พัฒนาทักษะการทำงานร่วมกัน",
      targetGroup: "นักศึกษาปีที่ 1",
      actionPlan: [],
    });
    expect(validateProjectPlanStructure(result.data.details, TEST_MASTER_DATA)).toEqual({});
    expect(result.data.warnings).toContainEqual(expect.stringContaining("กรุณาเลือกโครงสร้างแผน"));
  });

  it("warns about grouped activities without dropping rows or choosing one activity's amount", () => {
    const details = sourceDetails();
    details.subActivityName = "";
    details.expenseItems[0].subActivityName = "กิจกรรมที่หนึ่ง";
    details.expenseItems[1].subActivityName = "กิจกรรมที่สอง";
    const row = sourceRow(details);
    const result = createApprovedBudgetProjectSource(row);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.title).toBe(row.title_th);
    expect(result.data.details.expenseItems).toHaveLength(2);
    expect(result.data.details.expenseItems.map((item) => item.subActivityName)).toEqual([
      "กิจกรรมที่หนึ่ง",
      "กิจกรรมที่สอง",
    ]);
    expect(sumProjectExpenses(result.data.details)).toBe(row.requested_amount);
    expect(result.data.warnings).toContainEqual(expect.stringContaining("รวมหลายกิจกรรมย่อย"));
  });

  it("does not guess similar strategies or project characteristics", () => {
    const row = sourceRow({
      ...sourceDetails(),
      strategyName: FACULTY_STRATEGIES[0].replace("กลยุทธ์", "ยุทธศาสตร์"),
    });
    row.project_type = "1 โครงการขับเคลื่อนกลยุทธ์";
    const result = createApprovedBudgetProjectSource(row);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.details.characteristics).toEqual([]);
    expect(result.data.details.otherCharacteristic).toBe("");
    expect(result.data.details.strategies).toEqual([]);
    expect(result.data.warnings).toContainEqual(expect.stringContaining("กรุณาเลือกลักษณะโครงการ"));
    expect(result.data.warnings).toContainEqual(expect.stringContaining("กรุณาเลือกกลยุทธ์"));
  });

  it("leaves unmatched source metadata and ambiguous success indicators in the reference with a warning", () => {
    const result = createApprovedBudgetProjectSource(
      sourceRow({
        ...sourceDetails(),
        organizationName: "หน่วยงานย่อย",
        successIndicators: "ผู้เข้าร่วมผ่านเกณฑ์ร้อยละ 80",
        reviewerName: "ผู้เห็นชอบ",
      }),
    );
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.details.processIndicator).toBe("");
    expect(result.data.details.outputIndicator).toBe("");
    expect(result.data.warnings).toContainEqual(expect.stringContaining("ตัวชี้วัดความสำเร็จ"));
    expect(result.data.warnings).toContainEqual(
      expect.stringContaining("ยังคงอยู่ในคำของบอ้างอิง"),
    );
  });

  it("does not rescale expense items when the recorded budget differs", () => {
    const row = { ...sourceRow(), requested_amount: 3000 };
    const result = createApprovedBudgetProjectSource(row);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.requestedAmount).toBe(3000);
    expect(sumProjectExpenses(result.data.details)).toBe(2000.75);
    expect(result.data.warnings).toContainEqual(expect.stringContaining("ไม่เท่ากับวงเงิน"));
  });

  it("supports a legacy single expense record without inventing its category or description", () => {
    const row = sourceRow({
      subActivityName: "กิจกรรมเดิม",
      expenditureBudget: "งบดำเนินงาน",
      expenseCategory: "ค่าใช้สอย",
      expenseSubcategory: "ค่าเดินทาง",
      expenseDescription: "เดินทางเข้าร่วมการประชุม",
      fundingSource: "งบประมาณเงินรายได้",
    });
    const result = createApprovedBudgetProjectSource(row);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.details.expenseItems).toMatchObject([
      {
        category: "ค่าใช้สอย",
        description: "เดินทางเข้าร่วมการประชุม",
        amount: row.requested_amount,
        fundingSource: "งบประมาณเงินรายได้",
      },
    ]);
    expect(result.data.warnings).toContainEqual(expect.stringContaining("แบบรายการรวม"));
  });

  it("does not fabricate expense details for a legacy request that only has a budget total", () => {
    const result = createApprovedBudgetProjectSource(sourceRow(null));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.details.expenseItems).toEqual([]);
    expect(result.data.warnings).toContainEqual(
      expect.stringContaining("ไม่มีรายละเอียดค่าใช้จ่าย"),
    );
  });

  it("accepts JSON details and normalizes known legacy SDG labels", () => {
    const result = createApprovedBudgetProjectSource(
      sourceRow(
        JSON.stringify({
          ...sourceDetails(),
          sdgs: ["SDG 8 งานที่มีคุณค่าและการเติบโตทางเศรษฐกิจ"],
        }),
      ),
    );
    expect(result).toMatchObject({ success: true, data: { details: { sdgs: [SDG_OPTIONS[7]] } } });
  });

  it.each([
    ["malformed JSON", "{"],
    ["invalid SDG", { sdgs: ["SDG 99"] }],
    ["reversed dates", { startsOn: "2027-09-30", endsOn: "2026-10-01" }],
    ["invalid members", { projectMembers: [{ name: false, position: "" }] }],
    [
      "invalid expense amount",
      { expenseItems: [{ ...sourceDetails().expenseItems[0], amount: -1 }] },
    ],
    [
      "too many expense items",
      { expenseItems: Array.from({ length: 101 }, () => sourceDetails().expenseItems[0]) },
    ],
  ])("rejects %s without returning partial replacements", (_label, details) => {
    const result = createApprovedBudgetProjectSource(sourceRow(details));
    expect(result.success).toBe(false);
    expect(result).not.toHaveProperty("data");
  });

  it.each([NaN, Infinity, -1, MONEY_LIMITS.maximumBaht + 1, 1.001])(
    "rejects invalid recorded budget %s",
    (requestedAmount) => {
      const result = createApprovedBudgetProjectSource({
        ...sourceRow(),
        requested_amount: requestedAmount,
      });
      expect(result.success).toBe(false);
    },
  );

  it("returns an error instead of truncating incompatible project fields", () => {
    const row = { ...sourceRow(), rationale: "ก".repeat(INPUT_LIMITS.longText + 1) };
    expect(createApprovedBudgetProjectSource(row).success).toBe(false);
  });

  it("does not mutate the approved request when project prefill is edited", () => {
    const details = sourceDetails();
    const row = sourceRow(details);
    const original = structuredClone(row);
    const result = createApprovedBudgetProjectSource(row);
    expect(result.success).toBe(true);
    if (!result.success) return;
    result.data.details.responsiblePeople[0].name = "แก้ไขชื่อ";
    result.data.details.expenseItems[0].rate = 99;
    result.data.details.sdgs.push(SDG_OPTIONS[0]);
    expect(row).toEqual(original);
  });
});
