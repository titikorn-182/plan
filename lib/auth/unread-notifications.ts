import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Share the count and its error only within the current authenticated render.
export const getUnreadNotificationCount = cache(async (recipientId: string) => {
  const supabase = await createClient();
  return supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", recipientId)
    .is("read_at", null);
});
