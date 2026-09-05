import { notFound } from "next/navigation";
import { QuarterlyReportForm } from "@/components/modules/quarterly-report-form";
import { DataError } from "@/components/ui/data-state";
import { getQuarterlyReportFormOptions } from "@/features/quarterly-reports/queries";

export default async function EditQuarterlyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getQuarterlyReportFormOptions(id);
  if (!result.error && (!result.data || !result.data.record)) notFound();
  return result.error || !result.data ? <DataError message={result.error ?? "ไม่พบรายงาน"} /> : <QuarterlyReportForm options={result.data} />;
}
