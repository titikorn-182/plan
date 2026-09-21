import { createEmptyBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import type { BudgetFormOptions, BudgetFormRecord } from "@/features/budget-requests/types";
import { SDG_OPTIONS } from "@/features/shared/sdgs";
import { TEST_MASTER_DATA } from "@/tests/fixtures/master-data";

export function createBudgetWorkbookRecord(
  overrides: Partial<BudgetFormRecord> = {},
): BudgetFormRecord {
  return {
    id: "00000000-0000-4000-8000-000000000007",
    code: "BR-TEST-EDIT-007",
    version: 7,
    title: "โครงการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ",
    organizationId: "organization-finance",
    fiscalYearId: "fiscal-2571",
    budgetCycleId: "cycle-2571",
    projectType: "2 โครงการประจำตามภารกิจ",
    ownerName: "หัวหน้าโครงการทดสอบ",
    rationale: "เหตุผลของคำขอเดิมที่ต้องคงไว้เมื่อแก้ไข",
    amount: 12500.75,
    expenseBreakdown: null,
    status: "draft",
    proposalDetails: {
      ...createEmptyBudgetProposalDetails(),
      organizationCode: "2301",
      organizationName: "สำนักงานเลขานุการ-งานการเงิน",
      fundingSource: "งบประมาณเงินรายได้",
      fundingSourceDetail: "เงินรายได้จากค่าธรรมเนียมการศึกษา",
      missionName: "พันธกิจที่ 3 ด้านการบริการวิชาการ",
      strategyName: "ยุทธศาสตร์ที่ 4 : บริการวิชาการเพื่อสร้างความยั่งยืน",
      fundCode: "4",
      fundName: "กองทุนบริการวิชาการ",
      outputCode: "3101",
      outputName: "ผลงานการให้บริการวิชาการ",
      operationalPlanCode: "31013200",
      operationalPlanName: "แผนการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ",
      activityCode: "310132000001",
      subActivityName: "กิจกรรมย่อยเดิมเพื่อทดสอบการแก้ไข",
      objectives: "วัตถุประสงค์เดิมที่ต้องแสดงในแบบฟอร์ม",
      expectedBenefits: "ประโยชน์เดิมของโครงการ",
      targetGroup: "กลุ่มเป้าหมายทดสอบ",
      startsOn: "2027-10-01",
      endsOn: "2027-10-31",
      ownerPosition: "ตำแหน่งหัวหน้าโครงการเดิม",
      alignmentDescription: "คำอธิบายความเชื่อมโยง SDG เดิม",
      sdgs: [SDG_OPTIONS[3], SDG_OPTIONS[12]],
      projectMembers: [
        { name: "ผู้รับผิดชอบทดสอบคนที่หนึ่ง", position: "ผู้ประสานงาน" },
        { name: "ผู้รับผิดชอบทดสอบคนที่สอง", position: "เจ้าหน้าที่โครงการ" },
      ],
      expenseItems: [
        {
          expenditureBudget: "งบดำเนินงาน",
          expenseCategory: "ค่าใช้สอย",
          expenseSubcategory: "ค่าจ้างเหมาบริการ",
          subActivityName: "กิจกรรมย่อยรายการแรก",
          fundingSource: "งบประมาณเงินรายได้",
          fundingSourceDetail: "เงินรายได้จากค่าธรรมเนียมการศึกษา",
          fundCode: "4",
          fundName: "กองทุนบริการวิชาการ",
          description: "รายละเอียดค่าใช้จ่ายเดิมรายการแรก",
          amount: 10000.5,
        },
        {
          expenditureBudget: "งบดำเนินงาน",
          expenseCategory: "ค่าใช้สอย",
          expenseSubcategory: "ค่าใช้สอยอื่น ๆ",
          description: "รายละเอียดค่าใช้จ่ายเดิมรายการที่สอง",
          amount: 2500.25,
        },
      ],
      universityStrategy: "ยุทธศาสตร์เดิมที่ไม่มีช่องในแบบฟอร์มใหม่",
      goalName: "เป้าประสงค์เดิม",
      successIndicators: "ตัวชี้วัดเดิมที่ต้องไม่หาย",
      reviewerName: "ผู้เห็นชอบเดิม",
      reviewerPosition: "ตำแหน่งผู้เห็นชอบเดิม",
      approverName: "ผู้อนุมัติเดิม",
      approverPosition: "ตำแหน่งผู้อนุมัติเดิม",
      msdsId: "legacy-msds-id",
      spendingPlanName: "ชื่อแผนค่าใช้จ่ายเดิม",
      spendingPlanTotal: "12500.75",
    },
    ...overrides,
  };
}

export function createBudgetWorkbookOptions(
  record: BudgetFormRecord | null = null,
): BudgetFormOptions {
  return {
    organizations: [{ id: "organization-finance", name: "สำนักงานเลขานุการ-งานการเงิน" }],
    fiscalYears: [
      { id: "fiscal-2570", label: "ปีงบประมาณ 2570", budgetCycleId: "cycle-2570" },
      { id: "fiscal-2571", label: "ปีงบประมาณ 2571", budgetCycleId: "cycle-2571" },
    ],
    masterData: [TEST_MASTER_DATA, { ...TEST_MASTER_DATA, fiscalYearId: "fiscal-2571" }],
    record,
  };
}
