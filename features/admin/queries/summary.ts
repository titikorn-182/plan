import "server-only";

import type { AdminSummary } from "@/features/admin/types";
import { result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";
import { createClient } from "@/lib/supabase/server";

export async function getAdminSummary(): Promise<DataResult<AdminSummary>> {
  const supabase = await createClient();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [users, inactiveUsers, organizations, audits] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_active", false),
    supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("id", "in", RETIRED_DEMO_FILTERS.organizations),
    supabase
      .from("audit_events")
      .select("id", { count: "exact", head: true })
      .or(`entity_id.is.null,entity_id.not.in.${RETIRED_DEMO_FILTERS.entities}`)
      .gte("occurred_at", startOfToday.toISOString()),
  ]);
  const error = users.error ?? inactiveUsers.error ?? organizations.error ?? audits.error;
  return result(
    {
      totalUsers: users.count ?? 0,
      inactiveUsers: inactiveUsers.count ?? 0,
      activeOrganizations: organizations.count ?? 0,
      changesToday: audits.count ?? 0,
    },
    error,
    "admin.summary",
  );
}
