import { StatusPill } from "@/components/ui/module-primitives";
import { projectApprovalPresentation } from "../approval-state";
import type { ProjectRow } from "../types";

export function ProjectApprovalStatus({ project }: { project: ProjectRow }) {
  const { label, tone } = projectApprovalPresentation(project);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-[11px] text-stone-600">สถานะการอนุมัติ:</span>
      <StatusPill tone={tone}>{label}</StatusPill>
    </div>
  );
}
