import { DisbursementForm } from "@/components/modules/disbursement-form";
import { DataError } from "@/components/ui/data-state";
import { getDisbursementFormOptions } from "@/features/disbursements/queries";

export default async function NewDisbursementPage() {
  const result = await getDisbursementFormOptions();
  return result.error ? <DataError message={result.error} /> : <DisbursementForm options={result.data} />;
}
