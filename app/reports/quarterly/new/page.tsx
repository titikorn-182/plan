import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { QuarterlyReportForm } from "@/components/modules/quarterly-report-form";
import { DataError } from "@/components/ui/data-state";
import { getQuarterlyReportFormOptions } from "@/lib/data/queries";

export default async function NewQuarterlyReportPage() {
  const result = await getQuarterlyReportFormOptions();
  return <AuthenticatedShell title="บันทึกผลดำเนินงานรายไตรมาส">{result.error || !result.data ? <DataError message={result.error ?? "ไม่สามารถเตรียมแบบฟอร์มได้"} /> : <QuarterlyReportForm options={result.data} />}</AuthenticatedShell>;
}
