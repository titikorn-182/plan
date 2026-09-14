import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronRight,
  Download,
  FileCheck2,
  Users,
} from "lucide-react";
import { StatusPill } from "@/components/ui/module-primitives";
import { formatThaiNumber } from "@/features/shared/formatters";
import type { ProjectRow } from "@/features/projects/types";
import { projectHealthTone } from "./project-view-utils";

export function ProjectInspector({ project }: { project: ProjectRow }) {
  return (
    <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[120px]">
      <header className="border-b border-stone-200 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <span className="border border-orange-300 bg-orange-50 px-2 py-1 text-xs font-bold text-[#b53807]">
            {project.id}
          </span>
          <StatusPill tone={projectHealthTone(project.health)}>{project.health}</StatusPill>
        </div>
        <h2 className="mt-3 text-lg font-bold leading-snug">{project.title}</h2>
        <p className="mt-1 text-xs text-stone-500">{project.unit}</p>
      </header>
      <div className="grid grid-cols-2 border-b border-stone-200">
        <div className="border-r border-stone-200 p-4">
          <small className="block text-stone-500">งบอนุมัติ</small>
          <b className="mt-1 block text-sm tabular-nums">{formatThaiNumber(project.budget)} บาท</b>
        </div>
        <div className="p-4">
          <small className="block text-stone-500">เบิกจ่ายแล้ว</small>
          <b className="mt-1 block text-sm tabular-nums">{formatThaiNumber(project.spent)} บาท</b>
        </div>
      </div>
      <section className="border-b border-stone-200 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">วงจรโครงการ</h3>
          <b className="text-sm text-[#c9440b]">{project.progress}%</b>
        </div>
        <div className="relative grid grid-cols-5">
          <div className="absolute top-2 right-[10%] left-[10%] h-px bg-stone-300" />
          {["คำของบ", "ข้อเสนอ", "ดำเนินงาน", "เบิกจ่าย", "ปิดโครงการ"].map((label, index) => (
            <div className="relative z-10 flex flex-col items-center gap-1 text-center" key={label}>
              <span
                className={`grid size-4 place-items-center rounded-full border-2 bg-white ${index < 2 ? "border-[#df4a0c]" : "border-stone-400"}`}
              >
                {index === 0 ? <Check size={9} className="text-[#df4a0c]" /> : null}
              </span>
              <small
                className={`text-[8px] ${index === 1 ? "font-bold text-[#c9440b]" : "text-stone-500"}`}
              >
                {label}
              </small>
            </div>
          ))}
        </div>
      </section>
      <section className="border-b border-stone-200 p-5">
        <h3 className="mb-3 text-sm font-bold">ข้อมูลกำกับโครงการ</h3>
        <ul className="space-y-3 text-xs">
          <li className="flex items-center gap-3">
            <FileCheck2 className="text-emerald-600" size={17} />
            <span className="flex-1">เจ้าของโครงการ</span>
            <b className="max-w-44 text-right">{project.owner}</b>
          </li>
          <li className="flex items-center gap-3">
            <CalendarClock className="text-orange-600" size={17} />
            <span className="flex-1">กำหนดสิ้นสุด</span>
            <b>{project.due}</b>
          </li>
          <li className="flex items-center gap-3">
            <Users className="text-sky-700" size={17} />
            <span className="flex-1">หน่วยงาน</span>
            <b className="max-w-44 text-right">{project.unit}</b>
          </li>
          <li className="flex items-center gap-3">
            <AlertTriangle
              className={project.health === "ปกติ" ? "text-emerald-600" : "text-red-600"}
              size={17}
            />
            <span className="flex-1">สถานะติดตาม</span>
            <b>{project.health}</b>
          </li>
        </ul>
      </section>
      <div className="grid gap-px bg-stone-200">
        <Link
          className="flex min-h-12 w-full items-center justify-between bg-[#cf430c] px-5 py-3 text-sm font-bold text-white hover:bg-[#ad3507] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white"
          download
          href={`/api/projects/${project.uuid}/proposal`}
        >
          <span className="inline-flex items-center gap-2">
            <Download aria-hidden="true" size={17} /> ดาวน์โหลด PDF ข้อเสนอโครงการ
          </span>
          <ChevronRight aria-hidden="true" size={17} />
        </Link>
        <Link
          className="flex min-h-12 w-full items-center justify-between bg-white px-5 py-3 text-sm font-bold text-[#b53807] hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-orange-600"
          href={project.editable ? `/projects/${project.uuid}/edit` : "/evidence"}
        >
          {project.editable ? "แก้ไขข้อเสนอโครงการ" : "เปิดแฟ้มหลักฐาน"}{" "}
          <ChevronRight aria-hidden="true" size={17} />
        </Link>
      </div>
    </aside>
  );
}
