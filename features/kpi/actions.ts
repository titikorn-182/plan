"use server";

import { z } from "zod";
import { isKpiDirection } from "@/features/kpi/types";
import type { OperationState } from "@/features/shared/action-state";
import {
  authenticated,
  friendlyError,
  invalid,
  revalidateOperationPaths,
} from "@/features/shared/server-actions";
import { evaluateKpiResult } from "@/lib/operations/rules";
import { INPUT_LIMITS } from "@/lib/config/limits";

const kpiSchema = z.object({
  id: z.string().uuid(),
  version: z.coerce.number().int().positive(),
  intent: z.enum(["save", "submit"]),
  actual: z.coerce.number().finite(),
  quarter: z.union([z.coerce.number().int().min(1).max(4), z.literal("")]),
  explanation: z.string().trim().max(INPUT_LIMITS.longText),
});

export async function saveKpiResultAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  const parsed = kpiSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(previous, parsed.error);
  const input = parsed.data;
  if (input.intent === "submit" && input.explanation.length < 10) {
    return {
      ...previous,
      success: false,
      errors: { explanation: ["กรุณาอธิบายผลอย่างน้อย 10 ตัวอักษรก่อนส่ง"] },
      message: "ข้อมูลยังไม่พร้อมส่ง",
    };
  }

  const { supabase, userId } = await authenticated();
  if (!userId)
    return { ...previous, success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { data: current, error: currentError } = await supabase
    .from("kpi_results")
    .select("kpi_definitions!inner(target,direction)")
    .eq("id", input.id)
    .single();
  if (currentError) {
    return {
      ...previous,
      success: false,
      message: friendlyError(currentError, "kpi.current_result"),
    };
  }
  if (!current) {
    return { ...previous, success: false, message: "ไม่พบตัวชี้วัดหรือคุณไม่มีสิทธิ์เข้าถึง" };
  }
  const definition = Array.isArray(current.kpi_definitions)
    ? current.kpi_definitions[0]
    : current.kpi_definitions;
  if (!isKpiDirection(definition.direction)) {
    return {
      ...previous,
      success: false,
      message: "รูปแบบการคำนวณ KPI ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ",
    };
  }

  const target = Number(definition.target);
  const evaluation = evaluateKpiResult(input.actual, target, definition.direction);
  if (!evaluation.success) return { ...previous, success: false, message: evaluation.message };

  const { data, error } = await supabase
    .from("kpi_results")
    .update({
      actual: input.actual,
      quarter: input.quarter === "" ? null : input.quarter,
      explanation: input.explanation || null,
      result_state: evaluation.state,
      status: "draft",
      updated_by: userId,
    })
    .eq("id", input.id)
    .eq("version", input.version)
    .in("status", ["not_started", "draft", "revision_required"])
    .select("id,version")
    .maybeSingle();
  if (error) return { ...previous, success: false, message: friendlyError(error) };
  if (!data) {
    return {
      ...previous,
      success: false,
      message: "ผล KPI ถูกแก้ไขหรือรับรองไปแล้ว กรุณาเปิดหน้าใหม่",
    };
  }

  if (input.intent === "submit") {
    const { error: submitError } = await supabase.rpc("submit_entity_for_approval", {
      p_entity_type: "kpi_result",
      p_entity_id: input.id,
      p_comment: "ส่งผล KPI เพื่อรับรอง",
    });
    if (submitError) {
      return {
        success: false,
        id: data.id,
        version: data.version,
        message: `บันทึกผลแล้ว แต่ส่งรับรองไม่สำเร็จ: ${friendlyError(submitError)}`,
      };
    }
  }

  revalidateOperationPaths(
    "/",
    "/kpi",
    ...(input.intent === "submit" ? ["/approvals", "/notifications"] : []),
  );
  return {
    success: true,
    id: data.id,
    version: data.version,
    message: input.intent === "submit" ? "ส่งผล KPI เพื่อรับรองแล้ว" : "บันทึกผล KPI ฉบับร่างแล้ว",
  };
}
