import { notFound } from "next/navigation";
import { ProjectCompletionReportForm } from "@/components/modules/project-completion-report-form";
import { DataError } from "@/components/ui/data-state";
import { getProjectCompletionReportFormOptions } from "@/features/project-completion-reports/queries";

export default async function EditProjectCompletionReportPage({
  params,
}: PageProps<"/reports/project-results/[id]/edit">) {
  const { id } = await params;
  const result = await getProjectCompletionReportFormOptions(id);
  if (!result.error && !result.data?.record) notFound();
  return result.error || !result.data ? (
    <DataError message={result.error ?? "ไม่สามารถเปิดรายงานได้"} />
  ) : (
    <ProjectCompletionReportForm options={result.data} />
  );
}
