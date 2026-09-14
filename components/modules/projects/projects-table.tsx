import Link from "next/link";
import { Download } from "lucide-react";
import { ProgressBar, StatusPill } from "@/components/ui/module-primitives";
import { formatThaiNumber } from "@/features/shared/formatters";
import type { ProjectRow } from "@/features/projects/types";
import { projectHealthTone, projectProgressTone } from "./project-view-utils";

export function ProjectsTable({
  projects,
  selectedId,
  onSelect,
}: {
  projects: ProjectRow[];
  selectedId: string;
  onSelect: (projectId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-xs">
        <thead className="bg-stone-50 text-stone-600">
          <tr className="border-b border-stone-200">
            <th className="px-4 py-3">โครงการ / เจ้าของ</th>
            <th className="px-3 py-3">หน่วยงาน</th>
            <th className="px-3 py-3 text-right">งบอนุมัติ</th>
            <th className="px-3 py-3">ความก้าวหน้า</th>
            <th className="px-3 py-3">สุขภาพโครงการ</th>
            <th className="px-3 py-3">สิ้นสุด</th>
            <th className="px-3 py-3 text-center">ข้อเสนอ</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              className={`cursor-pointer border-b border-stone-200 transition-colors hover:bg-orange-50/60 ${selectedId === project.id ? "bg-[#fff3e9] shadow-[inset_3px_0_0_#df4a0c]" : "bg-white"}`}
              key={project.id}
              onClick={() => onSelect(project.id)}
            >
              <td className="px-4 py-3">
                <b className="block text-sm">{project.title}</b>
                <span className="mt-1 block text-[11px] text-stone-500">
                  {project.id} · {project.owner}
                </span>
              </td>
              <td className="px-3 py-3">{project.unit}</td>
              <td className="px-3 py-3 text-right font-medium tabular-nums">
                {formatThaiNumber(project.budget)}
              </td>
              <td className="min-w-36 px-3 py-3">
                <div className="mb-1.5 flex justify-between">
                  <span>{project.progress}%</span>
                  <span className="text-stone-500">งาน</span>
                </div>
                <ProgressBar value={project.progress} tone={projectProgressTone(project.health)} />
              </td>
              <td className="px-3 py-3">
                <StatusPill tone={projectHealthTone(project.health)}>{project.health}</StatusPill>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">{project.due}</td>
              <td className="px-3 py-3 text-center">
                <Link
                  aria-label={`ดาวน์โหลด PDF ข้อเสนอโครงการ ${project.id}`}
                  className="inline-flex min-h-10 items-center gap-1.5 border border-orange-300 bg-white px-3 font-semibold text-[#b53807] hover:border-orange-500 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                  download
                  href={`/api/projects/${project.uuid}/proposal`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Download aria-hidden="true" size={15} /> PDF
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
