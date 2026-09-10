import {
  createEmptyBudgetProposalDetails,
  type BudgetProposalDetails,
  type BudgetProposalTextField,
} from "@/features/budget-requests/proposal-details";
import { getBudgetRequestOrganizationSourceCode } from "@/features/budget-requests/organization-options";

export const BUDGET_REQUEST_IMPORT_COLUMNS = [
  { key: "organizationCode", header: "รหัสหน่วยงานย่อย" },
  { key: "organizationName", header: "ชื่อหน่วยงานย่อย" },
  { key: "fundingSource", header: "แหล่งงบประมาณ" },
  { key: "fundingSourceDetail", header: "แหล่งงบประมาณย่อย" },
  { key: "projectType", header: "ประเภทโครงการ" },
  { key: "missionName", header: "ชื่อพันธกิจ" },
  { key: "strategyName", header: "ชื่อกลยุทธ์" },
  { key: "fundCode", header: "รหัสกองทุน" },
  { key: "fundName", header: "กองทุน" },
  { key: "outputCode", header: "รหัสผลผลิต/โครงการ =งาน/โครงการ (4 หลัก)" },
  { key: "outputName", header: "ชื่อผลผลิต = งาน/โครงการ (4 หลัก)" },
  { key: "operationalPlanCode", header: "รหัสแผนปฏิบัติการ = โครงการย่อย (8 หลัก)" },
  { key: "operationalPlanName", header: "ชื่อแผนปฏิบัติการ = โครงการย่อย (8 หลัก)" },
  { key: "activityCode", header: "รหัสโครงการ/กิจกรรม = กิจกรรม (12 หลัก)" },
  { key: "projectActivityName", header: "ชื่อโครงการกิจกรรม = กิจกรรม/โครงการ (12 หลัก)" },
  { key: "subActivityName", header: "ชื่อกิจกรรมย่อยภายใต้โครงการ 12 หลัก" },
  { key: "expenditureBudget", header: "งบรายจ่าย" },
  { key: "expenseCategory", header: "หมวดรายจ่าย" },
  { key: "expenseSubcategory", header: "หมวดรายจ่ายย่อย" },
  { key: "expenseDescription", header: "รายละเอียดรายการค่าใช้จ่าย" },
  { key: "totalBudget", header: "งบประมาณรวมทั้งหมด" },
  { key: "ownerName", header: "ผู้รับผิดชอบ" },
  { key: "msdsId", header: "msds_id" },
  { key: "spendingPlanName", header: "ชื่อแผนค่าใช้จ่าย" },
  { key: "spendingPlanTotal", header: "ยอดรวมแผนค่าใช้จ่าย" },
  { key: "targetGroup", header: "กลุ่มเป้าหมาย" },
  { key: "rationale", header: "หลักการและเหตุผล" },
  { key: "startsOn", header: "วันที่เริ่ม" },
  { key: "endsOn", header: "วันที่สิ้นสุด" },
  { key: "expectedBenefits", header: "ประโยชน์ที่คาดว่าจะได้รับ" },
  { key: "reviewerName", header: "ผู้เห็นชอบโครงการ" },
  { key: "approverName", header: "ผู้อนุมัติโครงการ" },
  { key: "objectives", header: "วัตถุประสงค์" },
  { key: "ownerPosition", header: "ตำแหน่งผู้รับผิดชอบโครงการ" },
  { key: "reviewerPosition", header: "ตำแหน่งผู้เห็นชอบโครงการ" },
  { key: "approverPosition", header: "ตำแหน่งผู้อนุมัติโครงการ" },
] as const;

export type BudgetRequestSourceKey = (typeof BUDGET_REQUEST_IMPORT_COLUMNS)[number]["key"];
export type BudgetRequestSourceValues = Record<BudgetRequestSourceKey, string>;

export type BudgetRequestSourceField = {
  key: BudgetRequestSourceKey;
  header: string;
  control?:
    | "currency"
    | "date"
    | "fund"
    | "organization"
    | "organization-name"
    | "source-select"
    | "textarea";
  help?: string;
  maxLength?: number;
  proposalField?: BudgetProposalTextField;
  required?: boolean;
};

export type BudgetRequestSourceSection = {
  id: string;
  title: string;
  description: string;
  fields: readonly BudgetRequestSourceField[];
};

const byKey = new Map(BUDGET_REQUEST_IMPORT_COLUMNS.map((column) => [column.key, column.header]));
const shortTextKeys = new Set<BudgetRequestSourceKey>([
  "organizationCode",
  "fundingSource",
  "fundCode",
  "outputCode",
  "operationalPlanCode",
  "activityCode",
  "msdsId",
]);
const personNameKeys = new Set<BudgetRequestSourceKey>([
  "ownerName",
  "reviewerName",
  "approverName",
]);

function field(
  key: BudgetRequestSourceKey,
  config: Omit<BudgetRequestSourceField, "key" | "header"> = {},
): BudgetRequestSourceField {
  const maxLength = shortTextKeys.has(key) ? 120 : personNameKeys.has(key) ? 180 : 300;
  return { key, header: byKey.get(key) ?? key, maxLength, ...config };
}

export const BUDGET_REQUEST_SOURCE_SECTIONS: readonly BudgetRequestSourceSection[] = [
  {
    id: "source",
    title: "หน่วยงานและแหล่งงบประมาณ",
    description: "ระบุปีงบประมาณ หน่วยงาน แหล่งเงิน พันธกิจ และกองทุนให้ตรงกับข้อมูลต้นทาง",
    fields: [
      field("organizationCode", {
        control: "organization",
        proposalField: "organizationCode",
        required: true,
      }),
      field("organizationName", {
        control: "organization-name",
        help: "เลือกหน่วยงานย่อยจากรายการที่กำหนด ระบบจะจับคู่รหัสหน่วยงานให้อัตโนมัติ",
        proposalField: "organizationName",
        required: true,
      }),
      field("fundingSource", { control: "source-select", proposalField: "fundingSource" }),
      field("fundingSourceDetail", {
        control: "source-select",
        proposalField: "fundingSourceDetail",
      }),
      field("projectType", { control: "source-select", required: true }),
      field("missionName", { control: "source-select", proposalField: "missionName" }),
      field("strategyName", { control: "source-select", proposalField: "strategyName" }),
      field("fundCode", { control: "fund", proposalField: "fundCode" }),
    ],
  },
  {
    id: "plan",
    title: "โครงสร้างแผนและกิจกรรม",
    description: "เชื่อมรหัสและชื่อจากระดับผลผลิตลงมาถึงกิจกรรมย่อยเพื่อให้รายงานย้อนกลับได้",
    fields: [
      field("outputCode", { control: "source-select", proposalField: "outputCode" }),
      field("outputName", { control: "source-select", proposalField: "outputName" }),
      field("operationalPlanCode", {
        control: "source-select",
        proposalField: "operationalPlanCode",
      }),
      field("operationalPlanName", {
        control: "source-select",
        proposalField: "operationalPlanName",
      }),
      field("activityCode", { control: "source-select", proposalField: "activityCode" }),
      field("projectActivityName", { control: "source-select", required: true }),
      field("subActivityName", { proposalField: "subActivityName" }),
    ],
  },
  {
    id: "budget",
    title: "งบประมาณและแผนค่าใช้จ่าย",
    description: "เก็บประเภทงบ รายการค่าใช้จ่าย และยอดเงินตามคอลัมน์ต้นทางโดยไม่เปลี่ยนความหมาย",
    fields: [
      field("expenditureBudget", {
        control: "source-select",
        proposalField: "expenditureBudget",
      }),
      field("expenseCategory", { control: "source-select", proposalField: "expenseCategory" }),
      field("expenseSubcategory", {
        control: "source-select",
        proposalField: "expenseSubcategory",
      }),
      field("expenseDescription", {
        control: "textarea",
        maxLength: 5_000,
        proposalField: "expenseDescription",
      }),
      field("totalBudget", {
        control: "currency",
        help: "วงเงินนี้ใช้เป็นยอดคำของบประมาณที่ส่งเข้าสู่ระบบ",
      }),
    ],
  },
  {
    id: "outcomes",
    title: "เป้าหมาย เหตุผล และระยะเวลา",
    description: "อธิบายเหตุผล กลุ่มเป้าหมาย ผลที่คาดว่าจะได้รับ และกรอบเวลาของโครงการ",
    fields: [
      field("targetGroup", { control: "textarea", maxLength: 5_000, proposalField: "targetGroup" }),
      field("rationale", { control: "textarea", maxLength: 5_000 }),
      field("startsOn", { control: "date", proposalField: "startsOn" }),
      field("endsOn", { control: "date", proposalField: "endsOn" }),
      field("expectedBenefits", {
        control: "textarea",
        maxLength: 5_000,
        proposalField: "expectedBenefits",
      }),
      field("objectives", {
        control: "textarea",
        maxLength: 5_000,
        proposalField: "objectives",
      }),
    ],
  },
  {
    id: "approval",
    title: "ผู้รับผิดชอบและสายการอนุมัติ",
    description: "ระบุชื่อและตำแหน่งของผู้รับผิดชอบ ผู้เห็นชอบ และผู้อนุมัติตามข้อมูลโครงการ",
    fields: [
      field("ownerName", { required: true }),
      field("ownerPosition", { proposalField: "ownerPosition" }),
      field("reviewerName", { proposalField: "reviewerName" }),
      field("reviewerPosition", { proposalField: "reviewerPosition" }),
      field("approverName", { proposalField: "approverName" }),
      field("approverPosition", { proposalField: "approverPosition" }),
    ],
  },
];

export const BUDGET_REQUEST_IMPORT_HEADERS = BUDGET_REQUEST_IMPORT_COLUMNS.map(
  (column) => column.header,
);

export const BUDGET_REQUEST_SOURCE_FIELD_MAP = new Map(
  BUDGET_REQUEST_SOURCE_SECTIONS.flatMap((section) => section.fields).map((sourceField) => [
    sourceField.key,
    sourceField,
  ]),
);

export const BUDGET_REQUEST_SOURCE_FIELD_COUNT = BUDGET_REQUEST_SOURCE_FIELD_MAP.size;

export function createEmptyBudgetRequestSourceValues(): BudgetRequestSourceValues {
  return Object.fromEntries(
    BUDGET_REQUEST_IMPORT_COLUMNS.map((column) => [column.key, ""]),
  ) as BudgetRequestSourceValues;
}

export function getBudgetRequestSourceCompletion(values: BudgetRequestSourceValues): number {
  return [...BUDGET_REQUEST_SOURCE_FIELD_MAP.keys()].filter((key) => values[key].trim()).length;
}

export function isBudgetRequestOrganizationCompatible(code: string, organizationName: string) {
  return getBudgetRequestOrganizationSourceCode(organizationName) === code;
}

export function toBudgetProposalDetails(values: BudgetRequestSourceValues): BudgetProposalDetails {
  return {
    ...createEmptyBudgetProposalDetails(),
    organizationCode: values.organizationCode,
    organizationName: values.organizationName,
    fundingSource: values.fundingSource,
    fundingSourceDetail: values.fundingSourceDetail,
    missionName: values.missionName,
    strategyName: values.strategyName,
    fundCode: values.fundCode,
    fundName: values.fundName,
    outputCode: values.outputCode,
    outputName: values.outputName,
    operationalPlanCode: values.operationalPlanCode,
    operationalPlanName: values.operationalPlanName,
    activityCode: values.activityCode,
    subActivityName: values.subActivityName,
    expenditureBudget: values.expenditureBudget,
    expenseCategory: values.expenseCategory,
    expenseSubcategory: values.expenseSubcategory,
    expenseDescription: values.expenseDescription,
    msdsId: values.msdsId,
    spendingPlanName: values.spendingPlanName,
    spendingPlanTotal: values.spendingPlanTotal,
    targetGroup: values.targetGroup,
    startsOn: values.startsOn,
    endsOn: values.endsOn,
    expectedBenefits: values.expectedBenefits,
    reviewerName: values.reviewerName,
    approverName: values.approverName,
    objectives: values.objectives,
    ownerPosition: values.ownerPosition,
    reviewerPosition: values.reviewerPosition,
    approverPosition: values.approverPosition,
  };
}
