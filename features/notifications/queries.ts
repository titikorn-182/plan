import "server-only";

import type { NotificationRow } from "@/features/notifications/types";
import { formatDate, result } from "@/features/shared/query-utils";
import type { DataResult } from "@/features/shared/types";
import { createClient } from "@/lib/supabase/server";

export async function getNotifications(): Promise<DataResult<NotificationRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id,entity_type,entity_id,title,body,read_at,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return result(
    (data ?? []).map((row) => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      title: row.title,
      body: row.body,
      createdAt: formatDate(row.created_at),
      read: row.read_at !== null,
    })),
    error,
  );
}
