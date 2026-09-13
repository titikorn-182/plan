import { ProjectCompletionReportsView } from "@/components/modules/project-completion-reports-view";
import { DataError } from "@/components/ui/data-state";
import { getProjectCompletionReports } from "@/features/project-completion-reports/queries";
import { parsePage } from "@/features/shared/pagination";

export default async function ProjectCompletionReportsPage({
  searchParams,
}: PageProps<"/reports/project-results">) {
  const page = parsePage((await searchParams).page);
  const result = await getProjectCompletionReports(page);
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <ProjectCompletionReportsView
      reports={result.data.items}
      pagination={result.data.pagination}
      summary={result.data.summary}
    />
  );
}
