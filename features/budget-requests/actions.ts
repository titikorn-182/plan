"use server";

import { z } from "zod";
import { INPUT_LIMITS, MONEY_LIMITS } from "@/lib/config/limits";
import {
  authenticated,
  friendlyError,
  revalidateOperationPaths,
  sessionExpired,
} from "@/features/shared/server-actions";
import {
  getBudgetExpenseTotal,
  parseBudgetExpenseBreakdown,
} from "@/features/budget-requests/expense-categories";
import { parseBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import {
  getBudgetRequestExpenseItemsTotal,
  validateBudgetRequestExpenseItemsForSubmission,
} from "@/features/budget-requests/expense-items";
import { validateBudgetRequestProjectMembersForSubmission } from "@/features/budget-requests/project-members";
import {
  BUDGET_REQUEST_SOURCE_FIELD_MAP,
  isBudgetRequestOrganizationCompatible,
} from "@/features/budget-requests/source-fields";
import {
  BUDGET_REQUEST_SOURCE_SELECT_KEYS,
  BUDGET_REQUEST_PROJECT_TYPE_OPTIONS,
  createBudgetRequestSourceOptions,
  isBudgetRequestSourceOption,
  normalizeBudgetRequestSourceOption,
} from "@/features/budget-requests/source-options";
import { getFiscalYearMasterDataCatalogs } from "@/features/shared/master-data-queries";
import { getFiscalYearMasterData } from "@/features/shared/master-data";

const schema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  version: z.coerce.number().int().positive().default(1),
  intent: z.enum(["save", "submit"]),
  title: z
    .string()
    .trim()
    .min(5, "ชื่อกิจกรรม/โครงการต้องมีอย่างน้อย 5 ตัวอักษร")
    .max(INPUT_LIMITS.title),
  organizationId: z.string().uuid("กรุณาเลือกหน่วยงาน"),
  fiscalYearId: z.string().uuid(),
  budgetCycleId: z.string().uuid(),
  projectType: z.string().trim().min(2, "กรุณาเลือกประเภทคำขอ").max(INPUT_LIMITS.shortText),
  ownerName: z.string().trim().min(2, "กรุณาระบุหัวหน้าโครงการ").max(INPUT_LIMITS.personName),
  rationale: z.string().trim().max(INPUT_LIMITS.longText),
  amount: z.coerce.number().min(0).max(MONEY_LIMITS.maximumBaht),
});

export interface BudgetRequestState {
  success?: boolean;
  message?: string;
  id?: string;
  code?: string;
  version?: number;
  errors?: Record<string, string[]>;
}

export async function saveBudgetRequestAction(
  previous: BudgetRequestState,
  formData: FormData,
): Promise<BudgetRequestState> {
  const parsed = schema.safeParse({
    ...Object.fromEntries(formData),
    // Avoid a named "id" input shadowing form.id and dropping React's submitter value.
    id: formData.get("id") ?? formData.get("budgetRequestId") ?? "",
  });
  if (!parsed.success) {
    return {
      ...previous,
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "กรุณาตรวจสอบข้อมูลที่ระบุ",
    };
  }
  const expenseBreakdown = parseBudgetExpenseBreakdown(formData.get("expenseBreakdown"));
  if (!expenseBreakdown.success) {
    return {
      ...previous,
      success: false,
      errors: expenseBreakdown.errors,
      message: "กรุณาตรวจสอบจำนวนเงินในหมวดค่าใช้จ่าย",
    };
  }
  const proposalDetails = parseBudgetProposalDetails(formData.get("proposalDetails"));
  if (!proposalDetails.success) {
    return {
      ...previous,
      success: false,
      errors: proposalDetails.errors,
      message: "กรุณาตรวจสอบรายละเอียดคำของบประมาณ",
    };
  }
  const usesDetailedExpenseItems = formData.get("expenseDetailMode") === "items";
  if (
    usesDetailedExpenseItems &&
    getBudgetRequestExpenseItemsTotal(proposalDetails.data.expenseItems) !== parsed.data.amount
  ) {
    return {
      ...previous,
      success: false,
      errors: {
        "proposalDetails.expenseItems": ["ผลรวมรายการค่าใช้จ่ายต้องตรงกับงบประมาณรวมทั้งหมด"],
      },
      message: "กรุณาตรวจสอบยอดรวมรายการค่าใช้จ่าย",
    };
  }
  parsed.data.projectType = normalizeBudgetRequestSourceOption(
    "projectType",
    parsed.data.projectType,
  );
  for (const key of [
    "fundingSource",
    "fundingSourceDetail",
    "missionName",
    "strategyName",
  ] as const) {
    proposalDetails.data[key] = normalizeBudgetRequestSourceOption(key, proposalDetails.data[key]);
  }
  if (
    expenseBreakdown.data !== null &&
    getBudgetExpenseTotal(expenseBreakdown.data) !== parsed.data.amount
  ) {
    return {
      ...previous,
      success: false,
      errors: { expenseBreakdown: ["ผลรวมหมวดค่าใช้จ่ายต้องตรงกับวงเงินคำขอรวม"] },
      message: "กรุณาตรวจสอบวงเงินคำขอรวม",
    };
  }
  if (parsed.data.intent === "submit") {
    const submitErrors: Record<string, string[]> = {};
    Object.assign(
      submitErrors,
      validateBudgetRequestProjectMembersForSubmission(proposalDetails.data.projectMembers),
    );
    if (usesDetailedExpenseItems) {
      Object.assign(
        submitErrors,
        validateBudgetRequestExpenseItemsForSubmission(proposalDetails.data.expenseItems),
      );
    }
    if (!BUDGET_REQUEST_PROJECT_TYPE_OPTIONS.some((option) => option === parsed.data.projectType)) {
      submitErrors.projectType = ["กรุณาเลือกประเภทโครงการจากรายการที่กำหนด"];
    }
    if (parsed.data.rationale.length < 20) {
      submitErrors.rationale = ["ก่อนส่งคำขอ กรุณาอธิบายหลักการและเหตุผลอย่างน้อย 20 ตัวอักษร"];
    }
    if (parsed.data.amount <= 0) {
      submitErrors.amount = ["ก่อนส่งคำขอ กรุณาระบุงบประมาณรวมทั้งหมดให้มากกว่า 0 บาท"];
    }
    if (!proposalDetails.data.organizationCode) {
      submitErrors["proposalDetails.organizationCode"] = ["กรุณาระบุรหัสหน่วยงานย่อย"];
    }
    if (!proposalDetails.data.organizationName) {
      submitErrors["proposalDetails.organizationName"] = ["กรุณาระบุชื่อหน่วยงานย่อย"];
    } else if (
      !isBudgetRequestOrganizationCompatible(
        proposalDetails.data.organizationCode,
        proposalDetails.data.organizationName,
      )
    ) {
      submitErrors["proposalDetails.organizationName"] = [
        "ชื่อหน่วยงานย่อยไม่อยู่ในรายการหรือไม่ตรงกับรหัสหน่วยงาน กรุณาเลือกใหม่",
      ];
    }
    if (Object.keys(submitErrors).length > 0) {
      return {
        ...previous,
        success: false,
        errors: submitErrors,
        message: "ข้อมูลยังไม่พร้อมส่ง",
      };
    }
  }

  const { supabase, userId } = await authenticated();
  if (!userId) return sessionExpired(previous);

  const masterDataResult = await getFiscalYearMasterDataCatalogs([parsed.data.fiscalYearId]);
  if (masterDataResult.error) {
    return { ...previous, success: false, message: masterDataResult.error };
  }
  const masterData = getFiscalYearMasterData(masterDataResult.data, parsed.data.fiscalYearId);
  if (masterData.planStructures.length === 0 || masterData.expenseOptions.length === 0) {
    return {
      ...previous,
      success: false,
      message: "ยังไม่ได้กำหนด Master Data สำหรับปีงบประมาณที่เลือก",
    };
  }
  const checkedProposalDetails = parseBudgetProposalDetails(
    formData.get("proposalDetails"),
    masterData.expenseOptions,
  );
  if (!checkedProposalDetails.success) {
    return {
      ...previous,
      success: false,
      errors: checkedProposalDetails.errors,
      message: "รายละเอียดค่าใช้จ่ายไม่ตรงกับ Master Data ของปีงบประมาณที่เลือก",
    };
  }
  const sourceOptions = createBudgetRequestSourceOptions(masterData);
  if (parsed.data.intent === "submit") {
    const masterErrors: Record<string, string[]> = {};
    if (usesDetailedExpenseItems) {
      Object.assign(
        masterErrors,
        validateBudgetRequestExpenseItemsForSubmission(
          proposalDetails.data.expenseItems,
          masterData.expenseOptions,
        ),
      );
    }
    for (const key of BUDGET_REQUEST_SOURCE_SELECT_KEYS) {
      const value =
        key === "projectType"
          ? parsed.data.projectType
          : key === "projectActivityName"
            ? parsed.data.title
            : proposalDetails.data[key];
      if (value && !isBudgetRequestSourceOption(sourceOptions, key, value)) {
        const label = BUDGET_REQUEST_SOURCE_FIELD_MAP.get(key)?.header ?? key;
        masterErrors[`proposalDetails.${key}`] = [`กรุณาเลือก${label}จากรายการที่กำหนด`];
      }
    }
    if (Object.keys(masterErrors).length > 0) {
      return {
        ...previous,
        success: false,
        errors: masterErrors,
        message: "ข้อมูลอ้างอิงไม่ตรงกับปีงบประมาณที่เลือก",
      };
    }
  }

  const [fiscalYearResult, budgetCycleResult] = await Promise.all([
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
  ]);
  const periodError = fiscalYearResult.error ?? budgetCycleResult.error;
  if (periodError) {
    return {
      ...previous,
      success: false,
      message: friendlyError(periodError, "budget_requests.fiscal_year"),
    };
  }
  const fiscalYear = fiscalYearResult.data;
  if (!fiscalYear || !budgetCycleResult.data) {
    return {
      ...previous,
      success: false,
      message: "ไม่พบปีงบประมาณหรือรอบรับคำขอที่เลือก กรุณาเปิดแบบฟอร์มใหม่",
    };
  }
  if (budgetCycleResult.data.fiscal_year_id !== parsed.data.fiscalYearId) {
    return {
      ...previous,
      success: false,
      errors: { fiscalYearId: ["ปีงบประมาณไม่ตรงกับรอบรับคำขอ กรุณาเลือกใหม่"] },
      message: "ปีงบประมาณที่เลือกไม่ถูกต้อง",
    };
  }
  if (parsed.data.intent === "submit") {
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("name_th")
      .eq("id", parsed.data.organizationId)
      .single();
    if (organizationError || !organization) {
      return {
        ...previous,
        success: false,
        message: friendlyError(organizationError, "budget_requests.organization"),
      };
    }
    if (
      !isBudgetRequestOrganizationCompatible(
        proposalDetails.data.organizationCode,
        organization.name_th,
      )
    ) {
      return {
        ...previous,
        success: false,
        errors: {
          organizationId: ["หน่วยงานเจ้าของคำขอไม่ตรงกับรหัสหน่วยงานย่อย กรุณาเลือกใหม่"],
        },
        message: "ข้อมูลหน่วยงานไม่ตรงกัน",
      };
    }
  }

  const { data, error } = await supabase.rpc("save_budget_request_transaction", {
    // PostgreSQL accepts NULL here to create a row, but generated RPC argument
    // types cannot express nullable SQL function parameters.
    p_id: (parsed.data.id || null) as string,
    p_version: parsed.data.version,
    p_fiscal_year_id: parsed.data.fiscalYearId,
    p_budget_cycle_id: parsed.data.budgetCycleId,
    p_organization_id: parsed.data.organizationId,
    p_owner_name: parsed.data.ownerName,
    p_title_th: parsed.data.title,
    p_category: parsed.data.projectType.includes("ครุภัณฑ์")
      ? "ครุภัณฑ์"
      : parsed.data.projectType.includes("ก่อสร้าง")
        ? "สิ่งก่อสร้าง"
        : "ดำเนินงาน",
    p_project_type: parsed.data.projectType,
    p_rationale: parsed.data.rationale,
    p_requested_amount: parsed.data.amount,
    p_expense_breakdown: expenseBreakdown.data,
    p_proposal_details: proposalDetails.data,
    p_submit: parsed.data.intent === "submit",
    ...(parsed.data.intent === "submit" ? { p_comment: "ส่งคำของบประมาณเพื่อพิจารณา" } : {}),
  });
  if (error) {
    const denied =
      error.code === "42501" ? "คุณไม่มีสิทธิ์บันทึกคำขอสำหรับหน่วยงานหรือสถานะนี้" : null;
    return {
      ...previous,
      success: false,
      message: denied ?? friendlyError(error, "budget_requests.save_transaction"),
      id: parsed.data.id || previous.id,
      version: parsed.data.version,
    };
  }
  if (!data) {
    return {
      ...previous,
      success: false,
      message: "ข้อมูลถูกแก้ไขโดยผู้ใช้อื่น กรุณากลับไปเปิดรายการใหม่อีกครั้ง",
    };
  }

  revalidateOperationPaths(
    "/",
    "/budget-requests",
    ...(parsed.data.intent === "submit" ? ["/approvals", "/notifications"] : []),
  );
  return {
    success: true,
    message:
      parsed.data.intent === "submit"
        ? `ส่งคำขอ ${data.code} เข้าสู่กระบวนการตรวจสอบแล้ว`
        : `บันทึกฉบับร่าง ${data.code} แล้ว`,
    id: data.id,
    code: data.code,
    version: data.version,
  };
}
