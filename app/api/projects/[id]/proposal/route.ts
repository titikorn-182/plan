import { createProjectProposalPdf } from "@/features/projects/project-proposal-pdf";
import { getProjectProposalPdfData } from "@/features/projects/project-proposal-pdf-query";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}

export async function GET(_request: Request, context: RouteContext<"/api/projects/[id]/proposal">) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return new Response("Unauthorized", { status: 401 });

  const { id } = await context.params;
  const result = await getProjectProposalPdfData(supabase, id);
  const pdfData = result.data;
  if (result.error || !pdfData) return new Response("Project not found", { status: 404 });

  const pdf = await createProjectProposalPdf(pdfData);
  const filename = `project-proposal-${safeFileName(pdfData.code)}.pdf`;
  return new Response(Uint8Array.from(pdf).buffer, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
