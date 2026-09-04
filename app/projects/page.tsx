import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { ProjectsView } from "@/components/modules/projects-view";
import { DataError } from "@/components/ui/data-state";
import { getProjects } from "@/lib/data/queries";

export default async function ProjectsPage() {
  const result = await getProjects();
  return (
    <AuthenticatedShell title="บริหารกิจกรรมและโครงการ">
      {result.error ? <DataError message={result.error} /> : <ProjectsView projects={result.data} />}
    </AuthenticatedShell>
  );
}
