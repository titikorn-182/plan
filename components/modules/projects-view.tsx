"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  FileCheck2,
  Plus,
  Users,
} from "lucide-react";
import type { ProjectRow } from "@/features/projects/types";
import { formatThaiInteger, formatThaiNumber } from "@/features/shared/formatters";
import { EmptyData } from "@/components/ui/data-state";
import { ProgressBar, RegisterSection, StatusPill } from "@/components/ui/module-primitives";

function healthTone(health: string): "orange" | "red" | "green" {
  if (health === "ปกติ") return "green";
  if (health === "ล่าช้า" || health === "เสี่ยงสูง") return "red";
  return "orange";
}

export function ProjectsView({ projects }: { projects: ProjectRow[] }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id ?? "");
  const selected = projects.find((project) => project.id === selectedId) ?? projects[0];

  if (!selected)
    return (
      <RegisterSection title="ทะเบียนโครงการ">
        <EmptyData
          title="ยังไม่มีโครงการ"
          detail="โครงการที่อยู่ในขอบเขตสิทธิ์ของคุณจะแสดงที่นี่"
        />
      </RegisterSection>
    );

  const activeCount = projects.filter((item) => item.progress > 0 && item.progress < 100).length;
  const watchCount = projects.filter(
    (item) => item.health === "เฝ้าระวัง" || item.health === "เสี่ยงสูง",
  ).length;
  const delayedCount = projects.filter((item) => item.health === "ล่าช้า").length;

  return (
    <div className="space-y-5">
      <section className="grid border border-stone-200 bg-white lg:grid-cols-[1fr_auto]">
        <div className="grid sm:grid-cols-4">
          {[
            { n: projects.length, label: "โครงการทั้งหมด" },
            { n: activeCount, label: "กำลังดำเนินงาน" },
            { n: watchCount, label: "ต้องเฝ้าระวัง" },
            { n: delayedCount, label: "ล่าช้า" },
          ].map((item, index) => (
            <article
              className={`flex items-center gap-3 px-5 py-4 ${index < 3 ? "border-b border-stone-200 sm:border-r sm:border-b-0" : ""}`}
              key={item.label}
            >
              <strong
                className={`text-2xl tabular-nums ${index > 1 ? "text-[#d8460b]" : "text-stone-950"}`}
              >
                {formatThaiInteger(item.n)}
              </strong>
              <span className="text-xs text-stone-600">{item.label}</span>
            </article>
          ))}
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 border-t border-stone-200 bg-[#cf430c] px-5 py-3 text-sm font-semibold text-white hover:bg-[#ad3507] lg:border-t-0 lg:border-l"
          href="/projects/new"
        >
          <Plus size={17} /> สร้างข้อเสนอโครงการ
        </Link>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <RegisterSection
          title="ทะเบียนโครงการ"
          aside={
            <button className="text-xs font-semibold text-[#b53807]" type="button">
              ตัวกรองขั้นสูง
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead className="bg-stone-50 text-stone-600">
                <tr className="border-b border-stone-200">
                  <th className="px-4 py-3">โครงการ / เจ้าของ</th>
                  <th className="px-3 py-3">หน่วยงาน</th>
                  <th className="px-3 py-3 text-right">งบอนุมัติ</th>
                  <th className="px-3 py-3">ความก้าวหน้า</th>
                  <th className="px-3 py-3">สุขภาพโครงการ</th>
                  <th className="px-3 py-3">สิ้นสุด</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr
                    className={`cursor-pointer border-b border-stone-200 transition-colors hover:bg-orange-50/60 ${selectedId === project.id ? "bg-[#fff3e9] shadow-[inset_3px_0_0_#df4a0c]" : "bg-white"}`}
                    key={project.id}
                    onClick={() => setSelectedId(project.id)}
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
                      <ProgressBar
                        value={project.progress}
                        tone={
                          project.health === "ปกติ"
                            ? "green"
                            : project.health === "ล่าช้า"
                              ? "red"
                              : "orange"
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill tone={healthTone(project.health)}>{project.health}</StatusPill>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{project.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RegisterSection>

        <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[120px]">
          <header className="border-b border-stone-200 px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <span className="border border-orange-300 bg-orange-50 px-2 py-1 text-xs font-bold text-[#b53807]">
                {selected.id}
              </span>
              <StatusPill tone={healthTone(selected.health)}>{selected.health}</StatusPill>
            </div>
            <h2 className="mt-3 text-lg font-bold leading-snug">{selected.title}</h2>
            <p className="mt-1 text-xs text-stone-500">{selected.unit}</p>
          </header>
          <div className="grid grid-cols-2 border-b border-stone-200">
            <div className="border-r border-stone-200 p-4">
              <small className="block text-stone-500">งบอนุมัติ</small>
              <b className="mt-1 block text-sm tabular-nums">
                {formatThaiNumber(selected.budget)} บาท
              </b>
            </div>
            <div className="p-4">
              <small className="block text-stone-500">เบิกจ่ายแล้ว</small>
              <b className="mt-1 block text-sm tabular-nums">
                {formatThaiNumber(selected.spent)} บาท
              </b>
            </div>
          </div>
          <section className="border-b border-stone-200 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold">วงจรโครงการ</h3>
              <b className="text-sm text-[#c9440b]">{selected.progress}%</b>
            </div>
            <div className="relative grid grid-cols-5">
              <div className="absolute top-2 right-[10%] left-[10%] h-px bg-stone-300" />
              {["คำของบ", "ข้อเสนอ", "ดำเนินงาน", "เบิกจ่าย", "ปิดโครงการ"].map((label, index) => (
                <div
                  className="relative z-10 flex flex-col items-center gap-1 text-center"
                  key={label}
                >
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
                <b className="max-w-44 text-right">{selected.owner}</b>
              </li>
              <li className="flex items-center gap-3">
                <CalendarClock className="text-orange-600" size={17} />
                <span className="flex-1">กำหนดสิ้นสุด</span>
                <b>{selected.due}</b>
              </li>
              <li className="flex items-center gap-3">
                <Users className="text-sky-700" size={17} />
                <span className="flex-1">หน่วยงาน</span>
                <b className="max-w-44 text-right">{selected.unit}</b>
              </li>
              <li className="flex items-center gap-3">
                <AlertTriangle
                  className={selected.health === "ปกติ" ? "text-emerald-600" : "text-red-600"}
                  size={17}
                />
                <span className="flex-1">สถานะติดตาม</span>
                <b>{selected.health}</b>
              </li>
            </ul>
          </section>
          <Link
            className="flex w-full items-center justify-between px-5 py-4 text-sm font-bold text-[#b53807] hover:bg-orange-50"
            href={selected.editable ? `/projects/${selected.uuid}/edit` : "/evidence"}
          >
            {selected.editable ? "แก้ไขข้อเสนอโครงการ" : "เปิดแฟ้มหลักฐาน"}{" "}
            <ChevronRight size={17} />
          </Link>
        </aside>
      </div>

      <RegisterSection
        title="ภาพรวมวงเงินตามสุขภาพโครงการ"
        aside={<span className="text-xs text-stone-500">หน่วย: ล้านบาท</span>}
      >
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "ปกติ",
              amount:
                projects
                  .filter((item) => item.health === "ปกติ")
                  .reduce((sum, item) => sum + item.budget, 0) / 1_000_000,
              icon: Check,
              color: "text-emerald-700",
            },
            {
              label: "เฝ้าระวัง",
              amount:
                projects
                  .filter((item) => item.health === "เฝ้าระวัง")
                  .reduce((sum, item) => sum + item.budget, 0) / 1_000_000,
              icon: CalendarClock,
              color: "text-orange-700",
            },
            {
              label: "เสี่ยงสูง/ล่าช้า",
              amount:
                projects
                  .filter((item) => item.health === "เสี่ยงสูง" || item.health === "ล่าช้า")
                  .reduce((sum, item) => sum + item.budget, 0) / 1_000_000,
              icon: AlertTriangle,
              color: "text-red-700",
            },
            {
              label: "คงเหลือรวม",
              amount: projects.reduce((sum, item) => sum + item.budget - item.spent, 0) / 1_000_000,
              icon: CircleDollarSign,
              color: "text-sky-800",
            },
          ].map(({ label, amount, icon: Icon, color }, index) => (
            <article
              className={`flex items-center gap-4 px-5 py-5 ${index < 3 ? "border-b border-stone-200 sm:border-r xl:border-b-0" : ""}`}
              key={label}
            >
              <Icon size={23} className={color} />
              <span>
                <small className="block text-stone-500">{label}</small>
                <b className="mt-1 block text-xl tabular-nums">
                  {formatThaiNumber(amount, { maximumFractionDigits: 2 })}
                </b>
              </span>
            </article>
          ))}
        </div>
      </RegisterSection>
    </div>
  );
}
