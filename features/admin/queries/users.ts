import "server-only";

import type { AdminUsersData } from "@/features/admin/types";
import { isAppRole } from "@/lib/auth/types";
import { createPagination, getPaginationRange } from "@/features/shared/pagination";
import { result } from "@/features/shared/query-utils";
import type { DataResult, OrganizationOption } from "@/features/shared/types";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

export async function getAdminUsers(page = 1): Promise<DataResult<AdminUsersData>> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.adminPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const { data, error, count } = await supabase
    .from("profiles")
    .select(
      "id,full_name,email,is_active,user_roles!user_roles_profile_id_fkey(role),user_organization_scopes!user_organization_scopes_profile_id_fkey(organization_id)",
      { count: "exact" },
    )
    .order("full_name")
    .range(from, to);

  return result(
    {
      users: (data ?? []).map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        active: row.is_active,
        roles: (row.user_roles ?? []).map((role) => role.role).filter(isAppRole),
        organizationIds: (row.user_organization_scopes ?? []).map((scope) => scope.organization_id),
      })),
      pagination: createPagination(count, page, pageSize),
    },
    error,
    "admin.users",
  );
}

export async function getAdminOrganizations(): Promise<DataResult<OrganizationOption[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id,code,name_th")
    .eq("is_active", true)
    .not("id", "in", RETIRED_DEMO_FILTERS.organizations)
    .order("name_th");
  return result(
    (data ?? []).map((row) => ({ id: row.id, code: row.code, label: row.name_th })),
    error,
    "admin.organizations",
  );
}
