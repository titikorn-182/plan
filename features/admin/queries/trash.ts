import "server-only";

import type { ArchivedRecord } from "@/features/admin/types";
import { result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "../query-formatters";

export async function getAdminTrash(): Promise<DataResult<ArchivedRecord[]>> {
  const supabase = await createClient();
  const limit = QUERY_LIMITS.adminTrashRows;
  const [budgetRequests, projects, attachments, comments, fiscalYears] = await Promise.all([
    supabase
      .from("budget_requests")
      .select("id,code,title_th,archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(limit),
    supabase
      .from("projects")
      .select("id,code,title_th,archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(limit),
    supabase
      .from("attachments")
      .select("id,file_name,entity_type,archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(limit),
    supabase
      .from("comments")
      .select("id,body,entity_type,archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .limit(limit),
    supabase
      .from("fiscal_years")
      .select("id,label,updated_at")
      .eq("status", "archived")
      .order("updated_at", { ascending: false })
      .limit(limit),
  ]);
  const error =
    budgetRequests.error ??
    projects.error ??
    attachments.error ??
    comments.error ??
    fiscalYears.error;
  const recordsWithSortKey: Array<ArchivedRecord & { sortKey: string }> = [
    ...(budgetRequests.data ?? []).map((row) => ({
      id: row.id,
      entityType: "budget_request" as const,
      code: row.code,
      title: row.title_th,
      archivedAt: formatDateTime(row.archived_at),
      sortKey: row.archived_at ?? "",
    })),
    ...(projects.data ?? []).map((row) => ({
      id: row.id,
      entityType: "project" as const,
      code: row.code,
      title: row.title_th,
      archivedAt: formatDateTime(row.archived_at),
      sortKey: row.archived_at ?? "",
    })),
    ...(attachments.data ?? []).map((row) => ({
      id: row.id,
      entityType: "attachment" as const,
      code: row.entity_type,
      title: row.file_name,
      archivedAt: formatDateTime(row.archived_at),
      sortKey: row.archived_at ?? "",
    })),
    ...(comments.data ?? []).map((row) => ({
      id: row.id,
      entityType: "comment" as const,
      code: row.entity_type,
      title: row.body.length > 80 ? `${row.body.slice(0, 80)}…` : row.body,
      archivedAt: formatDateTime(row.archived_at),
      sortKey: row.archived_at ?? "",
    })),
    ...(fiscalYears.data ?? []).map((row) => ({
      id: row.id,
      entityType: "fiscal_year" as const,
      code: "ปีงบประมาณ",
      title: row.label,
      archivedAt: formatDateTime(row.updated_at),
      sortKey: row.updated_at,
    })),
  ].sort((left, right) => right.sortKey.localeCompare(left.sortKey));
  const records = recordsWithSortKey.slice(0, limit).map((record) => ({
    id: record.id,
    entityType: record.entityType,
    code: record.code,
    title: record.title,
    archivedAt: record.archivedAt,
  }));
  return result(records, error, "admin.trash");
}
