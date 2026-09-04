import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { KpiDashboard } from "@/components/modules/kpi-dashboard";
import { DataError } from "@/components/ui/data-state";
import { getKpis } from "@/lib/data/queries";

export default async function KpiPage() {
  const result = await getKpis();
  return (
    <AuthenticatedShell title="KPI Dashboard — EdPEx & AUN-QA">
      {result.error ? <DataError message={result.error} /> : <KpiDashboard kpis={result.data} />}
    </AuthenticatedShell>
  );
}
