import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { ApprovalsView } from "@/components/modules/approvals-view";
import { DataError } from "@/components/ui/data-state";
import { getWorkflowInbox } from "@/lib/data/queries";

export default async function ApprovalsPage() {
  const result = await getWorkflowInbox();
  return <AuthenticatedShell title="Workflow อนุมัติ">{result.error ? <DataError message={result.error} /> : <ApprovalsView tasks={result.data} />}</AuthenticatedShell>;
}
