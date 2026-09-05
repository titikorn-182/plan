import { BudgetRequestsView } from "@/components/modules/budget-requests-view";
import { DataError } from "@/components/ui/data-state";
import { getBudgetRequests } from "@/features/budget-requests/queries";
import { parsePage } from "@/features/shared/pagination";

export default async function BudgetRequestsPage({ searchParams }: PageProps<"/budget-requests">) {
  const page = parsePage((await searchParams).page);
  const result = await getBudgetRequests(page);
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <BudgetRequestsView requests={result.data.items} pagination={result.data.pagination} />
  );
}
