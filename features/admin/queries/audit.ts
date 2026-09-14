import "server-only";

import type { AuditRow } from "@/features/admin/types";
import { createPagination, getPaginationRange } from "@/features/shared/pagination";
import { result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";
import { changedFields, formatDateTime } from "../query-formatters";

export async function getAdminAudit(
  page = 1,
): Promise<DataResult<{ items: AuditRow[]; pagination: ReturnType<typeof createPagination> }>> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.adminAuditPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const { data, error, count } = await supabase
    .from("audit_events")
    .select(
      "id,action,entity_type,occurred_at,reason,old_data,new_data,profiles!audit_events_actor_id_fkey(email),organizations(name_th)",
      { count: "exact" },
    )
    .or(`entity_id.is.null,entity_id.not.in.${RETIRED_DEMO_FILTERS.entities}`)
    .order("occurred_at", { ascending: false })
    .range(from, to);
  return result(
    {
      items: (data ?? []).map((row) => {
        const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        const organization = Array.isArray(row.organizations)
          ? row.organizations[0]
          : row.organizations;
        return {
          id: row.id,
          action: row.action,
          entityType: row.entity_type,
          createdAt: formatDateTime(row.occurred_at),
          actorEmail: actor?.email ?? "ระบบ",
          organizationName: organization?.name_th ?? "ส่วนกลาง",
          reason: row.reason,
          changedFields: changedFields(row.old_data, row.new_data),
        };
      }),
      pagination: createPagination(count, page, pageSize),
    },
    error,
    "admin.audit",
  );
}
