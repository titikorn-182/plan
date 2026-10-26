import { getCachedProjectProposalPdf } from "@/features/projects/project-proposal-pdf-cache";
import { getProjectProposalPdfData } from "@/features/projects/project-proposal-pdf-query";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "project";
}

async function download(
  context: RouteContext<"/api/projects/[id]/proposal">,
  includeBody: boolean,
) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return new Response(includeBody ? "Unauthorized" : null, { status: 401 });
  }

  const { id } = await context.params;
  const result = await getProjectProposalPdfData(supabase, id);
  const pdfData = result.data;
  if (result.error || !pdfData) {
    return new Response(includeBody ? "Project not found" : null, { status: 404 });
  }

  // Authorization and current data are always checked before the rendering cache.
  // HEAD probes need the same access checks, but must not generate a discarded PDF.
  const pdf = includeBody
    ? await getCachedProjectProposalPdf(claims.claims.sub, id, pdfData)
    : null;
  const filename = `project-proposal-${safeFileName(pdfData.code)}.pdf`;
  return new Response(pdf ? Uint8Array.from(pdf).buffer : null, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(_request: Request, context: RouteContext<"/api/projects/[id]/proposal">) {
  return download(context, true);
}

export async function HEAD(
  _request: Request,
  context: RouteContext<"/api/projects/[id]/proposal">,
) {
  return download(context, false);
}
