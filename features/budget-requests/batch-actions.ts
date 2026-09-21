"use server";

import { z } from "zod";
import { COLLECTION_LIMITS, IMPORT_LIMITS, INPUT_LIMITS } from "@/lib/config/limits";
import {
  getBudgetRequestExpenseItemsTotal,
  parseBudgetRequestExpenseItems,
  validateBudgetRequestExpenseItemsForSubmission,
  type BudgetRequestExpenseItem,
} from "@/features/budget-requests/expense-items";
import {
  parseBudgetRequestProjectMembers,
  MAX_BUDGET_REQUEST_PROJECT_MEMBERS,
  type BudgetRequestProjectMember,
} from "@/features/budget-requests/project-members";
import {
  BUDGET_REQUEST_IMPORT_COLUMNS,
  BUDGET_REQUEST_SOURCE_FIELD_MAP,
  createEmptyBudgetRequestSourceValues,
  isBudgetRequestOrganizationCompatible,
  toBudgetProposalDetails,
  type BudgetRequestSourceValues,
} from "@/features/budget-requests/source-fields";
import {
  BUDGET_REQUEST_SOURCE_SELECT_KEYS,
  createBudgetRequestSourceOptions,
  isBudgetRequestSourceOption,
  normalizeBudgetRequestSourceOption,
} from "@/features/budget-requests/source-options";
import { parseBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import {
  authenticated,
  friendlyError,
  revalidateOperationPaths,
  sessionExpired,
} from "@/features/shared/server-actions";
import { getFiscalYearMasterDataCatalogs } from "@/features/shared/master-data-queries";
import { getFiscalYearMasterData } from "@/features/shared/master-data";
import { validatePlanStructure } from "@/features/shared/plan-structure";

export type BudgetRequestBatchState = {
  createdCodes?: string[];
  createdCount?: number;
  errors?: string[];
  message?: string;
  skippedCount?: number;
  success?: boolean;
};

const envelopeSchema = z.object({
  budgetCycleId: z.string().uuid("กรุณาเลือกรอบคำของบประมาณ"),
  // Match the retained PostgreSQL fiscal-year IDs, including the original 2570 ID.
  fiscalYearId: z.guid("กรุณาเลือกปีงบประมาณ"),
  groups: z
    .array(
      z.object({
        expenseItems: z.array(z.unknown()).min(1).max(COLLECTION_LIMITS.budgetRequestExpenseItems),
        id: z.string().trim().min(1).max(120),
        organizationId: z.string().uuid(),
        projectMembers: z.array(z.unknown()).max(MAX_BUDGET_REQUEST_PROJECT_MEMBERS),
        rowNumbers: z
          .array(z.number().int().min(2).max(IMPORT_LIMITS.maximumSourceRowNumber))
          .min(1)
          .max(IMPORT_LIMITS.budgetRequestRows),
        values: z.record(z.string(), z.unknown()),
      }),
    )
    .min(1)
    .max(IMPORT_LIMITS.budgetRequestGroups),
});

function parseSourceValues(
  input: Record<string, unknown>,
): { success: true; data: BudgetRequestSourceValues } | { success: false; error: string } {
  const values = createEmptyBudgetRequestSourceValues();
  for (const column of BUDGET_REQUEST_IMPORT_COLUMNS) {
    const raw = input[column.key];
    if (typeof raw !== "string") {
      return { success: false, error: `${column.header}ต้องเป็นข้อความ` };
    }
    const maxLength =
      BUDGET_REQUEST_SOURCE_FIELD_MAP.get(column.key)?.maxLength ??
      (column.key === "expenseDescription" ? INPUT_LIMITS.longText : INPUT_LIMITS.title);
    const value = raw.trim();
    if (value.length > maxLength) {
      return {
        success: false,
        error: `${column.header}ต้องไม่เกิน ${maxLength.toLocaleString("th-TH")} ตัวอักษร`,
      };
    }
    values[column.key] = value;
  }
  return { success: true, data: values };
}

function activityCodeFromDetails(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const activityCode = (value as Record<string, unknown>).activityCode;
  return typeof activityCode === "string" ? activityCode.trim() : "";
}

function budgetCategory(projectType: string): string {
  if (projectType.includes("ครุภัณฑ์")) return "ครุภัณฑ์";
  if (projectType.includes("ก่อสร้าง")) return "สิ่งก่อสร้าง";
  return "ดำเนินงาน";
}

export async function saveBudgetRequestBatchAction(
  previous: BudgetRequestBatchState,
  formData: FormData,
): Promise<BudgetRequestBatchState> {
  void previous;
  const rawPayload = formData.get("batchPayload");
  if (typeof rawPayload !== "string") {
    return { success: false, message: "ไม่พบข้อมูลนำเข้า", errors: ["กรุณาเลือกไฟล์ใหม่"] };
  }

  let input: unknown;
  try {
    input = JSON.parse(rawPayload);
  } catch {
    return {
      success: false,
      message: "ข้อมูลนำเข้าไม่ถูกต้อง",
      errors: ["กรุณาเลือกไฟล์และตรวจสอบข้อมูลอีกครั้ง"],
    };
  }
  const parsed = envelopeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "ข้อมูลนำเข้าไม่ครบถ้วน",
      errors: parsed.error.issues.slice(0, 8).map((issue) => issue.message),
    };
  }

  const normalizedGroups: Array<{
    expenseItems: BudgetRequestExpenseItem[];
    id: string;
    organizationId: string;
    projectMembers: BudgetRequestProjectMember[];
    rowNumbers: number[];
    values: BudgetRequestSourceValues;
  }> = [];
  const validationErrors: string[] = [];
  const usedRows = new Set<number>();
  const masterDataResult = await getFiscalYearMasterDataCatalogs([parsed.data.fiscalYearId]);
  if (masterDataResult.error) {
    return { success: false, message: masterDataResult.error, errors: [] };
  }
  const masterData = getFiscalYearMasterData(masterDataResult.data, parsed.data.fiscalYearId);
  if (masterData.planStructures.length === 0 || masterData.expenseOptions.length === 0) {
    return {
      success: false,
      message: "ยังไม่ได้กำหนด Master Data สำหรับปีงบประมาณที่เลือก",
      errors: [],
    };
  }
  const sourceOptions = createBudgetRequestSourceOptions(masterData);

  for (const group of parsed.data.groups) {
    const sourceValues = parseSourceValues(group.values);
    const expenseItems = parseBudgetRequestExpenseItems(
      group.expenseItems,
      masterData.expenseOptions,
    );
    const projectMembers = parseBudgetRequestProjectMembers(group.projectMembers);
    if (!sourceValues.success) {
      validationErrors.push(`รหัส ${group.id}: ${sourceValues.error}`);
      continue;
    }
    if (!expenseItems.success) {
      validationErrors.push(`รหัส ${group.id}: รายละเอียดค่าใช้จ่ายไม่ถูกต้อง`);
      continue;
    }
    if (!projectMembers.success) {
      validationErrors.push(`รหัส ${group.id}: รายชื่อผู้รับผิดชอบไม่ถูกต้อง`);
      continue;
    }
    const values = sourceValues.data;
    values.projectType = normalizeBudgetRequestSourceOption("projectType", values.projectType);
    for (const key of BUDGET_REQUEST_SOURCE_SELECT_KEYS) {
      values[key] = normalizeBudgetRequestSourceOption(key, values[key]);
      if (values[key] && !isBudgetRequestSourceOption(sourceOptions, key, values[key])) {
        const label =
          BUDGET_REQUEST_IMPORT_COLUMNS.find((column) => column.key === key)?.header ?? key;
        validationErrors.push(`รหัส ${group.id}: ${label}ไม่อยู่ในรายการที่กำหนด`);
      }
    }
    if (group.id !== values.activityCode || !/^\d{12}$/.test(values.activityCode)) {
      validationErrors.push(`รหัส ${group.id}: รหัสโครงการ/กิจกรรมต้องเป็นตัวเลข 12 หลัก`);
    }
    const planErrors = validatePlanStructure(values, masterData);
    for (const message of new Set(Object.values(planErrors).flat())) {
      validationErrors.push(`รหัส ${group.id}: ${message}`);
    }
    if (values.projectActivityName.length < 5) {
      validationErrors.push(`รหัส ${group.id}: กรุณาระบุชื่อโครงการ/กิจกรรม`);
    }
    if (!isBudgetRequestSourceOption(sourceOptions, "projectType", values.projectType)) {
      validationErrors.push(`รหัส ${group.id}: กรุณาเลือกประเภทโครงการจากรายการที่กำหนด`);
    }
    if (values.ownerName.length < 2) {
      validationErrors.push(`รหัส ${group.id}: กรุณาระบุหัวหน้าโครงการ`);
    }
    const expenseErrors = validateBudgetRequestExpenseItemsForSubmission(
      expenseItems.data,
      masterData.expenseOptions,
    );
    if (Object.keys(expenseErrors).length > 0) {
      validationErrors.push(`รหัส ${group.id}: รายละเอียดค่าใช้จ่ายยังไม่ครบ`);
    }
    for (const rowNumber of group.rowNumbers) {
      if (usedRows.has(rowNumber)) {
        validationErrors.push(`แถว ${rowNumber} ถูกนำเข้าซ้ำมากกว่าหนึ่งคำขอ`);
      }
      usedRows.add(rowNumber);
    }
    normalizedGroups.push({
      expenseItems: expenseItems.data,
      id: group.id,
      organizationId: group.organizationId,
      projectMembers: projectMembers.data,
      rowNumbers: group.rowNumbers,
      values,
    });
  }

  if (validationErrors.length > 0 || normalizedGroups.length !== parsed.data.groups.length) {
    return {
      success: false,
      message: "ยังบันทึกไม่ได้ กรุณาแก้รายการที่ระบบระบุ",
      errors: [...new Set(validationErrors)].slice(0, 20),
    };
  }

  const { supabase, userId } = await authenticated();
  if (!userId) return sessionExpired({ success: false });

  const organizationIds = [...new Set(normalizedGroups.map((group) => group.organizationId))];
  const [fiscalYearResult, budgetCycleResult, organizationsResult, existingResult] =
    await Promise.all([
      supabase
        .from("fiscal_years")
        .select("buddhist_year")
        .eq("id", parsed.data.fiscalYearId)
        .single(),
      supabase
        .from("budget_cycles")
        .select("fiscal_year_id")
        .eq("id", parsed.data.budgetCycleId)
        .single(),
      supabase.from("organizations").select("id,name_th").in("id", organizationIds),
      supabase
        .from("budget_requests")
        .select("organization_id,proposal_details")
        .eq("fiscal_year_id", parsed.data.fiscalYearId)
        .in("organization_id", organizationIds),
    ]);
  const lookupError =
    fiscalYearResult.error ??
    budgetCycleResult.error ??
    organizationsResult.error ??
    existingResult.error;
  if (lookupError) {
    return {
      success: false,
      message: friendlyError(lookupError, "budget_requests.batch_lookup"),
    };
  }
  if (!fiscalYearResult.data || !budgetCycleResult.data) {
    return { success: false, message: "ไม่พบปีงบประมาณหรือรอบรับคำขอที่เลือก" };
  }
  if (budgetCycleResult.data.fiscal_year_id !== parsed.data.fiscalYearId) {
    return { success: false, message: "ปีงบประมาณไม่ตรงกับรอบรับคำขอ กรุณาเลือกใหม่" };
  }

  const organizations = new Map(
    (organizationsResult.data ?? []).map((organization) => [organization.id, organization.name_th]),
  );
  if (organizations.size !== organizationIds.length) {
    return {
      success: false,
      message: "ไม่พบหน่วยงานบางรายการ หรือคุณไม่มีสิทธิ์บันทึกให้หน่วยงานนั้น",
    };
  }

  const existingKeys = new Set(
    (existingResult.data ?? [])
      .map((record) => {
        const activityCode = activityCodeFromDetails(record.proposal_details);
        return activityCode ? `${record.organization_id}\u0000${activityCode}` : "";
      })
      .filter(Boolean),
  );
  const groupsToInsert = normalizedGroups.filter(
    (group) => !existingKeys.has(`${group.organizationId}\u0000${group.values.activityCode}`),
  );
  const skippedCount = normalizedGroups.length - groupsToInsert.length;
  if (groupsToInsert.length === 0) {
    return {
      success: true,
      createdCodes: [],
      createdCount: 0,
      skippedCount,
      message: "ไม่พบคำขอใหม่ รายการที่เลือกมีอยู่ในปีงบประมาณและหน่วยงานนี้แล้ว",
    };
  }

  const insertRows = groupsToInsert.map((group) => {
    const organizationName = organizations.get(group.organizationId) ?? "";
    if (!isBudgetRequestOrganizationCompatible(group.values.organizationCode, organizationName)) {
      validationErrors.push(
        `รหัส ${group.id}: หน่วยงานที่เลือกไม่ตรงกับรหัสหน่วยงาน ${group.values.organizationCode}`,
      );
    }
    const proposal = {
      ...toBudgetProposalDetails(group.values),
      organizationName,
      expenseItems: group.expenseItems,
      projectMembers: group.projectMembers,
    };
    const checkedProposal = parseBudgetProposalDetails(proposal, masterData.expenseOptions);
    if (!checkedProposal.success) {
      validationErrors.push(`รหัส ${group.id}: รายละเอียดคำขอไม่ผ่านการตรวจสอบ`);
    }
    const amount = getBudgetRequestExpenseItemsTotal(group.expenseItems);
    return {
      budget_cycle_id: parsed.data.budgetCycleId,
      category: budgetCategory(group.values.projectType),
      // The insert trigger replaces an empty value with a concurrency-safe code.
      code: "",
      coordinator_id: userId,
      coordinator_name: group.values.ownerName,
      created_by: userId,
      expense_breakdown: null,
      fiscal_year_id: parsed.data.fiscalYearId,
      organization_id: group.organizationId,
      owner_id: userId,
      owner_name: group.values.ownerName,
      project_type: group.values.projectType,
      proposal_details: checkedProposal.success ? checkedProposal.data : proposal,
      rationale: group.values.rationale,
      requested_amount: amount,
      status: "draft" as const,
      submitted_at: null,
      title_th: group.values.projectActivityName,
      updated_by: userId,
    };
  });

  if (validationErrors.length > 0) {
    return {
      success: false,
      message: "ยังบันทึกไม่ได้ กรุณาตรวจสอบหน่วยงานและรายละเอียดคำขอ",
      errors: [...new Set(validationErrors)].slice(0, 20),
    };
  }

  const { data, error } = await supabase.from("budget_requests").insert(insertRows).select("code");
  if (error) {
    return {
      success: false,
      message: friendlyError(error, "budget_requests.batch_insert"),
    };
  }

  const createdCodes = (data ?? []).map((record) => record.code);
  revalidateOperationPaths("/", "/budget-requests");
  return {
    success: true,
    createdCodes,
    createdCount: createdCodes.length,
    skippedCount,
    message: `บันทึกฉบับร่าง ${createdCodes.length.toLocaleString("th-TH")} คำขอแล้ว`,
  };
}
