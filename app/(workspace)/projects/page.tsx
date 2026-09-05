import { ProjectsView } from "@/components/modules/projects-view";
import { DataError } from "@/components/ui/data-state";
import { getProjects } from "@/features/projects/queries";

export default async function ProjectsPage() {
  const result = await getProjects();
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <ProjectsView projects={result.data} />
  );
}
