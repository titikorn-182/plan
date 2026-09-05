import { DisbursementsView } from "@/components/modules/disbursements-view";
import { DataError } from "@/components/ui/data-state";
import { getDisbursements } from "@/features/disbursements/queries";

export default async function DisbursementsPage() {
  const result = await getDisbursements();
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <DisbursementsView rows={result.data} />
  );
}
