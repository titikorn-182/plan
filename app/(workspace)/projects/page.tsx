import { ProjectsView } from "@/components/modules/projects-view";
import { DataError } from "@/components/ui/data-state";
import { getProjects } from "@/features/projects/queries";
import { parsePage } from "@/features/shared/pagination";

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const page = parsePage((await searchParams).page);
  const result = await getProjects(page);
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <ProjectsView projects={result.data.items} pagination={result.data.pagination} />
  );
}
