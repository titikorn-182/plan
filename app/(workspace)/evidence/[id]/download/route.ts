import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reportServerError } from "@/lib/observability/server-logger";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: attachment, error: attachmentError } = await supabase
    .from("attachments")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (attachmentError) {
    reportServerError("evidence.download_lookup", attachmentError);
    return new Response("ไม่สามารถตรวจสอบข้อมูลไฟล์ได้", { status: 500 });
  }
  if (!attachment) return new Response("ไม่พบไฟล์หรือคุณไม่มีสิทธิ์เข้าถึง", { status: 404 });
  const { data, error } = await supabase.storage
    .from("evidence")
    .createSignedUrl(attachment.storage_path, 60);
  if (error) {
    reportServerError("evidence.create_signed_url", error);
    return new Response("ไม่สามารถสร้างลิงก์ดาวน์โหลดได้", { status: 500 });
  }
  if (!data) return new Response("ไม่สามารถสร้างลิงก์ดาวน์โหลดได้", { status: 500 });
  redirect(data.signedUrl);
}
