import { ApprovalsView } from "@/components/modules/approvals-view";
import { DataError } from "@/components/ui/data-state";
import { getWorkflowInbox, parseApprovalView } from "@/features/approvals/queries";
import { parsePage } from "@/features/shared/pagination";

export default async function ApprovalsPage({ searchParams }: PageProps<"/approvals">) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const view = parseApprovalView(params.view);
  const result = await getWorkflowInbox(page, view);
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <ApprovalsView tasks={result.data.items} pagination={result.data.pagination} view={view} />
  );
}
