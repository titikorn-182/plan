import { EvidenceView } from "@/components/modules/evidence-view";
import { DataError } from "@/components/ui/data-state";
import { getViewer } from "@/lib/auth/viewer";
import { getEvidenceWorkspace } from "@/features/evidence/queries";
import { parsePage } from "@/features/shared/pagination";

export default async function EvidencePage({ searchParams }: PageProps<"/evidence">) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const initialEntityId = Array.isArray(params.entityId) ? params.entityId[0] : params.entityId;
  const initialEntityType = Array.isArray(params.entityType)
    ? params.entityType[0]
    : params.entityType;
  const [viewer, result] = await Promise.all([getViewer(), getEvidenceWorkspace(page)]);
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <EvidenceView
      rows={result.data.rows}
      entities={result.data.entities}
      pagination={result.data.pagination}
      role={viewer.role}
      initialEntityId={initialEntityId}
      initialEntityType={initialEntityType}
    />
  );
}
