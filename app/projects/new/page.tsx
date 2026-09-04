import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { ProjectForm } from "@/components/modules/project-form";
import { DataError } from "@/components/ui/data-state";
import { getProjectFormOptions } from "@/lib/data/queries";

export default async function NewProjectPage() {
  const result = await getProjectFormOptions();
  return <AuthenticatedShell title="สร้างข้อเสนอโครงการ">{result.error || !result.data ? <DataError message={result.error ?? "ไม่สามารถเตรียมแบบฟอร์มได้"} /> : <ProjectForm options={result.data} />}</AuthenticatedShell>;
}
