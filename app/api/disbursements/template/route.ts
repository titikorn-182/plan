import { createWorkbookBuffer, workbookResponse } from "@/lib/server/workbooks";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return new Response("Unauthorized", { status: 401 });
  const buffer = await createWorkbookBuffer({
    title: "แม่แบบนำเข้าการเบิกจ่าย",
    subtitle:
      "ห้ามแก้ชื่อคอลัมน์ · วันที่ใช้ YYYY-MM-DD · status: recorded, reconciled, pending_docs หรือ delayed",
    sheetName: "disbursements",
    columns: [
      { header: "project_code", width: 20 },
      { header: "quarter", width: 12 },
      { header: "amount", width: 18 },
      { header: "disbursed_on", width: 18 },
      { header: "reference_no", width: 22 },
      { header: "status", width: 20 },
    ],
    rows: [],
  });
  return workbookResponse(buffer, "disbursement-import-template.xlsx");
}
