import { QuarterlyReportsView } from "@/components/modules/quarterly-reports-view";
import { DataError } from "@/components/ui/data-state";
import { getQuarterlyReports } from "@/features/quarterly-reports/queries";
import { parsePage } from "@/features/shared/pagination";

export default async function QuarterlyReportsPage({
  searchParams,
}: PageProps<"/reports/quarterly">) {
  const page = parsePage((await searchParams).page);
  const result = await getQuarterlyReports(page);
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <QuarterlyReportsView reports={result.data.items} pagination={result.data.pagination} />
  );
}
