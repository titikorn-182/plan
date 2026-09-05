import { KpiDashboard } from "@/components/modules/kpi-dashboard";
import { DataError } from "@/components/ui/data-state";
import { getKpis } from "@/features/kpi/queries";

export default async function KpiPage() {
  const result = await getKpis();
  return result.error ? <DataError message={result.error} /> : <KpiDashboard kpis={result.data} />;
}
