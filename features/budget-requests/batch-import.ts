import { INPUT_LIMITS } from "@/lib/config/limits";
import {
  MAX_BUDGET_REQUEST_EXPENSE_ITEMS,
  type BudgetRequestExpenseItem,
} from "@/features/budget-requests/expense-items";
import type { BudgetRequestImportedRecord } from "@/features/budget-requests/import-types";
import type { BudgetRequestProjectMember } from "@/features/budget-requests/project-members";
import {
  BUDGET_REQUEST_IMPORT_COLUMNS,
  type BudgetRequestSourceKey,
  type BudgetRequestSourceValues,
} from "@/features/budget-requests/source-fields";

export const MAX_BUDGET_REQUEST_BATCH_GROUPS = 100;

export type BudgetRequestBatchGroup = {
  errors: string[];
  expenseItems: BudgetRequestExpenseItem[];
  id: string;
  projectMembers: BudgetRequestProjectMember[];
  rowNumbers: number[];
  sourceOrganizationKey: string;
  totalAmount: number;
  values: BudgetRequestSourceValues;
  warnings: string[];
};

export type BudgetRequestBatchDraft = Pick<
  BudgetRequestBatchGroup,
  "expenseItems" | "id" | "projectMembers" | "rowNumbers" | "values"
> & {
  organizationId: string;
};

export type BudgetRequestBatchPayload = {
  budgetCycleId: string;
  fiscalYearId: string;
  groups: BudgetRequestBatchDraft[];
};

const consistentKeys: readonly BudgetRequestSourceKey[] = [
  "organizationCode",
  "organizationName",
  "projectType",
  "missionName",
  "strategyName",
  "outputCode",
  "outputName",
  "operationalPlanCode",
  "operationalPlanName",
  "activityCode",
  "projectActivityName",
];

const expenseScopedKeys: readonly BudgetRequestSourceKey[] = [
  "fundingSource",
  "fundingSourceDetail",
  "fundCode",
  "fundName",
];

const narrativeKeys: readonly BudgetRequestSourceKey[] = [
  "rationale",
  "objectives",
  "expectedBenefits",
  "targetGroup",
];

const headerByKey = new Map(
  BUDGET_REQUEST_IMPORT_COLUMNS.map((column) => [column.key, column.header]),
);

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function valuesFor(
  records: readonly BudgetRequestImportedRecord[],
  key: BudgetRequestSourceKey,
): string[] {
  return unique(records.map((record) => record.values[key]));
}

function joinNarrative(
  records: readonly BudgetRequestImportedRecord[],
  key: BudgetRequestSourceKey,
  warnings: string[],
): string {
  const values = valuesFor(records, key);
  if (values.length > 1) {
    warnings.push(`${headerByKey.get(key) ?? key}มีหลายข้อความ ระบบรวมไว้ในคำขอเดียวกัน`);
  }
  return values.join("\n\n");
}

function sourceOrganizationKey(values: BudgetRequestSourceValues): string {
  return `${values.organizationCode}\u0000${values.organizationName}`;
}

export function groupBudgetRequestImportedRecords(
  records: readonly BudgetRequestImportedRecord[],
): BudgetRequestBatchGroup[] {
  const grouped = new Map<string, BudgetRequestImportedRecord[]>();
  for (const record of records) {
    const activityCode = record.values.activityCode.trim();
    const key = activityCode || `row-${record.rowNumber}`;
    const current = grouped.get(key) ?? [];
    current.push(record);
    grouped.set(key, current);
  }

  return [...grouped.entries()].map(([id, groupRecords]) => {
    const values = { ...groupRecords[0].values };
    const errors = unique(groupRecords.flatMap((record) => record.errors));
    const warnings: string[] = [];

    if (!values.activityCode.trim()) {
      errors.push(`แถว ${groupRecords[0].rowNumber}: ยังไม่ระบุรหัสโครงการ/กิจกรรม 12 หลัก`);
    }

    for (const key of consistentKeys) {
      const candidates = valuesFor(groupRecords, key);
      values[key] = candidates[0] ?? "";
      if (candidates.length > 1) {
        errors.push(`${headerByKey.get(key) ?? key}ของรหัส ${id}ไม่ตรงกันในไฟล์`);
      }
    }
    if (!values.organizationCode) errors.push(`รหัส ${id}: ยังไม่ระบุรหัสหน่วยงานย่อย`);
    if (!values.projectType) errors.push(`รหัส ${id}: ยังไม่ระบุประเภทโครงการ`);
    if (!values.projectActivityName) errors.push(`รหัส ${id}: ยังไม่ระบุชื่อโครงการ/กิจกรรม`);

    for (const key of narrativeKeys) {
      values[key] = joinNarrative(groupRecords, key, warnings);
      if (values[key].length > INPUT_LIMITS.longText) {
        errors.push(
          `${headerByKey.get(key) ?? key}ที่รวมแล้วเกิน ${INPUT_LIMITS.longText} ตัวอักษร`,
        );
      }
    }

    for (const key of expenseScopedKeys) {
      const candidates = valuesFor(groupRecords, key);
      values[key] = candidates[0] ?? "";
      if (candidates.length > 1) {
        warnings.push(
          `${headerByKey.get(key) ?? key}มี ${candidates.length.toLocaleString("th-TH")} ค่า และถูกเก็บแยกตามรายการค่าใช้จ่าย`,
        );
      }
    }

    const startsOn = valuesFor(groupRecords, "startsOn").sort();
    const endsOn = valuesFor(groupRecords, "endsOn").sort();
    values.startsOn = startsOn[0] ?? "";
    values.endsOn = endsOn.at(-1) ?? "";
    if (startsOn.length > 1 || endsOn.length > 1) {
      warnings.push("พบหลายช่วงเวลา ระบบใช้วันที่เริ่มเร็วที่สุดและวันที่สิ้นสุดช้าที่สุด");
    }

    const subActivities = valuesFor(groupRecords, "subActivityName");
    values.subActivityName = subActivities.length === 1 ? subActivities[0] : "";
    if (subActivities.length > 1) {
      warnings.push(
        `รวม ${subActivities.length.toLocaleString("th-TH")} กิจกรรมย่อยไว้ในรายละเอียดค่าใช้จ่าย`,
      );
    }

    const owners = unique(groupRecords.map((record) => record.values.ownerName));
    values.ownerName = owners[0] ?? "";
    const projectMembers = owners.slice(1).map((name) => {
      const ownerRecord = groupRecords.find((record) => record.values.ownerName.trim() === name);
      return { name, position: ownerRecord?.values.ownerPosition.trim() ?? "" };
    });
    if (owners.length > 1) {
      warnings.push(`พบผู้รับผิดชอบ ${owners.length} คน ระบบใช้คนแรกเป็นหัวหน้าโครงการ`);
    }
    if (!values.ownerName) warnings.push("ยังไม่ระบุหัวหน้าโครงการ");
    if (!values.rationale) warnings.push("ยังไม่ระบุหลักการและเหตุผล");
    if (!values.startsOn || !values.endsOn) warnings.push("ยังระบุช่วงเวลาดำเนินงานไม่ครบ");

    const expenseItems = groupRecords.map<BudgetRequestExpenseItem>((record) => ({
      expenditureBudget: record.values.expenditureBudget,
      expenseCategory: record.values.expenseCategory,
      expenseSubcategory: record.values.expenseSubcategory,
      subActivityName: record.values.subActivityName,
      fundingSource: record.values.fundingSource,
      fundingSourceDetail: record.values.fundingSourceDetail,
      fundCode: record.values.fundCode,
      fundName: record.values.fundName,
      description: record.values.expenseDescription,
      amount: Number(record.values.totalBudget || 0),
    }));
    if (expenseItems.length > MAX_BUDGET_REQUEST_EXPENSE_ITEMS) {
      errors.push(
        `รหัส ${id} มีรายละเอียดค่าใช้จ่ายเกิน ${MAX_BUDGET_REQUEST_EXPENSE_ITEMS} รายการ`,
      );
    }
    if (expenseItems.some((item) => !Number.isFinite(item.amount) || item.amount <= 0)) {
      errors.push(`รหัส ${id} มีรายการค่าใช้จ่ายที่ยังไม่ระบุจำนวนเงินมากกว่า 0 บาท`);
    }
    const totalAmount =
      expenseItems.reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100;
    values.totalBudget = String(totalAmount);

    return {
      errors: unique(errors),
      expenseItems,
      id,
      projectMembers,
      rowNumbers: groupRecords.map((record) => record.rowNumber),
      sourceOrganizationKey: sourceOrganizationKey(values),
      totalAmount,
      values,
      warnings: unique(warnings),
    };
  });
}
