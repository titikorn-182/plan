import { QuarterlyReportsView } from "@/components/modules/quarterly-reports-view";
import { DataError } from "@/components/ui/data-state";
import { getQuarterlyReports } from "@/features/quarterly-reports/queries";

export default async function QuarterlyReportsPage() {
  const result = await getQuarterlyReports();
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <QuarterlyReportsView reports={result.data} />
  );
}
