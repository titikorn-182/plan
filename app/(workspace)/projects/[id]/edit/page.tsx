import { notFound } from "next/navigation";
import { ProjectForm } from "@/components/modules/project-form";
import { DataError } from "@/components/ui/data-state";
import { getProjectFormOptions } from "@/features/projects/queries";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getProjectFormOptions(id);
  if (!result.error && (!result.data || !result.data.record)) notFound();
  return result.error || !result.data ? (
    <DataError message={result.error ?? "ไม่พบโครงการ"} />
  ) : (
    <ProjectForm options={result.data} />
  );
}
