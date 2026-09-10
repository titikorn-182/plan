import { INPUT_LIMITS } from "@/lib/config/limits";
import {
  BUDGET_REQUEST_FUNDING_SOURCE_OPTIONS,
  BUDGET_REQUEST_PROJECT_TYPE_OPTIONS,
} from "@/features/budget-requests/source-options";
import {
  parseBudgetRequestExpenseItems,
  type BudgetRequestExpenseItem,
} from "@/features/budget-requests/expense-items";

export const BUDGET_PROJECT_TYPE_SUGGESTIONS = BUDGET_REQUEST_PROJECT_TYPE_OPTIONS;

export const BUDGET_FUNDING_SOURCE_SUGGESTIONS = BUDGET_REQUEST_FUNDING_SOURCE_OPTIONS;

export const BUDGET_ORGANIZATION_CODE_OPTIONS = [
  { value: "2301", label: "สำนักงานเลขานุการคณะ" },
  { value: "2302", label: "ภาควิชาการเมืองและความสัมพันธ์ระหว่างประเทศ" },
  { value: "2303", label: "ภาควิชารัฐประศาสนศาสตร์" },
] as const;

export const BUDGET_FUND_OPTIONS = [
  { code: "1", name: "กองทุนบริหาร" },
  { code: "2", name: "กองทุนจัดการศึกษา" },
  { code: "3", name: "กองทุนวิจัย" },
  { code: "4", name: "กองทุนบริการวิชาการ" },
  { code: "6", name: "กองทุนพัฒนาบุคลากร" },
  { code: "7", name: "กองทุนสินทรัพย์ถาวร" },
  { code: "8", name: "กองทุนกิจการนักศึกษา" },
  { code: "15", name: "กองทุนบุคลากร" },
] as const;

export const BUDGET_SDG_OPTIONS = [
  "SDG 1 ขจัดความยากจน",
  "SDG 2 ขจัดความหิวโหย",
  "SDG 3 การมีสุขภาพและความเป็นอยู่ที่ดี",
  "SDG 4 การศึกษาที่มีคุณภาพ",
  "SDG 5 ความเท่าเทียมทางเพศ",
  "SDG 6 น้ำสะอาดและสุขาภิบาล",
  "SDG 7 พลังงานสะอาดและจ่ายได้",
  "SDG 8 งานที่มีคุณค่าและเศรษฐกิจที่เติบโต",
  "SDG 9 อุตสาหกรรม นวัตกรรม โครงสร้างพื้นฐาน",
  "SDG 10 ลดความเหลื่อมล้ำ",
  "SDG 11 เมืองและชุมชนยั่งยืน",
  "SDG 12 การผลิตและบริโภคที่รับผิดชอบ",
  "SDG 13 การรับมือกับ Climate Change",
  "SDG 14 นิเวศทางทะเลและมหาสมุทร",
  "SDG 15 ระบบนิเวศบนบก",
  "SDG 16 สันติภาพและสถาบันเข้มแข็ง",
  "SDG 17 หุ้นส่วนเพื่อการพัฒนา",
] as const;

const LEGACY_BUDGET_SDG_LABELS: Readonly<Record<string, (typeof BUDGET_SDG_OPTIONS)[number]>> = {
  "SDG 8 งานที่มีคุณค่าและการเติบโตทางเศรษฐกิจ": "SDG 8 งานที่มีคุณค่าและเศรษฐกิจที่เติบโต",
  "SDG 9 อุตสาหกรรม นวัตกรรม และโครงสร้างพื้นฐาน": "SDG 9 อุตสาหกรรม นวัตกรรม โครงสร้างพื้นฐาน",
};

const textFields = {
  organizationCode: { label: "รหัสหน่วยงานย่อย", max: INPUT_LIMITS.shortText },
  organizationName: { label: "ชื่อหน่วยงานย่อย", max: INPUT_LIMITS.title },
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
  expenditureBudget: { label: "งบรายจ่าย", max: INPUT_LIMITS.title },
  expenseCategory: { label: "หมวดรายจ่าย", max: INPUT_LIMITS.title },
  expenseSubcategory: { label: "หมวดรายจ่ายย่อย", max: INPUT_LIMITS.title },
  expenseDescription: { label: "รายละเอียดรายการค่าใช้จ่าย", max: INPUT_LIMITS.longText },
  msdsId: { label: "MSDS ID", max: INPUT_LIMITS.shortText },
  spendingPlanName: { label: "ชื่อแผนค่าใช้จ่าย", max: INPUT_LIMITS.title },
  spendingPlanTotal: { label: "ยอดรวมแผนค่าใช้จ่าย", max: INPUT_LIMITS.shortText },
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
  expenseItems: BudgetRequestExpenseItem[];
  sdgs: string[];
};

export function createEmptyBudgetProposalDetails(): BudgetProposalDetails {
  return {
    organizationCode: "",
    organizationName: "",
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
    expenditureBudget: "",
    expenseCategory: "",
    expenseSubcategory: "",
    expenseDescription: "",
    msdsId: "",
    spendingPlanName: "",
    spendingPlanTotal: "",
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
    expenseItems: [],
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
    const normalizedSdgs = Array.isArray(rawSdgs)
      ? rawSdgs.map((item) =>
          typeof item === "string" ? (LEGACY_BUDGET_SDG_LABELS[item] ?? item) : item,
        )
      : rawSdgs;
    if (
      !Array.isArray(normalizedSdgs) ||
      normalizedSdgs.some(
        (item) => typeof item !== "string" || !BUDGET_SDG_OPTIONS.some((option) => option === item),
      )
    ) {
      errors["proposalDetails.sdgs"] = ["รายการ SDGs ไม่ถูกต้อง กรุณาเลือกใหม่"];
    } else {
      details.sdgs = [...new Set(normalizedSdgs)];
    }
  }

  const expenseItems = parseBudgetRequestExpenseItems(source.expenseItems);
  if (!expenseItems.success) {
    Object.assign(errors, expenseItems.errors);
  } else {
    details.expenseItems = expenseItems.data;
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
