import {
  getExpenditureBudgetOptions,
  type FiscalYearMasterData,
} from "@/features/shared/master-data";

export const BUDGET_REQUEST_FUNDING_SOURCE_OPTIONS = [
  "งบประมาณเงินรายได้",
  "งบประมาณแผ่นดิน",
] as const;

export const BUDGET_REQUEST_FUNDING_SOURCE_DETAIL_OPTIONS = [
  "รายได้จากแหล่งอื่นฯ ด้านการบริการวิชาการ (รายได้จากการให้บริการวิชาการ)",
  "รายได้จากแหล่งอื่นฯ ด้านการวิจัย (รายได้จากแหล่งทุนวิจัยภายนอก)",
  "รายได้จากแหล่งอื่นฯ ด้านการหารายได้จากแหล่งอื่นๆ (รายได้จากการรับบริจาคและการจัดกิจกรรมเพื่อหารายได้)",
  "เงินรายได้จากค่าธรรมเนียมการศึกษา",
  "เงินรายได้เหลือจ่ายสะสม (ที่อยู่มหาวิทยาลัย)",
] as const;

export const BUDGET_REQUEST_PROJECT_TYPE_OPTIONS = [
  "1 โครงการขับเคลื่อนกลยุทธ์",
  "2 โครงการประจำตามภารกิจ",
] as const;

export const BUDGET_REQUEST_MISSION_OPTIONS = [
  "พันธกิจที่ 1 ด้านการผลิตบัณฑิต",
  "พันธกิจที่ 2 ด้านการวิจัยและนวัตกรรม",
  "พันธกิจที่ 3 ด้านการบริการวิชาการ",
  "พันธกิจที่ 5 การบริหารจัดการองค์กร",
] as const;

export const BUDGET_REQUEST_STRATEGY_OPTIONS = [
  "ยุทธศาสตร์ที่ 1 : พัฒนาหลักสูตรใหม่ และจัดการศึกษาสำหรับทุกช่วงวัย ให้มีสมรรถนะที่ตอบสนองความต้องการของสังคม",
  "ยุทธศาสตร์ที่ 2 : พัฒนาระบบนิเวศการเรียนรู้และวิจัยที่ทันสมัยเพื่อให้ทันต่อการเปลี่ยนแปลง",
  "ยุทธศาสตร์ที่ 3 : ยกระดับผลลัพธ์ด้านวิจัยและนวัตกรรมทางสังคมที่ตอบสนองต่อการพัฒนาคุณภาพชีวิต",
  "ยุทธศาสตร์ที่ 4 : บริการวิชาการเพื่อสร้างความยั่งยืน",
  "ยุทธศาสตร์ที่ 5 : พัฒนาระบบบริหารจัดการที่มีประสิทธิผลเพื่อมุ่งสู่องค์กรสมรรถนะสูง",
] as const;

export const BUDGET_REQUEST_SOURCE_SELECT_KEYS = [
  "fundingSource",
  "fundingSourceDetail",
  "projectType",
  "missionName",
  "strategyName",
  "outputCode",
  "outputName",
  "operationalPlanCode",
  "operationalPlanName",
  "activityCode",
  "projectActivityName",
  "expenditureBudget",
  "expenseCategory",
  "expenseSubcategory",
] as const;

export type BudgetRequestSourceSelectKey = (typeof BUDGET_REQUEST_SOURCE_SELECT_KEYS)[number];
export type BudgetRequestSourceOptions = Readonly<
  Record<BudgetRequestSourceSelectKey, readonly string[]>
>;

export function createBudgetRequestSourceOptions(
  catalog: FiscalYearMasterData,
): BudgetRequestSourceOptions {
  const planOptions = (level: FiscalYearMasterData["planStructures"][number]["level"]) =>
    catalog.planStructures.filter((option) => option.level === level);
  const outputOptions = planOptions("output");
  const operationalPlanOptions = planOptions("operational_plan");
  const activityOptions = planOptions("activity");

  return {
    fundingSource: BUDGET_REQUEST_FUNDING_SOURCE_OPTIONS,
    fundingSourceDetail: BUDGET_REQUEST_FUNDING_SOURCE_DETAIL_OPTIONS,
    projectType: BUDGET_REQUEST_PROJECT_TYPE_OPTIONS,
    missionName: BUDGET_REQUEST_MISSION_OPTIONS,
    strategyName: BUDGET_REQUEST_STRATEGY_OPTIONS,
    outputCode: outputOptions.map((option) => option.code),
    outputName: outputOptions.map((option) => option.name),
    operationalPlanCode: operationalPlanOptions.map((option) => option.code),
    operationalPlanName: operationalPlanOptions.map((option) => option.name),
    activityCode: activityOptions.map((option) => option.code),
    projectActivityName: activityOptions.map((option) => option.name),
    expenditureBudget: getExpenditureBudgetOptions(catalog.expenseOptions),
    expenseCategory: [...new Set(catalog.expenseOptions.map((option) => option.expenseCategory))],
    expenseSubcategory: [
      ...new Set(catalog.expenseOptions.map((option) => option.expenseSubcategory)),
    ],
  };
}

const sourceSelectKeySet: ReadonlySet<string> = new Set(BUDGET_REQUEST_SOURCE_SELECT_KEYS);
const fundingSourceAliases: Readonly<Record<string, string>> = {
  เงินรายได้: "งบประมาณเงินรายได้",
  เงินงบประมาณแผ่นดิน: "งบประมาณแผ่นดิน",
};

export function isBudgetRequestSourceSelectKey(key: string): key is BudgetRequestSourceSelectKey {
  return sourceSelectKeySet.has(key);
}

export function getBudgetRequestSourceOptions(
  options: BudgetRequestSourceOptions,
  key: string,
): readonly string[] {
  return isBudgetRequestSourceSelectKey(key) ? options[key] : [];
}

export function normalizeBudgetRequestSourceOption(
  key: BudgetRequestSourceSelectKey,
  value: string,
): string {
  const normalized = value.trim();
  return key === "fundingSource" ? (fundingSourceAliases[normalized] ?? normalized) : normalized;
}

export function isBudgetRequestSourceOption(
  options: BudgetRequestSourceOptions,
  key: BudgetRequestSourceSelectKey,
  value: string,
): boolean {
  return options[key].includes(normalizeBudgetRequestSourceOption(key, value));
}
