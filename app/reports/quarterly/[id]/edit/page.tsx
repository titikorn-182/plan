import { notFound } from "next/navigation";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { QuarterlyReportForm } from "@/components/modules/quarterly-report-form";
import { DataError } from "@/components/ui/data-state";
import { getQuarterlyReportFormOptions } from "@/lib/data/queries";

export default async function EditQuarterlyReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getQuarterlyReportFormOptions(id);
  if (!result.error && (!result.data || !result.data.record)) notFound();
  return <AuthenticatedShell title="แก้ไขรายงานรายไตรมาส">{result.error || !result.data ? <DataError message={result.error ?? "ไม่พบรายงาน"} /> : <QuarterlyReportForm options={result.data} />}</AuthenticatedShell>;
}
