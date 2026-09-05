import "server-only";

import type { AdminUser, AuditRow } from "@/features/admin/types";
import { isAppRole } from "@/features/auth/types";
import { formatDate, result } from "@/features/shared/query-utils";
import { createPagination, getPaginationRange } from "@/features/shared/pagination";
import type { DataResult, OrganizationOption } from "@/features/shared/types";
import type { PaginationMeta } from "@/features/shared/pagination";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

export async function getAdminData(page = 1): Promise<
  DataResult<{
    users: AdminUser[];
    audits: AuditRow[];
    organizationCount: number;
    pagination: PaginationMeta;
  }>
> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.adminPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const [profiles, audits, organizations] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,full_name,email,is_active,user_roles!user_roles_profile_id_fkey(role),user_organization_scopes!user_organization_scopes_profile_id_fkey(organization_id)",
        { count: "exact" },
      )
      .order("full_name")
      .range(from, to),
    supabase
      .from("audit_events")
      .select("id,action,entity_type,occurred_at,profiles!audit_events_actor_id_fkey(email)")
      .order("occurred_at", { ascending: false })
      .limit(QUERY_LIMITS.recentAuditEvents),
    supabase.from("organizations").select("id", { count: "exact", head: true }),
  ]);
  const error = profiles.error ?? audits.error ?? organizations.error;
  return result(
    {
      users: (profiles.data ?? []).map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        active: row.is_active,
        roles: (row.user_roles ?? []).map((role) => role.role).filter(isAppRole),
        organizationIds: (row.user_organization_scopes ?? []).map((scope) => scope.organization_id),
      })),
      audits: (audits.data ?? []).map((row) => {
        const actor = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          action: row.action,
          entityType: row.entity_type,
          createdAt: formatDate(row.occurred_at),
          actorEmail: actor?.email ?? "ระบบ",
        };
      }),
      organizationCount: organizations.count ?? 0,
      pagination: createPagination(profiles.count, page, pageSize),
    },
    error,
    "admin.workspace",
  );
}

export async function getAdminOrganizations(): Promise<DataResult<OrganizationOption[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id,code,name_th")
    .eq("is_active", true)
    .order("name_th");
  return result(
    (data ?? []).map((row) => ({ id: row.id, code: row.code, label: row.name_th })),
    error,
  );
}
