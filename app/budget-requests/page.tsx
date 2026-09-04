import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { BudgetRequestsView } from "@/components/modules/budget-requests-view";
import { DataError } from "@/components/ui/data-state";
import { getBudgetRequests } from "@/lib/data/queries";

export default async function BudgetRequestsPage() {
  const result = await getBudgetRequests();
  return (
    <AuthenticatedShell title="คำของบประมาณประจำปี">
      {result.error ? <DataError message={result.error} /> : <BudgetRequestsView requests={result.data} />}
    </AuthenticatedShell>
  );
}
