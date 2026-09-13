import { z } from "zod";
import { INPUT_LIMITS } from "@/lib/config/limits";
import { SDG_OPTIONS } from "@/features/shared/sdgs";

export const PROJECT_CHARACTERISTICS = [
  "การพัฒนาการจัดการเรียนการสอน หรือนักศึกษา",
  "การจัดอบรมเชิงปฏิบัติการ/จัดประชุม/อบรม/สัมมนา",
  "การหารายได้ของคณะรัฐศาสตร์",
  "ส่งเสริมหรือสนับสนุนการบริหารงานทั่วไป",
] as const;

export const FACULTY_STRATEGIES = [
  "กลยุทธ์ที่ 1 : พัฒนาหลักสูตรใหม่ และจัดการศึกษาสำหรับทุกช่วงวัย ให้มีสมรรถนะที่ตอบสนองความต้องการของสังคม",
  "กลยุทธ์ที่ 2 : พัฒนาระบบนิเวศการเรียนรู้และวิจัยที่ทันสมัยเพื่อให้ทันต่อการเปลี่ยนแปลง",
  "กลยุทธ์ที่ 3 : ยกระดับผลลัพธ์ด้านวิจัยและนวัตกรรมทางสังคมที่ตอบสนองต่อการพัฒนาคุณภาพชีวิต",
  "กลยุทธ์ที่ 4 : บริการวิชาการเพื่อสร้างความยั่งยืน",
  "กลยุทธ์ที่ 5 : พัฒนาระบบบริหารจัดการในการทำงานเพื่อมุ่งสู่องค์กรสมรรถนะสูง",
] as const;

export const EXPENSE_CATEGORIES = ["ค่าตอบแทน", "ค่าใช้สอย", "ค่าวัสดุ"] as const;
export const EFFICIENCY_CHECKS = [
  { value: "completed", label: "ดำเนินโครงการเสร็จตามแผน" },
  { value: "paid_30_days", label: "เบิกจ่ายภายใน 30 วันหลังเสร็จสิ้นโครงการ" },
  { value: "reported_15_days", label: "ส่งรายงานผลภายใน 15 วันหลังเสร็จสิ้นโครงการ" },
] as const;
export const FISCAL_MONTHS = [
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
] as const;

const MAX_PROJECT_EXPENSE_AMOUNT = 999_999_999_999;
const MAX_PROJECT_EXPENSE_FACTOR = 999_999;

export type ProjectExpenseCalculation = {
  rate: number;
  units: number;
  quantity: number;
  occurrences: number;
};

export function calculateProjectExpenseAmount(item: ProjectExpenseCalculation): number {
  const amount = item.rate * item.units * item.quantity * item.occurrences;
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) / 100 : 0;
}

const text = (max: number = INPUT_LIMITS.longText) => z.string().trim().max(max);
const expenseFactor = z.number().finite().int().min(0).max(MAX_PROJECT_EXPENSE_FACTOR);
const expenseItemSchema = z
  .object({
    category: z.enum(EXPENSE_CATEGORIES),
    description: text(INPUT_LIMITS.title),
    rate: z.number().finite().min(0).max(MAX_PROJECT_EXPENSE_AMOUNT),
    units: expenseFactor,
    quantity: expenseFactor,
    occurrences: expenseFactor,
    amount: z.number().finite().min(0).max(MAX_PROJECT_EXPENSE_AMOUNT),
  })
  .superRefine((item, context) => {
    if (calculateProjectExpenseAmount(item) > MAX_PROJECT_EXPENSE_AMOUNT) {
      context.addIssue({
        code: "custom",
        path: ["amount"],
        message: "จำนวนเงินรวมต้องไม่เกิน 999,999,999,999 บาท",
      });
    }
  });
const proposalSchema = z.object({
  characteristics: z.array(z.enum(PROJECT_CHARACTERISTICS)).max(PROJECT_CHARACTERISTICS.length),
  otherCharacteristic: text(INPUT_LIMITS.title),
  projectHeadPosition: text(INPUT_LIMITS.title),
  responsiblePeople: z
    .array(
      z.object({
        name: text(INPUT_LIMITS.personName),
        position: text(INPUT_LIMITS.title),
      }),
    )
    .max(50),
  strategies: z.array(z.enum(FACULTY_STRATEGIES)).max(FACULTY_STRATEGIES.length),
  goalIndicators: z
    .array(
      z.object({
        goal: text(INPUT_LIMITS.title),
        longTermIndicator: text(INPUT_LIMITS.title),
        actionIndicator: text(INPUT_LIMITS.title),
        unit: text(INPUT_LIMITS.shortText),
        target: text(INPUT_LIMITS.shortText),
      }),
    )
    .max(30),
  continuity: z.enum(["new", "continuing"]),
  previousSuccess: text(),
  efficiencyChecks: z.array(z.enum(["completed", "paid_30_days", "reported_15_days"])).max(3),
  rationale: text(),
  objectives: text(),
  targetGroup: text(),
  sdgs: z.array(z.enum(SDG_OPTIONS)).max(SDG_OPTIONS.length),
  sdgAlignmentDescription: text(),
  startWeek: z.number().int().min(1).max(4).nullable(),
  endWeek: z.number().int().min(1).max(4).nullable(),
  actionPlan: z
    .array(
      z.object({
        description: text(INPUT_LIMITS.title),
        months: z.array(z.number().int().min(0).max(11)).max(12),
      }),
    )
    .max(40),
  location: text(INPUT_LIMITS.title),
  expenseItems: z.array(expenseItemSchema).max(100),
  expectedResults: text(),
  processIndicator: text(),
  outputIndicator: text(),
});

export type ProjectProposalDetails = z.infer<typeof proposalSchema>;
export type ProjectProposalParseResult =
  | { success: true; data: ProjectProposalDetails }
  | { success: false; errors: Record<string, string[]> };

export function createEmptyProjectExpenseItem(): ProjectProposalDetails["expenseItems"][number] {
  return {
    category: "ค่าตอบแทน",
    description: "",
    rate: 0,
    units: 0,
    quantity: 0,
    occurrences: 0,
    amount: 0,
  };
}

export function createEmptyProjectProposalDetails(): ProjectProposalDetails {
  return {
    characteristics: [],
    otherCharacteristic: "",
    projectHeadPosition: "",
    responsiblePeople: [],
    strategies: [],
    goalIndicators: [],
    continuity: "new",
    previousSuccess: "",
    efficiencyChecks: [],
    rationale: "",
    objectives: "",
    targetGroup: "",
    sdgs: [],
    sdgAlignmentDescription: "",
    startWeek: null,
    endWeek: null,
    actionPlan: [],
    location: "",
    expenseItems: [],
    expectedResults: "",
    processIndicator: "",
    outputIndicator: "",
  };
}

export function parseProjectProposalDetails(input: unknown): ProjectProposalParseResult {
  let source = input;
  if (typeof input === "string") {
    try {
      source = JSON.parse(input) as unknown;
    } catch {
      return {
        success: false,
        errors: { proposalDetails: ["รายละเอียดแบบเสนอโครงการไม่ถูกต้อง"] },
      };
    }
  }
  if (source && typeof source === "object" && !Array.isArray(source)) {
    const record = source as Record<string, unknown>;
    const expenseItems = Array.isArray(record.expenseItems)
      ? record.expenseItems.map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return item;
          const expense = item as Record<string, unknown>;
          const legacyAmount = typeof expense.amount === "number" ? expense.amount : 0;
          const hasCalculation = ["rate", "units", "quantity", "occurrences"].some(
            (key) => key in expense,
          );
          return {
            ...expense,
            rate: hasCalculation ? expense.rate : legacyAmount,
            units: hasCalculation ? expense.units : legacyAmount > 0 ? 1 : 0,
            quantity: hasCalculation ? expense.quantity : legacyAmount > 0 ? 1 : 0,
            occurrences: hasCalculation ? expense.occurrences : legacyAmount > 0 ? 1 : 0,
          };
        })
      : record.expenseItems === undefined
        ? []
        : record.expenseItems;
    source = { ...createEmptyProjectProposalDetails(), ...record, expenseItems };
  }
  const parsed = proposalSchema.safeParse(source ?? createEmptyProjectProposalDetails());
  if (parsed.success) {
    return {
      success: true,
      data: {
        ...parsed.data,
        expenseItems: parsed.data.expenseItems.map((item) => ({
          ...item,
          amount: calculateProjectExpenseAmount(item),
        })),
      },
    };
  }
  const errors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.length ? `proposalDetails.${issue.path.join(".")}` : "proposalDetails";
    (errors[key] ??= []).push(issue.message);
  }
  return { success: false, errors };
}

export function sumProjectExpenses(details: ProjectProposalDetails): number {
  return (
    details.expenseItems.reduce(
      (sum, item) => sum + Math.round(calculateProjectExpenseAmount(item) * 100),
      0,
    ) / 100
  );
}

export function deriveProjectType(details: ProjectProposalDetails): string {
  return details.characteristics[0] ?? (details.otherCharacteristic || "โครงการทั่วไป");
}

export function validateProjectProposalForSubmission(
  details: ProjectProposalDetails,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const requireText = (key: keyof ProjectProposalDetails, message: string) => {
    const value = details[key];
    if (typeof value === "string" && value.length < 2) errors[`proposalDetails.${key}`] = [message];
  };
  if (!details.characteristics.length && !details.otherCharacteristic)
    errors["proposalDetails.characteristics"] = ["กรุณาเลือกลักษณะโครงการอย่างน้อย 1 รายการ"];
  if (!details.strategies.length)
    errors["proposalDetails.strategies"] = ["กรุณาเลือกกลยุทธ์อย่างน้อย 1 รายการ"];
  requireText("rationale", "กรุณาระบุหลักการและเหตุผล");
  requireText("objectives", "กรุณาระบุวัตถุประสงค์");
  requireText("targetGroup", "กรุณาระบุกลุ่มเป้าหมาย");
  requireText("location", "กรุณาระบุสถานที่ดำเนินการ");
  requireText("expectedResults", "กรุณาระบุผลที่คาดว่าจะได้รับ");
  requireText("processIndicator", "กรุณาระบุตัวชี้วัดระดับกระบวนการ");
  requireText("outputIndicator", "กรุณาระบุตัวชี้วัดระดับผลผลิต");
  if (!details.sdgs.length)
    errors["proposalDetails.sdgs"] = ["กรุณาเลือกเป้าหมาย SDG อย่างน้อย 1 เป้าหมาย"];
  requireText("sdgAlignmentDescription", "กรุณาอธิบายความเชื่อมโยงกับ SDG ที่เลือก");
  if (details.startWeek === null)
    errors["proposalDetails.startWeek"] = ["กรุณาเลือกสัปดาห์เริ่มต้น"];
  if (details.endWeek === null) errors["proposalDetails.endWeek"] = ["กรุณาเลือกสัปดาห์สิ้นสุด"];
  if (
    !details.goalIndicators.some(
      (item) => item.goal && item.actionIndicator && item.unit && item.target,
    )
  )
    errors["proposalDetails.goalIndicators"] = [
      "กรุณาระบุเป้าประสงค์ ตัววัด หน่วย และค่าเป้าหมายอย่างน้อย 1 รายการ",
    ];
  if (!details.actionPlan.some((item) => item.description && item.months.length))
    errors["proposalDetails.actionPlan"] = ["กรุณาเพิ่มแผนปฏิบัติการและเลือกเดือนดำเนินงาน"];
  if (sumProjectExpenses(details) <= 0)
    errors["proposalDetails.expenseItems"] = ["กรุณาเพิ่มรายละเอียดงบประมาณมากกว่า 0 บาท"];
  details.expenseItems.forEach((item, index) => {
    const prefix = `proposalDetails.expenseItems.${index}`;
    if (!item.description)
      errors[`proposalDetails.expenseItems.${index}.description`] = [
        "กรุณาระบุรายละเอียดรายการค่าใช้จ่าย",
      ];
    if (item.rate <= 0) errors[`${prefix}.rate`] = ["กรุณาระบุอัตรามากกว่า 0 บาท"];
    if (item.units <= 0) errors[`${prefix}.units`] = ["กรุณาระบุหน่วยมากกว่า 0"];
    if (item.quantity <= 0) errors[`${prefix}.quantity`] = ["กรุณาระบุจำนวนมากกว่า 0"];
    if (item.occurrences <= 0) errors[`${prefix}.occurrences`] = ["กรุณาระบุครั้งมากกว่า 0"];
  });
  details.responsiblePeople.forEach((person, index) => {
    if (person.position && !person.name)
      errors[`proposalDetails.responsiblePeople.${index}.name`] = ["กรุณาระบุชื่อผู้รับผิดชอบ"];
  });
  if (details.continuity === "continuing" && !details.previousSuccess)
    errors["proposalDetails.previousSuccess"] = ["กรุณาสรุปผลสำเร็จของโครงการในปีที่ผ่านมา"];
  return errors;
}
