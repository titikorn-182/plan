import { notFound } from "next/navigation";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { ProjectForm } from "@/components/modules/project-form";
import { DataError } from "@/components/ui/data-state";
import { getProjectFormOptions } from "@/lib/data/queries";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getProjectFormOptions(id);
  if (!result.error && (!result.data || !result.data.record)) notFound();
  return <AuthenticatedShell title="แก้ไขข้อเสนอโครงการ">{result.error || !result.data ? <DataError message={result.error ?? "ไม่พบโครงการ"} /> : <ProjectForm options={result.data} />}</AuthenticatedShell>;
}
