"use server";

import { z } from "zod";
import { parseDisbursementImportFile } from "@/features/disbursements/import-file";
import {
  importedDisbursementSchema,
  type DisbursementImportPreview,
  type DisbursementImportResult,
  type ImportedDisbursement,
  type ImportIssue,
} from "@/features/disbursements/import-types";
import { getReportingPeriod } from "@/features/shared/queries";
import {
  authenticated,
  friendlyError,
  revalidateOperationPaths,
} from "@/features/shared/server-actions";

const rowsSchema = z.array(importedDisbursementSchema).min(1).max(500);

async function validateAgainstDatabase(rows: ImportedDisbursement[]): Promise<{
  errors: ImportIssue[];
  payload: Array<{
    amount: number;
    created_by: string;
    disbursed_on: string;
    fiscal_year_id: string;
    organization_id: string;
    project_id: string;
    quarter: number;
    reference_no: string | null;
    status: ImportedDisbursement["status"];
    updated_by: string;
  }>;
}> {
  const [{ supabase, userId }, period] = await Promise.all([authenticated(), getReportingPeriod()]);
  if (!userId || !period.fiscalYearId) {
    return {
      payload: [],
      errors: [{ rowNumber: 1, field: "session", message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" }],
    };
  }
  const codes = [...new Set(rows.map((row) => row.projectCode))];
  const [projectQuery, yearQuery] = await Promise.all([
    supabase
      .from("projects")
      .select("id,code,organization_id,fiscal_year_id,approved_budget,disbursed_amount")
      .in("code", codes)
      .eq("fiscal_year_id", period.fiscalYearId)
      .is("archived_at", null),
    supabase
      .from("fiscal_years")
      .select("starts_on,ends_on")
      .eq("id", period.fiscalYearId)
      .single(),
  ]);
  const error = projectQuery.error ?? yearQuery.error;
  if (error || !yearQuery.data) {
    return {
      payload: [],
      errors: [
        {
          rowNumber: 1,
          field: "database",
          message: error ? friendlyError(error) : "ไม่พบปีงบประมาณที่เลือก",
        },
      ],
    };
  }
  const byCode = new Map((projectQuery.data ?? []).map((project) => [project.code, project]));
  const runningAmount = new Map<string, number>();
  const errors: ImportIssue[] = [];
  const payload = rows.flatMap((row) => {
    const project = byCode.get(row.projectCode);
    if (!project) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "projectCode",
        message: "ไม่พบโครงการในปีงบประมาณนี้ หรือไม่มีสิทธิ์เข้าถึง",
      });
      return [];
    }
    if (row.quarter !== period.quarter) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "quarter",
        message: `ไฟล์ต้องเป็นไตรมาส ${period.quarter} ตามรอบที่เลือก`,
      });
      return [];
    }
    if (row.disbursedOn < yearQuery.data.starts_on || row.disbursedOn > yearQuery.data.ends_on) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "disbursedOn",
        message: "วันที่เบิกจ่ายอยู่นอกปีงบประมาณที่เลือก",
      });
      return [];
    }
    const accumulated = (runningAmount.get(project.id) ?? 0) + row.amount;
    const remaining = Number(project.approved_budget) - Number(project.disbursed_amount);
    if (accumulated > remaining) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "amount",
        message: `ยอดสะสมในไฟล์เกินวงเงินคงเหลือ ${remaining.toLocaleString("th-TH")} บาท`,
      });
      return [];
    }
    runningAmount.set(project.id, accumulated);
    return [
      {
        project_id: project.id,
        organization_id: project.organization_id,
        fiscal_year_id: project.fiscal_year_id,
        quarter: row.quarter,
        amount: row.amount,
        disbursed_on: row.disbursedOn,
        reference_no: row.referenceNo || null,
        status: row.status,
        created_by: userId,
        updated_by: userId,
      },
    ];
  });
  return { errors, payload };
}

export async function previewDisbursementImport(
  formData: FormData,
): Promise<DisbursementImportPreview> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, fileName: "", rows: [], errors: [], message: "กรุณาเลือกไฟล์" };
  }
  const parsed = await parseDisbursementImportFile(file);
  if (parsed.errors.length) {
    return {
      success: false,
      fileName: file.name,
      rows: parsed.rows,
      errors: parsed.errors,
      message: "พบข้อมูลที่ต้องแก้ไขในไฟล์",
    };
  }
  const databaseValidation = await validateAgainstDatabase(parsed.rows);
  return {
    success: databaseValidation.errors.length === 0,
    fileName: file.name,
    rows: parsed.rows,
    errors: databaseValidation.errors,
    message:
      databaseValidation.errors.length === 0
        ? `ตรวจสอบผ่าน ${parsed.rows.length} รายการ พร้อมบันทึก`
        : "พบข้อมูลที่ยังบันทึกไม่ได้",
  };
}

export async function confirmDisbursementImport(
  rows: ImportedDisbursement[],
): Promise<DisbursementImportResult> {
  const parsed = rowsSchema.safeParse(rows);
  if (!parsed.success) return { success: false, inserted: 0, message: "ข้อมูลนำเข้าไม่ถูกต้อง" };
  const { errors, payload } = await validateAgainstDatabase(parsed.data);
  if (errors.length || payload.length !== parsed.data.length) {
    return {
      success: false,
      inserted: 0,
      message: errors[0]?.message ?? "ข้อมูลมีการเปลี่ยนแปลง กรุณาตรวจใหม่",
    };
  }
  const { supabase, userId } = await authenticated();
  if (!userId)
    return { success: false, inserted: 0, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { error } = await supabase.from("disbursements").insert(payload);
  if (error)
    return {
      success: false,
      inserted: 0,
      message: friendlyError(error, "disbursements.bulk_import"),
    };
  revalidateOperationPaths("/", "/disbursements", "/projects", "/reports");
  return {
    success: true,
    inserted: payload.length,
    message: `บันทึกการเบิกจ่าย ${payload.length} รายการเรียบร้อยแล้ว`,
  };
}
