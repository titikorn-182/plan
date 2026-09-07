"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  Download,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  PieChart,
  Printer,
  Trash2,
} from "lucide-react";
import { RegisterSection, StatusPill } from "@/components/ui/module-primitives";
import {
  createReportScheduleAction,
  deleteReportScheduleAction,
  toggleReportScheduleAction,
} from "@/features/reports/actions";
import { REPORT_DEFINITIONS } from "@/features/reports/definitions";
import type { ReportCadence, ReportSchedule } from "@/features/reports/types";
import type { ReportingPeriod } from "@/features/shared/types";

const reportIcons = {
  budget: FileSpreadsheet,
  projects: BarChart3,
  disbursements: PieChart,
  kpi: FileText,
} as const;
const cadenceLabels = {
  weekly: "ทุกสัปดาห์",
  monthly: "ทุกเดือน",
  quarterly: "ทุกไตรมาส",
} as const;
const weekdayLabels = ["", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"];

function scheduleLabel(schedule: ReportSchedule): string {
  const day =
    schedule.cadence === "weekly"
      ? `วัน${weekdayLabels[schedule.dayOfWeek ?? 1]}`
      : `วันที่ ${schedule.dayOfMonth}`;
  return `${cadenceLabels[schedule.cadence]} · ${day} · ${schedule.sendTime} น. · ${schedule.format.toUpperCase()}`;
}

export function ReportsHub({
  period,
  schedules,
  scheduleError,
}: {
  period: ReportingPeriod;
  schedules: ReportSchedule[];
  scheduleError: string | null;
}) {
  const [state, action, pending] = useActionState(createReportScheduleAction, {});
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [cadence, setCadence] = useState<ReportCadence>("weekly");

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
      <RegisterSection
        title="คลังรายงานมาตรฐาน"
        aside={
          <span className="text-xs text-stone-500">
            {period.fiscalYearLabel} · {period.quarterLabel}
          </span>
        }
      >
        <div className="divide-y divide-stone-200">
          {REPORT_DEFINITIONS.map((report) => {
            const Icon = reportIcons[report.kind];
            return (
              <article
                className="grid items-center gap-4 px-5 py-5 sm:grid-cols-[40px_1fr_auto]"
                key={report.kind}
              >
                <span className="grid size-10 place-items-center border border-orange-200 bg-orange-50 text-[#c9440b]">
                  <Icon size={20} />
                </span>
                <span>
                  <b className="block text-sm">{report.name}</b>
                  <small className="mt-1 block text-xs text-stone-500">{report.description}</small>
                  <small className="mt-2 block text-[10px] font-semibold text-stone-400">
                    {report.formats.map((format) => format.toUpperCase()).join(" / ")}
                  </small>
                </span>
                <span className="flex flex-wrap gap-2">
                  <Link
                    className="inline-flex min-h-10 items-center justify-center gap-2 border border-stone-300 px-3 text-xs font-semibold hover:border-[#d8470c] hover:text-[#b53807]"
                    href={`/reports/print/${report.kind}`}
                    target="_blank"
                  >
                    <Printer size={15} /> PDF
                  </Link>
                  <Link
                    className="inline-flex min-h-10 items-center justify-center gap-2 bg-[#cf430c] px-3 text-xs font-semibold text-white hover:bg-[#ad3507]"
                    href={`/api/reports/${report.kind}`}
                  >
                    <Download size={15} /> XLSX
                  </Link>
                </span>
              </article>
            );
          })}
        </div>
      </RegisterSection>

      <aside className="space-y-5">
        <section className="border border-stone-200 bg-white">
          <header className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold">รายงานตามกำหนด</h2>
              <p className="mt-1 text-[10px] text-stone-500">บันทึกคิวงานตามบัญชีผู้ใช้</p>
            </div>
            <CalendarClock size={18} className="text-[#c9440b]" />
          </header>
          {scheduleError ? (
            <p className="m-4 border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {scheduleError}
            </p>
          ) : null}
          <div className="divide-y divide-stone-200">
            {schedules.map((schedule) => (
              <article className="p-4" key={schedule.id}>
                <div className="flex justify-between gap-3">
                  <b className="text-xs">{schedule.name}</b>
                  <StatusPill tone={schedule.isActive ? "green" : "orange"}>
                    {schedule.isActive ? "เปิดใช้" : "พักไว้"}
                  </StatusPill>
                </div>
                <p className="mt-2 text-[11px] text-stone-500">{scheduleLabel(schedule)}</p>
                <div className="mt-3 flex gap-2">
                  <form action={toggleReportScheduleAction}>
                    <input type="hidden" name="id" value={schedule.id} />
                    <input type="hidden" name="isActive" value={String(!schedule.isActive)} />
                    <button
                      className="border border-stone-300 px-3 py-1.5 text-[11px] font-semibold"
                      type="submit"
                    >
                      {schedule.isActive ? "พัก" : "เปิดใช้"}
                    </button>
                  </form>
                  <form action={deleteReportScheduleAction}>
                    <input type="hidden" name="id" value={schedule.id} />
                    <button
                      className="inline-flex items-center gap-1 border border-stone-300 px-3 py-1.5 text-[11px] font-semibold text-red-700"
                      type="submit"
                    >
                      <Trash2 size={12} /> ลบ
                    </button>
                  </form>
                </div>
              </article>
            ))}
            {!scheduleError && schedules.length === 0 ? (
              <p className="p-4 text-xs text-stone-500">ยังไม่มีกำหนดการที่บันทึกไว้</p>
            ) : null}
          </div>
          {showScheduleForm ? (
            <form action={action} className="space-y-3 border-t border-orange-200 bg-[#fffaf6] p-4">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold">ชื่อกำหนดการ</span>
                <input
                  className="min-h-10 w-full border border-stone-300 bg-white px-3 text-sm"
                  name="name"
                  maxLength={120}
                  required
                  placeholder="เช่น สรุปผู้บริหารประจำสัปดาห์"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold">รายงาน</span>
                <select
                  className="min-h-10 w-full border border-stone-300 bg-white px-3 text-sm"
                  name="reportKind"
                >
                  {REPORT_DEFINITIONS.map((report) => (
                    <option value={report.kind} key={report.kind}>
                      {report.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="mb-1 block text-xs font-semibold">รูปแบบ</span>
                  <select
                    className="min-h-10 w-full border border-stone-300 bg-white px-3 text-sm"
                    name="format"
                  >
                    <option value="pdf">PDF</option>
                    <option value="xlsx">XLSX</option>
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold">ความถี่</span>
                  <select
                    className="min-h-10 w-full border border-stone-300 bg-white px-3 text-sm"
                    name="cadence"
                    value={cadence}
                    onChange={(event) => setCadence(event.target.value as ReportCadence)}
                  >
                    <option value="weekly">รายสัปดาห์</option>
                    <option value="monthly">รายเดือน</option>
                    <option value="quarterly">รายไตรมาส</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="mb-1 block text-xs font-semibold">
                    {cadence === "weekly" ? "วันในสัปดาห์" : "วันที่"}
                  </span>
                  {cadence === "weekly" ? (
                    <select
                      className="min-h-10 w-full border border-stone-300 bg-white px-3 text-sm"
                      name="day"
                    >
                      {weekdayLabels.slice(1).map((label, index) => (
                        <option key={label} value={index + 1}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="min-h-10 w-full border border-stone-300 bg-white px-3 text-sm"
                      name="day"
                      type="number"
                      min="1"
                      max="28"
                      defaultValue="5"
                    />
                  )}
                </label>
                <label>
                  <span className="mb-1 block text-xs font-semibold">เวลา</span>
                  <input
                    className="min-h-10 w-full border border-stone-300 bg-white px-3 text-sm"
                    name="sendTime"
                    type="time"
                    defaultValue="08:00"
                    required
                  />
                </label>
              </div>
              {state.message ? (
                <p
                  className={`text-xs ${state.success ? "text-emerald-700" : "text-red-700"}`}
                  role="status"
                >
                  {state.message}
                </p>
              ) : null}
              <div className="flex gap-2">
                <button
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 bg-[#cf430c] px-4 text-xs font-semibold text-white disabled:opacity-50"
                  type="submit"
                  disabled={pending}
                >
                  {pending ? (
                    <LoaderCircle className="animate-spin motion-reduce:animate-none" size={14} />
                  ) : null}
                  บันทึกกำหนดการ
                </button>
                <button
                  className="min-h-10 border border-stone-300 bg-white px-4 text-xs font-semibold"
                  type="button"
                  onClick={() => setShowScheduleForm(false)}
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          ) : (
            <button
              className="w-full border-t border-stone-200 px-4 py-3 text-left text-xs font-bold text-[#b53807]"
              type="button"
              onClick={() => setShowScheduleForm(true)}
            >
              + เพิ่มกำหนดการ
            </button>
          )}
        </section>
        <section className="border border-stone-200 bg-white p-5">
          <CalendarClock className="text-sky-800" size={20} />
          <b className="mt-3 block text-sm">ขอบเขตการทำงาน</b>
          <p className="mt-2 text-xs leading-5 text-stone-500">
            ไฟล์ที่สร้างจะใช้ข้อมูลจริงตามสิทธิ์และรอบที่เลือก
            กำหนดการส่วนนี้ใช้บันทึกและจัดการคิวงาน การส่งไฟล์อัตโนมัติต้องเชื่อม Scheduled Runner
            และช่องทางส่งขององค์กรก่อนเปิดใช้จริง
          </p>
        </section>
      </aside>
    </div>
  );
}
