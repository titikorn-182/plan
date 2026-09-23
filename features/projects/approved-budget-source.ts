import {
  parseBudgetProposalDetails,
  type BudgetProposalDetails,
} from "@/features/budget-requests/proposal-details";
import type { BudgetRequestExpenseItem } from "@/features/budget-requests/expense-items";
import {
  createEmptyProjectProposalDetails,
  FACULTY_STRATEGIES,
  parseProjectProposalDetails,
  PROJECT_CHARACTERISTICS,
  sumProjectExpenses,
  type ProjectProposalDetails,
} from "@/features/projects/proposal-details";
import { SDG_OPTIONS } from "@/features/shared/sdgs";
import { MONEY_LIMITS } from "@/lib/config/limits";
import type { Tables } from "@/types/database.generated";

export type ApprovedBudgetSourceRow = Pick<
  Tables<"budget_requests">,
  | "id"
  | "code"
  | "title_th"
  | "organization_id"
  | "fiscal_year_id"
  | "owner_name"
  | "rationale"
  | "project_type"
  | "requested_amount"
> & { proposal_details: unknown };

export type ApprovedBudgetProjectSource = {
  budgetRequestId: string;
  code: string;
  title: string;
  organizationId: string;
  fiscalYearId: string;
  ownerName: string;
  startsOn: string;
  endsOn: string;
  details: ProjectProposalDetails;
  requestedAmount: number;
  warnings: string[];
};

export type ApprovedBudgetProjectSourceResult =
  { success: true; data: ApprovedBudgetProjectSource } | { success: false; error: string };

const unrepresentedSourceFields = {
  organizationCode: "รหัสหน่วยงานย่อย",
  organizationName: "ชื่อหน่วยงานย่อย",
  fundingSource: "แหล่งงบประมาณ",
  fundingSourceDetail: "แหล่งงบประมาณย่อย",
  missionName: "พันธกิจ",
  universityStrategy: "ยุทธศาสตร์มหาวิทยาลัย",
  goalName: "เป้าประสงค์",
  fundCode: "รหัสกองทุน",
  fundName: "ชื่อกองทุน",
  msdsId: "MSDS ID",
  spendingPlanName: "ชื่อแผนค่าใช้จ่าย",
  spendingPlanTotal: "ยอดรวมแผนค่าใช้จ่าย",
  reviewerName: "ผู้เห็นชอบโครงการ",
  reviewerPosition: "ตำแหน่งผู้เห็นชอบโครงการ",
  approverName: "ผู้อนุมัติโครงการ",
  approverPosition: "ตำแหน่งผู้อนุมัติโครงการ",
  successIndicators: "ตัวชี้วัดความสำเร็จ",
} as const satisfies Partial<Record<keyof BudgetProposalDetails, string>>;

function sourceExpenses(
  source: BudgetProposalDetails,
  requestedAmount: number,
  warnings: string[],
): BudgetRequestExpenseItem[] {
  if (source.expenseItems.length) return source.expenseItems;
  if (source.expenseCategory && source.expenseDescription) {
    warnings.push("คำของบเดิมมีรายละเอียดค่าใช้จ่ายแบบรายการรวม กรุณาตรวจสอบรายการก่อนส่งข้อเสนอ");
    return [
      {
        expenditureBudget: source.expenditureBudget,
        expenseCategory: source.expenseCategory,
        expenseSubcategory: source.expenseSubcategory,
        subActivityName: source.subActivityName,
        fundingSource: source.fundingSource,
        fundingSourceDetail: source.fundingSourceDetail,
        fundCode: source.fundCode,
        fundName: source.fundName,
        description: source.expenseDescription,
        amount: requestedAmount,
      },
    ];
  }
  if (requestedAmount > 0) {
    warnings.push(
      "คำของบมีวงเงินแต่ไม่มีรายละเอียดค่าใช้จ่ายที่นำเข้าได้ กรุณาเพิ่มรายการให้ครบตามวงเงินอ้างอิง",
    );
  }
  return [];
}

/** Maps an already-authorized approved request; callers must enforce status and access. */
export function createApprovedBudgetProjectSource(
  row: ApprovedBudgetSourceRow,
): ApprovedBudgetProjectSourceResult {
  if (
    !Number.isFinite(row.requested_amount) ||
    row.requested_amount < 0 ||
    row.requested_amount > MONEY_LIMITS.maximumBaht ||
    Math.round(row.requested_amount * 100) / 100 !== row.requested_amount
  ) {
    return {
      success: false,
      error: "วงเงินของคำของบอ้างอิงไม่ถูกต้อง กรุณาตรวจสอบคำของบก่อนนำเข้า",
    };
  }
  const parsed = parseBudgetProposalDetails(row.proposal_details);
  if (!parsed.success) {
    return {
      success: false,
      error: "รายละเอียดคำของบอ้างอิงไม่ถูกต้อง กรุณาตรวจสอบคำของบก่อนนำเข้า",
    };
  }
  const source = parsed.data;
  const warnings: string[] = [];
  const hasPlanHierarchy = Boolean(
    source.outputCode ||
    source.outputName ||
    source.operationalPlanCode ||
    source.operationalPlanName ||
    source.activityCode,
  );
  if (!hasPlanHierarchy) {
    warnings.push(
      "คำของบเดิมไม่มีโครงสร้างแผนและกิจกรรม ระบบคงชื่อกิจกรรมย่อยไว้โดยไม่ใช้แทนชื่อแผน กรุณาเลือกโครงสร้างแผนให้ตรงกับปีงบประมาณ",
    );
  }
  const characteristics = PROJECT_CHARACTERISTICS.filter((option) => option === row.project_type);
  const strategies = FACULTY_STRATEGIES.filter((option) => option === source.strategyName);
  if (row.project_type && !characteristics.length) {
    warnings.push(
      `ประเภทคำของบ “${row.project_type}” ไม่ตรงกับลักษณะข้อเสนอโครงการ กรุณาเลือกลักษณะโครงการ`,
    );
  }
  if (source.strategyName && !strategies.length) {
    warnings.push(
      `กลยุทธ์ในคำของบ “${source.strategyName}” ไม่ตรงกับตัวเลือกของข้อเสนอ กรุณาเลือกกลยุทธ์`,
    );
  }
  const expenses = sourceExpenses(source, row.requested_amount, warnings);
  const subActivities = new Set(
    [source.subActivityName, ...expenses.map((item) => item.subActivityName ?? "")].filter(Boolean),
  );
  if (subActivities.size > 1) {
    warnings.push(
      "คำของบอ้างอิงรวมหลายกิจกรรมย่อย ระบบนำเข้าค่าใช้จ่ายทุกรายการโดยไม่แบ่งวงเงิน กรุณาตรวจสอบชื่อกิจกรรมย่อยและขอบเขตข้อเสนอ",
    );
  }
  if (expenses.length) {
    warnings.push(
      "คำของบระบุเฉพาะยอดรวมต่อรายการ ระบบตั้งอัตราเท่ากับยอดรวม และหน่วย จำนวน ครั้ง เป็น 1 เพื่อรักษาวงเงิน กรุณาตรวจสอบรายละเอียดการคำนวณ",
    );
  }
  const mapped = parseProjectProposalDetails({
    ...createEmptyProjectProposalDetails(),
    characteristics,
    projectHeadPosition: source.ownerPosition,
    responsiblePeople: source.projectMembers.map((member) => ({ ...member })),
    strategies,
    rationale: row.rationale,
    objectives: source.objectives,
    targetGroup: source.targetGroup,
    sdgs: SDG_OPTIONS.filter((option) => source.sdgs.includes(option)),
    sdgAlignmentDescription: source.alignmentDescription,
    outputCode: source.outputCode,
    outputName: source.outputName,
    operationalPlanCode: source.operationalPlanCode,
    operationalPlanName: source.operationalPlanName,
    activityCode: source.activityCode,
    projectActivityName: hasPlanHierarchy ? row.title_th : "",
    expenseItems: expenses.map((item) => ({
      category: item.expenseCategory,
      description: item.description,
      expenditureBudget: item.expenditureBudget,
      expenseSubcategory: item.expenseSubcategory,
      ...(item.subActivityName ? { subActivityName: item.subActivityName } : {}),
      ...(item.fundingSource ? { fundingSource: item.fundingSource } : {}),
      ...(item.fundingSourceDetail ? { fundingSourceDetail: item.fundingSourceDetail } : {}),
      ...(item.fundCode ? { fundCode: item.fundCode } : {}),
      ...(item.fundName ? { fundName: item.fundName } : {}),
      rate: item.amount,
      units: 1,
      quantity: 1,
      occurrences: 1,
      amount: item.amount,
    })),
    expectedResults: source.expectedBenefits,
  });
  if (!mapped.success) {
    return {
      success: false,
      error:
        "รายละเอียดคำของบไม่รองรับในแบบเสนอโครงการ ระบบยังไม่เปลี่ยนข้อมูล กรุณาติดต่อผู้ดูแลระบบ",
    };
  }
  if (
    Math.round(sumProjectExpenses(mapped.data) * 100) !== Math.round(row.requested_amount * 100)
  ) {
    warnings.push(
      "ยอดรวมรายละเอียดค่าใช้จ่ายไม่เท่ากับวงเงินคำของบอ้างอิง ระบบเก็บยอดตามรายการเดิม กรุณาตรวจสอบก่อนส่งข้อเสนอ",
    );
  }
  const retainedLabels = Object.entries(unrepresentedSourceFields)
    .filter(([field]) => source[field as keyof typeof unrepresentedSourceFields])
    .map(([, label]) => label);
  if (retainedLabels.length) {
    warnings.push(
      `ข้อมูลที่ยังไม่มีช่องตรงกันในข้อเสนอ (${retainedLabels.join(" / ")}) ยังคงอยู่ในคำของบอ้างอิง ไม่ได้แปลงหรือแทนค่าโดยอัตโนมัติ`,
    );
  }
  return {
    success: true,
    data: {
      budgetRequestId: row.id,
      code: row.code,
      title: source.subActivityName || row.title_th,
      organizationId: row.organization_id,
      fiscalYearId: row.fiscal_year_id,
      ownerName: row.owner_name,
      startsOn: source.startsOn,
      endsOn: source.endsOn,
      details: mapped.data,
      requestedAmount: row.requested_amount,
      warnings,
    },
  };
}
