import "server-only";

import type { NotificationRow } from "@/features/notifications/types";
import { formatDate, result } from "@/features/shared/query-utils";
import {
  createPagination,
  getPaginationRange,
  type PaginatedData,
} from "@/features/shared/pagination";
import type { DataResult } from "@/features/shared/types";
import { QUERY_LIMITS } from "@/lib/config/limits";
import { createClient } from "@/lib/supabase/server";

export async function getNotifications(
  page = 1,
): Promise<DataResult<PaginatedData<NotificationRow> & { unreadCount: number }>> {
  const supabase = await createClient();
  const pageSize = QUERY_LIMITS.defaultPageSize;
  const [from, to] = getPaginationRange(page, pageSize);
  const [notifications, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select("id,entity_type,entity_id,title,body,read_at,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
  ]);
  return result(
    {
      items: (notifications.data ?? []).map((row) => ({
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        title: row.title,
        body: row.body,
        createdAt: formatDate(row.created_at),
        read: row.read_at !== null,
      })),
      pagination: createPagination(notifications.count, page, pageSize),
      unreadCount: unread.count ?? 0,
    },
    notifications.error ?? unread.error,
    "notifications.list",
  );
}
