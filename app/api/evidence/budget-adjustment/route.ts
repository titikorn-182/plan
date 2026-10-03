import { adjustmentSchema } from "@/features/budget-adjustments/schema";
import { createBudgetAdjustmentPdf } from "@/features/budget-adjustments/pdf";
import { createClient } from "@/lib/supabase/server";
import { isRoleAssignmentActive } from "@/lib/auth/role-validity";

export const runtime = "nodejs";
const MAX_BYTES = 200_000;

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return new Response("Forbidden", { status: 403 });
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const id = claims?.claims?.sub;
  if (!id) return new Response("Unauthorized", { status: 401 });
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("is_active").eq("id", id).maybeSingle(),
    supabase.from("user_roles").select("role,active_from,active_until").eq("profile_id", id),
  ]);
  if (!profile?.is_active || !roles?.some((role) => isRoleAssignmentActive(role)))
    return new Response("Forbidden", { status: 403 });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return new Response("JSON required", { status: 415 });
  if (Number(request.headers.get("content-length")) > MAX_BYTES)
    return new Response("Payload too large", { status: 413 });
  // Bound chunked requests too; do not trust Content-Length alone.
  const reader = request.body?.getReader();
  if (!reader) return new Response("Missing body", { status: 400 });
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) {
        await reader.cancel();
        return new Response("Payload too large", { status: 413 });
      }
      chunks.push(value);
    }
    const parsed = adjustmentSchema.safeParse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (!parsed.success)
      return Response.json({ message: "กรุณาตรวจสอบข้อมูลที่กรอก" }, { status: 400 });
    const pdf = await createBudgetAdjustmentPdf(parsed.data);
    return new Response(Uint8Array.from(pdf).buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="budget-adjustment-${parsed.data.fiscalYear}.pdf"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json(
      { message: "ไม่สามารถสร้างเอกสารได้ กรุณาตรวจข้อมูลแล้วลองอีกครั้ง" },
      { status: 400 },
    );
  }
}
