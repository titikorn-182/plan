import {
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Send,
} from "lucide-react";
import Link from "next/link";
import type { QuarterlyReportRow } from "@/features/quarterly-reports/types";
import { EmptyData } from "@/components/ui/data-state";
import { ProgressBar, RegisterSection, StatusPill } from "@/components/ui/module-primitives";
import { formatThaiInteger } from "@/features/shared/formatters";

function reportTone(status: string): "orange" | "red" | "green" | "gray" {
  if (status === "อนุมัติแล้ว") return "green";
  if (status === "เกินกำหนด" || status === "ต้องแก้ไข") return "red";
  if (status === "รอตรวจ") return "orange";
  return "gray";
}

export function QuarterlyReportsView({ reports }: { reports: QuarterlyReportRow[] }) {
  const submitted = reports.filter(
    (item) => item.status !== "ฉบับร่าง" && item.status !== "เกินกำหนด",
  ).length;
  const pending = reports.filter((item) => item.status === "รอตรวจ").length;
  const overdue = reports.filter((item) => item.status === "เกินกำหนด").length;
  const evidenceTotal = reports.reduce((sum, item) => sum + item.evidence, 0);
  const unitsToFollow = new Set(
    reports
      .filter((item) => item.status === "เกินกำหนด" || item.status === "ต้องแก้ไข")
      .map((item) => item.unit),
  ).size;
  const currentRound = reports[0]?.quarter ?? "ยังไม่มีรอบเปิด";
  const currentDue = reports[0]?.due ?? "—";
  return (
    <div className="space-y-5">
      <section className="border border-stone-200 bg-white">
        <div className="grid lg:grid-cols-[230px_1fr]">
          <div className="border-b border-stone-200 bg-[#fff4eb] p-5 lg:border-r lg:border-b-0">
            <p className="text-xs font-semibold text-[#b53807]">รอบรายงานปัจจุบัน</p>
            <strong className="mt-1 block text-2xl">{currentRound}</strong>
            <span className="mt-2 flex items-center gap-2 text-xs text-stone-600">
              <CalendarDays size={15} /> กำหนดส่ง {currentDue}
            </span>
          </div>
          <ol className="relative grid px-5 py-5 sm:grid-cols-4">
            <span className="absolute top-[34px] right-[12%] left-[12%] hidden h-px bg-stone-300 sm:block" />
            {[
              ["เปิดรอบ", "1 เม.ย.", "done"],
              ["หน่วยงานรายงาน", "1–10 เม.ย.", "done"],
              ["ตรวจสอบ", "11–14 เม.ย.", "active"],
              ["รับรองผล", "15 เม.ย.", "next"],
            ].map(([label, date, state], index) => (
              <li
                className="relative z-10 flex items-center gap-3 py-2 sm:flex-col sm:text-center"
                key={label}
              >
                <span
                  className={`grid size-7 place-items-center rounded-full border-2 bg-white text-xs font-bold ${state === "done" ? "border-emerald-600 text-emerald-700" : state === "active" ? "border-[#df4a0c] text-[#c9440b]" : "border-stone-300 text-stone-400"}`}
                >
                  {state === "done" ? <CheckCircle2 size={16} /> : index + 1}
                </span>
                <span>
                  <b className="block text-xs">{label}</b>
                  <small className="text-[10px] text-stone-500">{date}</small>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="grid border border-stone-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "ส่งรายงานแล้ว",
            value: `${submitted} / ${reports.length}`,
            note: reports.length ? `${Math.round((submitted / reports.length) * 100)}%` : "0%",
            icon: Send,
            tone: "text-emerald-700",
          },
          {
            label: "รอตรวจสอบ",
            value: String(pending),
            note: "รอผู้ตรวจรับรอง",
            icon: Clock3,
            tone: "text-orange-700",
          },
          {
            label: "เกินกำหนด",
            value: String(overdue),
            note: "ต้องเร่งติดตาม",
            icon: AlertCircle,
            tone: "text-red-700",
          },
          {
            label: "หลักฐานแนบ",
            value: String(evidenceTotal),
            note: "ไฟล์ในรายงานที่แสดง",
            icon: FileCheck2,
            tone: "text-sky-800",
          },
        ].map(({ label, value, note, icon: Icon, tone }, index) => (
          <article
            className={`flex items-center gap-4 px-5 py-4 ${index < 3 ? "border-b border-stone-200 sm:border-r xl:border-b-0" : ""}`}
            key={label}
          >
            <Icon size={23} className={tone} />
            <span>
              <b className="block text-xl tabular-nums">{value}</b>
              <small className="block text-xs font-semibold">{label}</small>
              <small className="text-[10px] text-stone-500">{note}</small>
            </span>
          </article>
        ))}
      </section>

      <RegisterSection
        title="ทะเบียนรายงานผลรายไตรมาส"
        aside={
          <div className="flex gap-2">
            <span className="border border-stone-300 px-3 py-2 text-xs font-semibold">
              ทุกหน่วยงาน
            </span>
            <Link
              className="bg-[#cf430c] px-3 py-2 text-xs font-semibold text-white"
              href="/reports/quarterly/new"
            >
              บันทึกรายงาน
            </Link>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-stone-50 text-stone-600">
              <tr className="border-b border-stone-200">
                <th className="px-4 py-3">โครงการ / หน่วยงาน</th>
                <th className="px-3 py-3">รอบรายงาน</th>
                <th className="px-3 py-3">กำหนดส่ง</th>
                <th className="px-3 py-3">ความก้าวหน้าสะสม</th>
                <th className="px-3 py-3 text-center">หลักฐาน</th>
                <th className="px-3 py-3">สถานะ</th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  className="border-b border-stone-200 bg-white hover:bg-orange-50/60"
                  key={report.uuid}
                >
                  <td className="px-4 py-3">
                    <b className="block text-sm">{report.title}</b>
                    <span className="mt-1 block text-[11px] text-stone-500">
                      {report.project} · {report.unit}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-semibold">{report.quarter}</td>
                  <td className="px-3 py-3">{report.due}</td>
                  <td className="min-w-44 px-3 py-3">
                    <div className="mb-1.5 flex justify-between">
                      <span>{report.progress}%</span>
                      <span className="text-stone-500">สะสม</span>
                    </div>
                    <ProgressBar
                      value={report.progress}
                      tone={report.status === "เกินกำหนด" ? "red" : "orange"}
                    />
                  </td>
                  <td className="px-3 py-3 text-center font-semibold tabular-nums">
                    {report.evidence}
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill tone={reportTone(report.status)}>{report.status}</StatusPill>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      className="grid size-8 place-items-center hover:text-[#c9440b]"
                      href={`/reports/quarterly/${report.uuid}/edit`}
                      aria-label={`เปิดรายงาน ${report.project}`}
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reports.length === 0 ? (
            <EmptyData
              title="ยังไม่มีรายงานในรอบนี้"
              detail="รายงานของโครงการที่คุณเข้าถึงได้จะแสดงที่นี่"
            />
          ) : null}
        </div>
      </RegisterSection>

      <section className="grid gap-px border border-stone-200 bg-stone-200 md:grid-cols-3">
        <article className="bg-white p-5">
          <span className="text-xs text-stone-500">รายงานเกินกำหนด</span>
          <b className="mt-2 block text-base">{formatThaiInteger(overdue)} รายการ</b>
          <p className="mt-2 text-xs leading-5 text-stone-600">ควรติดตามเจ้าของโครงการก่อนปิดรอบ</p>
        </article>
        <article className="bg-white p-5">
          <span className="text-xs text-stone-500">หน่วยงานที่ต้องติดตาม</span>
          <b className="mt-2 block text-base">{formatThaiInteger(unitsToFollow)} หน่วยงาน</b>
          <p className="mt-2 text-xs leading-5 text-stone-600">
            นับจากรายการเกินกำหนดและรายการที่ต้องแก้ไข
          </p>
        </article>
        <article className="bg-white p-5">
          <span className="text-xs text-stone-500">หลักฐานในรอบ</span>
          <b className="mt-2 block text-base">{formatThaiInteger(evidenceTotal)} ไฟล์</b>
          <p className="mt-2 text-xs leading-5 text-stone-600">
            ผู้ตรวจควรรับรองหลักฐานก่อนล็อกข้อมูล
          </p>
        </article>
      </section>
    </div>
  );
}
