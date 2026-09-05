import { notFound } from "next/navigation";
import { KpiResultForm } from "@/components/modules/kpi-result-form";
import { DataError } from "@/components/ui/data-state";
import { getKpiResultFormRecord } from "@/features/kpi/queries";

export default async function EditKpiResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getKpiResultFormRecord(id);
  if (!result.error && !result.data) notFound();
  return result.error || !result.data ? <DataError message={result.error ?? "ไม่พบตัวชี้วัด"} /> : <KpiResultForm record={result.data} />;
}
