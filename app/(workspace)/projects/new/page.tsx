import { ProjectForm } from "@/components/modules/project-form";
import { DataError } from "@/components/ui/data-state";
import { getProjectFormOptions } from "@/features/projects/queries";

export default async function NewProjectPage() {
  const result = await getProjectFormOptions();
  return result.error || !result.data ? (
    <DataError message={result.error ?? "ไม่สามารถเตรียมแบบฟอร์มได้"} />
  ) : (
    <ProjectForm options={result.data} />
  );
}
