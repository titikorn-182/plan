import { createReportResponse } from "@/features/reports/export";
import { isReportKind } from "@/features/reports/types";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ kind: string }> }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return new Response("Unauthorized", { status: 401 });
  const { kind } = await context.params;
  if (!isReportKind(kind)) return new Response("Not found", { status: 404 });
  return createReportResponse(kind);
}
