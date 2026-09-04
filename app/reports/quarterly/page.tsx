import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { QuarterlyReportsView } from "@/components/modules/quarterly-reports-view";
import { DataError } from "@/components/ui/data-state";
import { getQuarterlyReports } from "@/lib/data/queries";

export default async function QuarterlyReportsPage() {
  const result = await getQuarterlyReports();
  return (
    <AuthenticatedShell title="ติดตามผลการดำเนินงานรายไตรมาส">
      {result.error ? <DataError message={result.error} /> : <QuarterlyReportsView reports={result.data} />}
    </AuthenticatedShell>
  );
}
