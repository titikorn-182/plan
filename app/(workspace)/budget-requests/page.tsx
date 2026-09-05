import { BudgetRequestsView } from "@/components/modules/budget-requests-view";
import { DataError } from "@/components/ui/data-state";
import { getBudgetRequests } from "@/features/budget-requests/queries";

export default async function BudgetRequestsPage() {
  const result = await getBudgetRequests();
  return result.error ? <DataError message={result.error} /> : <BudgetRequestsView requests={result.data} />;
}
