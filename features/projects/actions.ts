"use server";

import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  revalidateOperationPaths,
  SESSION_EXPIRED_MESSAGE,
  sessionExpired,
  uuidOrEmpty,
} from "@/features/shared/server-actions";
import { isProjectPeriodValid } from "@/features/shared/operation-rules";
import { INPUT_LIMITS, VALIDATION_LIMITS } from "@/lib/config/limits";
import { getFiscalYearMasterDataCatalogs } from "@/features/shared/master-data-queries";
import { getFiscalYearMasterData } from "@/features/shared/master-data";
import { validateProjectPlanStructure } from "@/features/projects/plan-structure";
import {
  deriveProjectType,
  parseProjectProposalDetails,
  sumProjectExpenses,
  validateProjectProposalForSubmission,
} from "@/features/projects/proposal-details";
import type { Json } from "@/types/database.generated";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";
import { getApprovedBudgetProjectSourceRow } from "@/features/projects/queries";
import { createApprovedBudgetProjectSource } from "@/features/projects/approved-budget-source";

export async function loadApprovedBudgetProjectSourceAction(
  budgetRequestId: string,
): Promise<ReturnType<typeof createApprovedBudgetProjectSource>> {
  const parsed = z.string().uuid().safeParse(budgetRequestId);
  if (!parsed.success) {
    return { success: false, error: "กรุณาเลือกคำของบประมาณที่อนุมัติแล้วจากรายการ" };
  }
  const { supabase, userId } = await authenticated();
  if (!userId) return { success: false, error: SESSION_EXPIRED_MESSAGE };

  const { data, error } = await getApprovedBudgetProjectSourceRow(supabase, parsed.data);
  if (error) {
    return { success: false, error: friendlyError(error, "projects.approved_budget_source") };
  }
  if (!data) {
    return {
      success: false,
      error: "ไม่พบคำของบที่อนุมัติแล้ว หรือคุณไม่มีสิทธิ์เข้าถึง กรุณาเลือกรายการใหม่",
    };
  }
  return createApprovedBudgetProjectSource(data);
}

const projectSchema = z.object({
  id: uuidOrEmpty,
  version: z.coerce.number().int().positive().default(1),
  intent: z.enum(["save", "submit"]),
  organizationId: z.string().uuid("กรุณาเลือกหน่วยงาน"),
  fiscalYearId: z.string().uuid("กรุณาเลือกปีงบประมาณ"),
  budgetRequestId: uuidOrEmpty,
  title: z
    .string()
    .trim()
    .min(5, "กรุณาระบุชื่อกิจกรรมย่อยอย่างน้อย 5 ตัวอักษร")
    .max(INPUT_LIMITS.title),
  ownerName: z.string().trim().min(2, "กรุณาระบุเจ้าของโครงการ").max(INPUT_LIMITS.personName),
  coordinatorName: z.string().trim().min(2, "กรุณาระบุผู้ประสานงาน").max(INPUT_LIMITS.personName),
  disbursementTarget: z.coerce
    .number()
    .min(VALIDATION_LIMITS.percentageMinimum)
    .max(VALIDATION_LIMITS.percentageMaximum),
  startsOn: z.string().date("กรุณาระบุวันเริ่มต้น"),
  endsOn: z.string().date("กรุณาระบุวันสิ้นสุด"),
  proposalDetails: z.string().min(2, "ไม่พบรายละเอียดแบบเสนอโครงการ"),
});

export async function saveProjectAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const parsed = projectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const input = parsed.data;
  const proposal = parseProjectProposalDetails(input.proposalDetails);
  if (!proposal.success) {
    return {
      ...previous,
      success: false,
      errors: proposal.errors,
      message: "รายละเอียดแบบเสนอโครงการไม่ถูกต้อง",
    };
  }

  if (!isProjectPeriodValid(input.startsOn, input.endsOn)) {
    return {
      ...previous,
      success: false,
      errors: { endsOn: ["วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น"] },
      message: "ช่วงเวลาดำเนินงานไม่ถูกต้อง",
    };
  }
  const approvedBudget = sumProjectExpenses(proposal.data);
  if (input.intent === "submit") {
    const proposalErrors = validateProjectProposalForSubmission(proposal.data);
    if (Object.keys(proposalErrors).length > 0) {
      return {
        ...previous,
        success: false,
        errors: proposalErrors,
        message: "กรุณากรอกแบบเสนอโครงการให้ครบก่อนส่งอนุมัติ",
      };
    }
  }
  const { supabase, userId } = await authenticated();
  if (!userId) return sessionExpired(previous);

  let sourceHasChanged = Boolean(input.budgetRequestId);
  if (input.id && input.budgetRequestId) {
    const { data: existing, error: existingError } = await supabase
      .from("projects")
      .select("budget_request_id,organization_id,fiscal_year_id")
      .eq("id", input.id)
      .maybeSingle();
    if (existingError) {
      return {
        ...previous,
        success: false,
        message: friendlyError(existingError, "projects.current_budget_source"),
      };
    }
    // An unchanged historical link must not prevent editing unrelated proposal
    // fields merely because its source was subsequently archived.
    sourceHasChanged =
      !existing ||
      existing.budget_request_id !== input.budgetRequestId ||
      existing.organization_id !== input.organizationId ||
      existing.fiscal_year_id !== input.fiscalYearId;
  }
  if (input.budgetRequestId && sourceHasChanged) {
    // Re-read the source through this user's RLS session: dropdown values and
    // previously loaded details are not proof of access or approval at save time.
    const { data: source, error: sourceError } = await supabase
      .from("budget_requests")
      .select("id,organization_id,fiscal_year_id")
      .eq("id", input.budgetRequestId)
      .eq("status", "approved")
      .is("archived_at", null)
      .not("id", "in", RETIRED_DEMO_FILTERS.budgetRequests)
      .maybeSingle();
    if (sourceError) {
      return {
        ...previous,
        success: false,
        message: friendlyError(sourceError, "projects.validate_budget_source"),
      };
    }
    if (!source) {
      const message =
        "ไม่พบคำของบที่อนุมัติแล้ว หรือคุณไม่มีสิทธิ์เข้าถึง กรุณาเลือกคำของบอ้างอิงใหม่";
      return {
        ...previous,
        success: false,
        errors: { budgetRequestId: [message] },
        message,
      };
    }
    const sourceErrors: Record<string, string[]> = {};
    if (source.organization_id !== input.organizationId) {
      sourceErrors.organizationId = ["หน่วยงานต้องตรงกับคำของบประมาณที่อ้างอิง"];
    }
    if (source.fiscal_year_id !== input.fiscalYearId) {
      sourceErrors.fiscalYearId = ["ปีงบประมาณต้องตรงกับคำของบประมาณที่อ้างอิง"];
    }
    if (Object.keys(sourceErrors).length > 0) {
      return {
        ...previous,
        success: false,
        errors: sourceErrors,
        message: "หน่วยงานหรือปีงบประมาณไม่ตรงกับคำของบอ้างอิง กรุณาเลือกคำของบใหม่",
      };
    }
  }

  const masterDataResult = await getFiscalYearMasterDataCatalogs([input.fiscalYearId]);
  if (masterDataResult.error) {
    return { ...previous, success: false, message: masterDataResult.error };
  }
  const masterData = getFiscalYearMasterData(masterDataResult.data, input.fiscalYearId);
  if (masterData.planStructures.length === 0) {
    return {
      ...previous,
      success: false,
      message: "ยังไม่ได้กำหนด Master Data สำหรับปีงบประมาณที่เลือก",
    };
  }
  const planStructureErrors = validateProjectPlanStructure(proposal.data, masterData);
  if (Object.keys(planStructureErrors).length > 0) {
    return {
      ...previous,
      success: false,
      errors: planStructureErrors,
      message: "โครงสร้างแผนไม่ตรงกับปีงบประมาณที่เลือก",
    };
  }

  const { data: fiscal, error: fiscalError } = await supabase
    .from("fiscal_years")
    .select("buddhist_year")
    .eq("id", input.fiscalYearId)
    .single();
  if (fiscalError) {
    return {
      ...previous,
      success: false,
      message: friendlyError(fiscalError, "projects.fiscal_year"),
    };
  }
  if (!fiscal) return { ...previous, success: false, message: "ไม่พบปีงบประมาณที่เลือก" };

  const { data, error } = await supabase.rpc("save_project_transaction", {
    // PostgreSQL accepts NULL for these optional UUIDs, but generated RPC
    // argument types cannot express nullable SQL function parameters.
    p_id: (input.id || null) as string,
    p_version: input.version,
    p_organization_id: input.organizationId,
    p_fiscal_year_id: input.fiscalYearId,
    p_budget_request_id: (input.budgetRequestId || null) as string,
    p_owner_name: input.ownerName,
    p_coordinator_name: input.coordinatorName,
    p_title_th: input.title,
    p_project_type: deriveProjectType(proposal.data),
    p_approved_budget: approvedBudget,
    p_disbursement_target: input.disbursementTarget,
    p_starts_on: input.startsOn,
    p_ends_on: input.endsOn,
    p_proposal_details: proposal.data as Json,
    p_submit: input.intent === "submit",
    ...(input.intent === "submit" ? { p_comment: "ส่งข้อเสนอโครงการเพื่อพิจารณา" } : {}),
  });
  if (error) {
    return {
      ...previous,
      success: false,
      message: friendlyError(error),
      id: input.id || previous.id,
      version: input.version,
    };
  }
  if (!data) {
    return {
      ...previous,
      success: false,
      message: "รายการถูกแก้ไขโดยผู้ใช้อื่น กรุณาเปิดหน้าใหม่อีกครั้ง",
    };
  }

  revalidateOperationPaths(
    "/",
    "/projects",
    ...(input.intent === "submit" ? ["/approvals", "/notifications"] : []),
  );
  return {
    success: true,
    id: data.id,
    version: data.version,
    message:
      input.intent === "submit"
        ? `ส่งโครงการ ${data.code} เข้าสู่ workflow แล้ว`
        : `บันทึกฉบับร่าง ${data.code} แล้ว`,
  };
}
