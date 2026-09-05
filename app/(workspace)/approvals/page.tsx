import { ApprovalsView } from "@/components/modules/approvals-view";
import { DataError } from "@/components/ui/data-state";
import { getWorkflowInbox } from "@/features/approvals/queries";

export default async function ApprovalsPage() {
  const result = await getWorkflowInbox();
  return result.error ? <DataError message={result.error} /> : <ApprovalsView tasks={result.data} />;
}
