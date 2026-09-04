import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { DisbursementForm } from "@/components/modules/disbursement-form";
import { DataError } from "@/components/ui/data-state";
import { getDisbursementFormOptions } from "@/lib/data/queries";

export default async function NewDisbursementPage() {
  const result = await getDisbursementFormOptions();
  return <AuthenticatedShell title="บันทึกการเบิกจ่าย">{result.error ? <DataError message={result.error} /> : <DisbursementForm options={result.data} />}</AuthenticatedShell>;
}
