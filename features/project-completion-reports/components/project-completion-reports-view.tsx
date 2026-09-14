import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Send,
} from "lucide-react";
import type {
  ProjectCompletionReportRow,
  ProjectCompletionReportSummary,
} from "@/features/project-completion-reports/types";
import type { PaginationMeta } from "@/features/shared/pagination";
import { formatThaiInteger } from "@/features/shared/formatters";
import { EmptyData } from "@/components/ui/data-state";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { RegisterSection, StatusPill } from "@/components/ui/module-primitives";

function thaiDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function statusTone(status: string): "gray" | "orange" | "red" | "green" {
  if (status === "approved") return "green";
  if (status === "overdue" || status === "revision_required") return "red";
  if (["submitted", "under_review"].includes(status)) return "orange";
  return "gray";
}

function dueText(report: ProjectCompletionReportRow): string {
  if (report.status === "approved") return "ปิดรายงานแล้ว";
  if (["submitted", "under_review"].includes(report.status)) return "ส่งแล้ว · รอรับรอง";
  if (report.status === "revision_required") return "ส่งแล้ว · รอแก้ไข";
  if (report.daysRemaining < 0) return `เกินกำหนด ${Math.abs(report.daysRemaining)} วัน`;
  if (report.daysRemaining === 0) return "ครบกำหนดวันนี้";
  return `เหลือ ${report.daysRemaining} วัน`;
}

export function ProjectCompletionReportsView({
  pagination,
  reports,
  summary,
}: {
  pagination: PaginationMeta;
  reports: ProjectCompletionReportRow[];
  summary: ProjectCompletionReportSummary;
}) {
  return (
    <div className="space-y-5">
      <section className="grid border border-stone-200 bg-white lg:grid-cols-[260px_1fr]">
        <div className="border-b border-stone-200 bg-[#fff4eb] p-5 lg:border-r lg:border-b-0">
          <p className="text-xs font-semibold text-[#a83a0b]">มาตรฐานการส่งรายงาน</p>
          <strong className="mt-1 block text-3xl font-black tabular-nums text-[#c9440b]">
            15 วัน
          </strong>
          <span className="mt-2 block text-xs leading-5 text-stone-600">
            นับจากวันสิ้นสุดโครงการ ระบบติดตามกำหนดส่งให้อัตโนมัติ
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4">
          {[
            {
              label: "ใกล้ครบกำหนด",
              value: summary.dueSoon,
              icon: CalendarClock,
              tone: "text-orange-700",
            },
            { label: "เกินกำหนด", value: summary.overdue, icon: AlertCircle, tone: "text-red-700" },
            {
              label: "อยู่ระหว่างรับรอง",
              value: summary.waiting,
              icon: Send,
              tone: "text-sky-800",
            },
            {
              label: "รับรองแล้ว",
              value: summary.approved,
              icon: CheckCircle2,
              tone: "text-emerald-700",
            },
          ].map(({ icon: Icon, label, tone, value }, index) => (
            <article
              className={`flex items-center gap-4 px-5 py-4 sm:border-b-0 ${index % 2 === 0 ? "border-r border-stone-200" : ""} ${index < 2 ? "border-b border-stone-200" : ""} ${index < 3 ? "sm:border-r sm:border-stone-200" : ""}`}
              key={label}
            >
              <Icon className={tone} size={22} />
              <span>
                <b className="block text-2xl tabular-nums">{formatThaiInteger(value)}</b>
                <small className="text-xs text-stone-600">{label}</small>
              </span>
            </article>
          ))}
        </div>
      </section>

      <RegisterSection
        title="ทะเบียนรายงานผลการดำเนินงานโครงการ"
        aside={
          <Link
            className="inline-flex min-h-10 items-center gap-2 bg-[#cf430c] px-4 text-xs font-semibold text-white hover:bg-[#ad3507]"
            href="/reports/project-results/new"
          >
            <ClipboardCheck size={16} /> จัดทำรายงานผล
          </Link>
        }
      >
        <div className="hidden overflow-x-auto min-[700px]:block">
          <table className="w-full min-w-[980px] text-left text-xs">
            <thead className="bg-stone-50 text-stone-600">
              <tr className="border-b border-stone-200">
                <th className="px-4 py-3">โครงการ / หน่วยงาน</th>
                <th className="px-3 py-3">สิ้นสุดโครงการ</th>
                <th className="px-3 py-3">กำหนดส่งรายงาน</th>
                <th className="px-3 py-3">กรอบเวลา</th>
                <th className="px-3 py-3 text-center">หลักฐาน</th>
                <th className="px-3 py-3">สถานะ</th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  className="border-b border-stone-200 bg-white transition-colors hover:bg-orange-50/60"
                  key={report.projectId}
                >
                  <td className="px-4 py-3">
                    <b className="block text-sm">{report.title}</b>
                    <span className="mt-1 block text-[11px] text-stone-500">
                      {report.projectCode} · {report.unit} · ปีงบประมาณ {report.fiscalYear}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap tabular-nums">
                    {thaiDate(report.endsOn)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap font-semibold tabular-nums">
                    {thaiDate(report.dueAt)}
                  </td>
                  <td
                    className={`px-3 py-3 font-semibold ${report.daysRemaining < 0 && report.status !== "approved" ? "text-red-700" : "text-stone-700"}`}
                  >
                    {dueText(report)}
                  </td>
                  <td className="px-3 py-3 text-center font-semibold tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <FileCheck2 size={14} className="text-sky-800" /> {report.evidenceCount}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill tone={statusTone(report.status)}>{report.statusLabel}</StatusPill>
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      aria-label={`${report.reportId ? "เปิด" : "เริ่ม"}รายงาน ${report.projectCode}`}
                      className="grid size-8 place-items-center hover:bg-orange-100 hover:text-[#b53807]"
                      href={
                        report.reportId
                          ? `/reports/project-results/${report.reportId}/edit`
                          : `/reports/project-results/new?projectId=${report.projectId}`
                      }
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="divide-y divide-stone-200 min-[700px]:hidden">
          {reports.map((report) => (
            <li className="space-y-3 p-4" key={report.projectId}>
              <div>
                <b className="block text-sm leading-6">{report.title}</b>
                <span className="mt-0.5 block text-[11px] text-stone-500">
                  {report.projectCode} · {report.unit}
                </span>
              </div>
              <dl className="grid grid-cols-2 border border-stone-200 text-xs">
                <div className="border-r border-stone-200 p-3">
                  <dt className="text-stone-500">สิ้นสุดโครงการ</dt>
                  <dd className="mt-1 font-semibold tabular-nums">{thaiDate(report.endsOn)}</dd>
                </div>
                <div className="bg-[#fff4eb] p-3">
                  <dt className="text-[#a83a0b]">กำหนดส่งรายงาน</dt>
                  <dd className="mt-1 font-semibold tabular-nums">{thaiDate(report.dueAt)}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={statusTone(report.status)}>{report.statusLabel}</StatusPill>
                <span
                  className={`text-xs font-semibold ${report.daysRemaining < 0 && report.status !== "approved" ? "text-red-700" : "text-stone-600"}`}
                >
                  {dueText(report)}
                </span>
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-sky-800">
                  <FileCheck2 size={14} /> {report.evidenceCount} หลักฐาน
                </span>
              </div>
              <Link
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-stone-300 text-sm font-semibold hover:border-orange-400 hover:text-[#b53807]"
                href={
                  report.reportId
                    ? `/reports/project-results/${report.reportId}/edit`
                    : `/reports/project-results/new?projectId=${report.projectId}`
                }
              >
                {report.reportId ? "เปิดรายงานผล" : "เริ่มจัดทำรายงาน"} <ArrowUpRight size={16} />
              </Link>
            </li>
          ))}
        </ul>
        {reports.length === 0 ? (
          <EmptyData
            title="ยังไม่มีโครงการที่รอรายงานผล"
            detail="โครงการที่ได้รับอนุมัติและมีวันสิ้นสุดจะแสดงที่นี่"
          />
        ) : null}
        <PaginationNav basePath="/reports/project-results" pagination={pagination} />
      </RegisterSection>
    </div>
  );
}
