import { KpiDashboard } from "@/components/modules/kpi-dashboard";
import { DataError } from "@/components/ui/data-state";
import { getKpis } from "@/features/kpi/queries";
import { parsePage } from "@/features/shared/pagination";

export default async function KpiPage({ searchParams }: PageProps<"/kpi">) {
  const page = parsePage((await searchParams).page);
  const result = await getKpis(page);
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <KpiDashboard kpis={result.data.items} pagination={result.data.pagination} />
  );
}
