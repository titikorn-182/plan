import { QuarterlyReportForm } from "@/components/modules/quarterly-report-form";
import { DataError } from "@/components/ui/data-state";
import { getQuarterlyReportFormOptions } from "@/features/quarterly-reports/queries";

export default async function NewQuarterlyReportPage() {
  const result = await getQuarterlyReportFormOptions();
  return result.error || !result.data ? (
    <DataError message={result.error ?? "ไม่สามารถเตรียมแบบฟอร์มได้"} />
  ) : (
    <QuarterlyReportForm options={result.data} />
  );
}
