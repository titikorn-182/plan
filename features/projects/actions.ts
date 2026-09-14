"use server";

import { z } from "zod";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  revalidateOperationPaths,
  uuidOrEmpty,
} from "@/features/shared/server-actions";
import { isProjectPeriodValid } from "@/lib/operations/rules";
import { INPUT_LIMITS } from "@/lib/config/limits";
import {
  deriveProjectType,
  parseProjectProposalDetails,
  sumProjectExpenses,
  validateProjectProposalForSubmission,
} from "@/features/projects/proposal-details";
import type { Json } from "@/types/database.generated";

const projectSchema = z.object({
  id: uuidOrEmpty,
  version: z.coerce.number().int().positive().default(1),
  intent: z.enum(["save", "submit"]),
  organizationId: z.string().uuid("กรุณาเลือกหน่วยงาน"),
  fiscalYearId: z.string().uuid("กรุณาเลือกปีงบประมาณ"),
  budgetRequestId: uuidOrEmpty,
  title: z.string().trim().min(5, "ชื่อโครงการต้องมีอย่างน้อย 5 ตัวอักษร").max(INPUT_LIMITS.title),
  ownerName: z.string().trim().min(2, "กรุณาระบุเจ้าของโครงการ").max(INPUT_LIMITS.personName),
  coordinatorName: z.string().trim().min(2, "กรุณาระบุผู้ประสานงาน").max(INPUT_LIMITS.personName),
  disbursementTarget: z.coerce.number().min(0).max(100),
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
  if (!userId)
    return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };

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
    p_id: input.id || null,
    p_version: input.version,
    p_organization_id: input.organizationId,
    p_fiscal_year_id: input.fiscalYearId,
    p_budget_request_id: input.budgetRequestId || null,
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
    p_comment: input.intent === "submit" ? "ส่งข้อเสนอโครงการเพื่อพิจารณา" : null,
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
