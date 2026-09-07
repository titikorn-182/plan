import { ProjectsView } from "@/components/modules/projects-view";
import { DataError } from "@/components/ui/data-state";
import { getProjects } from "@/features/projects/queries";
import { parseProjectFilters } from "@/features/projects/filters";
import { parsePage } from "@/features/shared/pagination";
import { getOrganizationsAndYears } from "@/features/shared/queries";

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const filters = parseProjectFilters(params);
  const [result, options] = await Promise.all([
    getProjects(page, filters),
    getOrganizationsAndYears(),
  ]);
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <ProjectsView
      projects={result.data.items}
      pagination={result.data.pagination}
      filters={filters}
      organizations={options.organizations}
    />
  );
}
