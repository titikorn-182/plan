import { BudgetRequestsView } from "@/features/budget-requests/components/budget-requests-view";
import { DataError } from "@/components/ui/data-state";
import { getBudgetRequests } from "@/features/budget-requests/queries";
import { parsePage } from "@/features/shared/pagination";
import { getViewer } from "@/lib/auth/viewer";

export default async function BudgetRequestsPage({ searchParams }: PageProps<"/budget-requests">) {
  const page = parsePage((await searchParams).page);
  const [result, viewer] = await Promise.all([getBudgetRequests(page), getViewer()]);
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <BudgetRequestsView
      requests={result.data.items}
      pagination={result.data.pagination}
      canDelete={viewer.roles.includes("admin")}
    />
  );
}
