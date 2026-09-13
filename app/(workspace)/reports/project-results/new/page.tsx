import { ProjectCompletionReportForm } from "@/components/modules/project-completion-report-form";
import { DataError } from "@/components/ui/data-state";
import { getProjectCompletionReportFormOptions } from "@/features/project-completion-reports/queries";

export default async function NewProjectCompletionReportPage({
  searchParams,
}: PageProps<"/reports/project-results/new">) {
  const projectId = (await searchParams).projectId;
  const preferredProjectId = Array.isArray(projectId) ? projectId[0] : projectId;
  const result = await getProjectCompletionReportFormOptions(undefined, preferredProjectId);
  return result.error || !result.data ? (
    <DataError message={result.error ?? "ไม่สามารถเตรียมแบบฟอร์มได้"} />
  ) : (
    <ProjectCompletionReportForm options={result.data} />
  );
}
