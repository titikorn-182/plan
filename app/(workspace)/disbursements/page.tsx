import { DisbursementsView } from "@/components/modules/disbursements-view";
import { DataError } from "@/components/ui/data-state";
import { getDisbursements } from "@/features/disbursements/queries";
import { parsePage } from "@/features/shared/pagination";
import { getReportingPeriod } from "@/features/shared/queries";

export default async function DisbursementsPage({ searchParams }: PageProps<"/disbursements">) {
  const page = parsePage((await searchParams).page);
  const [result, period] = await Promise.all([getDisbursements(page), getReportingPeriod()]);
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <DisbursementsView
      rows={result.data.items}
      pagination={result.data.pagination}
      period={period}
    />
  );
}
