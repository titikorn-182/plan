import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { EvidenceView } from "@/components/modules/evidence-view";
import { DataError } from "@/components/ui/data-state";
import { getViewer } from "@/lib/auth/viewer";
import { getEvidenceWorkspace } from "@/lib/data/queries";

export default async function EvidencePage() {
  const [viewer, result] = await Promise.all([getViewer(), getEvidenceWorkspace()]);
  return <AuthenticatedShell title="หลักฐานและเอกสาร">{result.error ? <DataError message={result.error} /> : <EvidenceView rows={result.data.rows} entities={result.data.entities} role={viewer.role} />}</AuthenticatedShell>;
}
