import { createReportResponse } from "@/features/reports/export";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return new Response("Unauthorized", { status: 401 });
  return createReportResponse("disbursements");
}
