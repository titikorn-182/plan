import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { DisbursementsView } from "@/components/modules/disbursements-view";
import { DataError } from "@/components/ui/data-state";
import { getDisbursements } from "@/lib/data/queries";

export default async function DisbursementsPage() {
  const result = await getDisbursements();
  return (
    <AuthenticatedShell title="ติดตามการเบิกจ่ายงบประมาณ">
      {result.error ? <DataError message={result.error} /> : <DisbursementsView rows={result.data} />}
    </AuthenticatedShell>
  );
}
