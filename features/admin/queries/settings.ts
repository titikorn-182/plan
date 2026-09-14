import "server-only";

import type { AdminSettings } from "@/features/admin/types";
import { formatDate, result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";
import { createClient } from "@/lib/supabase/server";

export async function getAdminSettings(): Promise<DataResult<AdminSettings>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select(
      "id,allowed_email_domain,default_fiscal_year_id,default_quarter,reminder_days_before,updated_at",
    )
    .limit(1)
    .maybeSingle();
  return result(
    {
      id: data?.id ?? "00000000-0000-0000-0000-000000000001",
      allowedEmailDomain: data?.allowed_email_domain ?? "ubu.ac.th",
      defaultFiscalYearId: data?.default_fiscal_year_id ?? null,
      defaultQuarter: (data?.default_quarter ?? 1) as 1 | 2 | 3 | 4,
      reminderDaysBefore: data?.reminder_days_before ?? 7,
      updatedAt: formatDate(data?.updated_at),
    },
    error,
    "admin.settings",
  );
}
