import { INPUT_LIMITS } from "@/lib/config/limits";

export const BUDGET_PROJECT_TYPE_SUGGESTIONS = [
  "1 โครงการขับเคลื่อนกลยุทธ์",
  "2 โครงการประจำตามภารกิจ",
  "โครงการพัฒนาการเรียนการสอน",
  "วิจัยและนวัตกรรม",
  "บริการวิชาการ",
  "ครุภัณฑ์",
  "สิ่งก่อสร้าง",
] as const;

export const BUDGET_FUNDING_SOURCE_SUGGESTIONS = ["เงินรายได้", "เงินงบประมาณแผ่นดิน"] as const;

export const BUDGET_SDG_OPTIONS = [
  "SDG 4 การศึกษาที่มีคุณภาพ",
  "SDG 8 งานที่มีคุณค่าและการเติบโตทางเศรษฐกิจ",
  "SDG 9 อุตสาหกรรม นวัตกรรม และโครงสร้างพื้นฐาน",
] as const;

const textFields = {
  organizationCode: { label: "รหัสหน่วยงานย่อย", max: INPUT_LIMITS.shortText },
  fundingSource: { label: "แหล่งงบประมาณ", max: INPUT_LIMITS.shortText },
  fundingSourceDetail: { label: "แหล่งงบประมาณย่อย", max: INPUT_LIMITS.longText },
  missionName: { label: "ชื่อพันธกิจ", max: INPUT_LIMITS.title },
  universityStrategy: { label: "ยุทธศาสตร์มหาวิทยาลัย", max: INPUT_LIMITS.title },
  goalName: { label: "เป้าประสงค์", max: INPUT_LIMITS.title },
  strategyName: { label: "ชื่อกลยุทธ์", max: INPUT_LIMITS.title },
  fundCode: { label: "รหัสกองทุน", max: INPUT_LIMITS.shortText },
  fundName: { label: "กองทุน", max: INPUT_LIMITS.title },
  outputCode: { label: "รหัสผลผลิต/โครงการ", max: INPUT_LIMITS.shortText },
  outputName: { label: "ชื่อผลผลิต", max: INPUT_LIMITS.title },
  operationalPlanCode: { label: "รหัสแผนปฏิบัติการ", max: INPUT_LIMITS.shortText },
  operationalPlanName: { label: "ชื่อแผนปฏิบัติการ", max: INPUT_LIMITS.title },
  activityCode: { label: "รหัสโครงการ/กิจกรรม", max: INPUT_LIMITS.shortText },
  subActivityName: { label: "ชื่อกิจกรรมย่อย", max: INPUT_LIMITS.title },
  msdsId: { label: "MSDS ID", max: INPUT_LIMITS.shortText },
  expenseSubcategory: { label: "หมวดรายจ่ายย่อย", max: INPUT_LIMITS.title },
  expenseDescription: { label: "รายละเอียดรายการค่าใช้จ่าย", max: INPUT_LIMITS.longText },
  spendingPlanName: { label: "ชื่อแผนค่าใช้จ่าย", max: INPUT_LIMITS.title },
  targetGroup: { label: "กลุ่มเป้าหมาย", max: INPUT_LIMITS.longText },
  startsOn: { label: "วันที่เริ่ม", max: 10 },
  endsOn: { label: "วันที่สิ้นสุด", max: 10 },
  expectedBenefits: { label: "ประโยชน์ที่คาดว่าจะได้รับ", max: INPUT_LIMITS.longText },
  reviewerName: { label: "ผู้เห็นชอบโครงการ", max: INPUT_LIMITS.personName },
  approverName: { label: "ผู้อนุมัติโครงการ", max: INPUT_LIMITS.personName },
  objectives: { label: "วัตถุประสงค์", max: INPUT_LIMITS.longText },
  ownerPosition: { label: "ตำแหน่งผู้รับผิดชอบโครงการ", max: INPUT_LIMITS.title },
  reviewerPosition: { label: "ตำแหน่งผู้เห็นชอบโครงการ", max: INPUT_LIMITS.title },
  approverPosition: { label: "ตำแหน่งผู้อนุมัติโครงการ", max: INPUT_LIMITS.title },
  alignmentDescription: { label: "คำอธิบายความสอดคล้อง", max: INPUT_LIMITS.longText },
  successIndicators: { label: "ตัวชี้วัดความสำเร็จ", max: INPUT_LIMITS.longText },
} as const;

export type BudgetProposalTextField = keyof typeof textFields;
export type BudgetProposalDetails = Record<BudgetProposalTextField, string> & {
  sdgs: string[];
};

export function createEmptyBudgetProposalDetails(): BudgetProposalDetails {
  return {
    organizationCode: "",
    fundingSource: "",
    fundingSourceDetail: "",
    missionName: "",
    universityStrategy: "",
    goalName: "",
    strategyName: "",
    fundCode: "",
    fundName: "",
    outputCode: "",
    outputName: "",
    operationalPlanCode: "",
    operationalPlanName: "",
    activityCode: "",
    subActivityName: "",
    msdsId: "",
    expenseSubcategory: "",
    expenseDescription: "",
    spendingPlanName: "",
    targetGroup: "",
    startsOn: "",
    endsOn: "",
    expectedBenefits: "",
    reviewerName: "",
    approverName: "",
    objectives: "",
    ownerPosition: "",
    reviewerPosition: "",
    approverPosition: "",
    alignmentDescription: "",
    successIndicators: "",
    sdgs: [],
  };
}

type BudgetProposalDetailsParseResult =
  | { success: true; data: BudgetProposalDetails }
  | { success: false; errors: Record<string, string[]> };

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export function parseBudgetProposalDetails(input: unknown): BudgetProposalDetailsParseResult {
  let value = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {
        success: false,
        errors: { proposalDetails: ["ข้อมูลรายละเอียดคำขอไม่ถูกต้อง กรุณาเปิดแบบฟอร์มใหม่"] },
      };
    }
  }
  if (value === null || value === undefined) {
    return { success: true, data: createEmptyBudgetProposalDetails() };
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return {
      success: false,
      errors: { proposalDetails: ["ข้อมูลรายละเอียดคำขอไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง"] },
    };
  }

  const source = value as Record<string, unknown>;
  const details = createEmptyBudgetProposalDetails();
  const errors: Record<string, string[]> = {};
  for (const [field, config] of Object.entries(textFields) as [
    BudgetProposalTextField,
    (typeof textFields)[BudgetProposalTextField],
  ][]) {
    const raw = source[field];
    if (raw === null || raw === undefined) continue;
    if (typeof raw !== "string") {
      errors[`proposalDetails.${field}`] = [`${config.label}ต้องเป็นข้อความ`];
      continue;
    }
    const text = raw.trim();
    if (text.length > config.max) {
      errors[`proposalDetails.${field}`] = [
        `${config.label}ต้องไม่เกิน ${config.max.toLocaleString("th-TH")} ตัวอักษร`,
      ];
      continue;
    }
    details[field] = text;
  }

  const rawSdgs = source.sdgs;
  if (rawSdgs !== undefined && rawSdgs !== null) {
    if (
      !Array.isArray(rawSdgs) ||
      rawSdgs.some(
        (item) => typeof item !== "string" || !BUDGET_SDG_OPTIONS.some((option) => option === item),
      )
    ) {
      errors["proposalDetails.sdgs"] = ["รายการ SDGs ไม่ถูกต้อง กรุณาเลือกใหม่"];
    } else {
      details.sdgs = [...new Set(rawSdgs)];
    }
  }

  for (const field of ["startsOn", "endsOn"] as const) {
    if (details[field] && !isIsoDate(details[field])) {
      errors[`proposalDetails.${field}`] = [`${textFields[field].label}ไม่ถูกต้อง`];
    }
  }
  if (details.startsOn && details.endsOn && details.startsOn > details.endsOn) {
    errors["proposalDetails.endsOn"] = ["วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม"];
  }

  return Object.keys(errors).length > 0
    ? { success: false, errors }
    : { success: true, data: details };
}
