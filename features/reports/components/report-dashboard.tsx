"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { REPORT_DEFINITIONS, getReportDefinition } from "@/features/reports/definitions";
import type { ReportKind } from "@/features/reports/types";
import type { ReportingPeriod } from "@/features/shared/types";
import {
  DASHBOARD_STATUS_LABELS,
  summarizeDashboard,
  type DashboardRecord,
} from "@/features/reports/dashboard";

const number = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const pageSize = 20;

function Bars({
  title,
  items,
  unit,
}: {
  title: string;
  items: { label: string; value: number }[];
  unit: string;
}) {
  const max = unit === "%" ? 100 : Math.max(...items.map((item) => item.value), 1);
  return (
    <section className="border border-stone-200 bg-white p-5">
      <h2 className="mb-5 text-base font-bold">{title}</h2>
      {items.length ? (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.label}>
              <div className="mb-1 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                <span className="break-words">{item.label}</span>
                <strong className="shrink-0 tabular-nums">
                  {number.format(item.value)} {unit}
                </strong>
              </div>
              <div className="h-2 bg-stone-100" aria-hidden="true">
                <div
                  className="h-full bg-[#cf430c]"
                  style={{ width: `${Math.min(100, (Math.max(0, item.value) / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-stone-600">ยังไม่มีข้อมูลสำหรับสรุป</p>
      )}
    </section>
  );
}

export function ReportDashboard({
  kind,
  period,
  records,
}: {
  kind: ReportKind;
  period: ReportingPeriod;
  records: DashboardRecord[];
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(
    () =>
      records.filter(
        (row) =>
          (!group || row.group === group) &&
          `${row.code} ${row.title} ${row.group}`
            .toLocaleLowerCase("th")
            .includes(query.trim().toLocaleLowerCase("th")),
      ),
    [records, query, group],
  );
  const summary = useMemo(() => summarizeDashboard(kind, filtered), [kind, filtered]);
  const definition = getReportDefinition(kind);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const metrics =
    kind === "projects"
      ? [
          ["โครงการที่แสดง", `${summary.count} โครงการ`],
          ["งบอนุมัติรวม", `${number.format(summary.totalAmount)} บาท`],
          [
            "ความก้าวหน้าเฉลี่ย",
            summary.averageProgress === null
              ? "ยังไม่มีข้อมูล"
              : `${number.format(summary.averageProgress)}%`,
          ],
        ]
      : kind === "kpi"
        ? [
            ["ผล KPI ที่แสดง", `${summary.count} รายการ`],
            ["บรรลุเป้าหมาย", `${summary.achieved} รายการ`],
            ["รับรองแล้ว", `${summary.verified} รายการ`],
          ]
        : [
            ["รายการที่แสดง", `${summary.count} รายการ`],
            [
              kind === "budget" ? "วงเงินคำขอรวมทุกสถานะ" : "ยอดบันทึกรวมทุกสถานะ",
              `${number.format(summary.totalAmount)} บาท`,
            ],
            ...(kind === "disbursements"
              ? [["ยอดที่กระทบยอดแล้ว", `${number.format(summary.reconciled)} บาท`]]
              : []),
          ];
  return (
    <div className="space-y-6">
      <Link
        href="/reports"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-orange-800"
      >
        <ArrowLeft size={16} />
        กลับคลังรายงานเดิม
      </Link>
      <header className="border-b-2 border-orange-600 pb-5">
        <h1 className="text-2xl font-bold">{definition.name}</h1>
        <p className="mt-2 text-sm text-stone-600">
          {period.fiscalYearLabel}
          {kind === "kpi" ? ` · ${period.quarterLabel} และผล KPI รายปี` : " · ทั้งปีงบประมาณ"}
        </p>
        <p className="mt-1 text-sm text-stone-600">
          ข้อมูลตามสิทธิ์ที่คุณเข้าถึงได้ · เปลี่ยนปีและไตรมาสจากแถบด้านบน
        </p>
      </header>
      <nav className="flex flex-wrap gap-2" aria-label="แดชบอร์ดรายงาน">
        {REPORT_DEFINITIONS.map((report) => (
          <Link
            key={report.kind}
            href={`/reports/dashboard/${report.kind}`}
            aria-current={kind === report.kind ? "page" : undefined}
            className={`border px-3 py-3 text-sm ${kind === report.kind ? "border-orange-700 bg-orange-700 text-white" : "border-stone-300 bg-white hover:bg-orange-50"}`}
          >
            {report.name}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-4 bg-stone-50 p-4 lg:flex-row lg:items-end">
        <label className="min-w-0 lg:flex-1">
          <span className="mb-2 block text-sm font-semibold">ค้นหารหัสหรือชื่อรายการ</span>
          <span className="flex items-center gap-2 border border-stone-400 bg-white px-3">
            <Search size={16} />
            <input
              className="h-11 min-w-0 w-full bg-transparent"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="รหัสหรือชื่อรายการ"
            />
          </span>
        </label>
        <label className="min-w-0 lg:max-w-sm">
          <span className="mb-2 block text-sm font-semibold">
            {kind === "kpi" ? "กรอบการประเมิน" : "หน่วยงาน"}
          </span>
          <select
            aria-label="กรองหน่วยงานหรือกรอบการประเมิน"
            className="h-11 w-full border border-stone-400 bg-white px-3 text-sm"
            value={group}
            onChange={(event) => {
              setGroup(event.target.value);
              setPage(1);
            }}
          >
            <option value="">ทั้งหมด</option>
            {[...new Set(records.map((row) => row.group))].sort().map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <button
          className="min-h-11 border border-stone-300 px-4 text-sm hover:bg-white disabled:opacity-50"
          type="button"
          disabled={!query && !group}
          onClick={() => {
            setQuery("");
            setGroup("");
            setPage(1);
          }}
        >
          ล้างตัวกรอง
        </button>
      </div>
      <p className="text-sm text-stone-600" role="status">
        แสดง {filtered.length} จาก {records.length} รายการ · กราฟและยอดสรุปคำนวณตามตัวกรองเดียวกัน
      </p>
      <dl className="flex flex-wrap gap-x-10 gap-y-5 border-y border-stone-200 bg-white p-5">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-stone-600">{label}</dt>
            <dd className="mt-2 text-xl font-bold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-6 text-stone-600">
        {kind === "budget"
          ? "วงเงินคำขอรวมรายการทุกสถานะ รวมฉบับร่างและรายการยกเลิก ไม่ใช่วงเงินที่ได้รับอนุมัติ"
          : kind === "projects"
            ? "ความก้าวหน้าเฉลี่ยใช้ค่าเฉลี่ยรายโครงการที่มีข้อมูล ไม่ถ่วงน้ำหนักด้วยงบประมาณ และรวมทุกสถานะโครงการ"
            : kind === "disbursements"
              ? "แสดงยอดบันทึกครบ 4 ไตรมาส รวมรายการรอเอกสารและล่าช้า แยกยอดที่กระทบยอดแล้วไว้ต่างหาก ตัวเลขทั้งหมดไม่ใช่การยืนยันยอดจ่ายเงินจริง"
              : "บรรลุเป้าหมายอ้างอิงผลประเมินที่บันทึกไว้ ส่วนรับรองแล้วนับจากขั้นตอนรับรองผล ไม่รวมค่าผลจริงของ KPI ต่างหน่วยเข้าด้วยกัน"}
      </p>
      <div className="grid gap-5 xl:grid-cols-2">
        <Bars
          title={
            kind === "disbursements"
              ? "ยอดบันทึกแยกตามไตรมาส"
              : kind === "kpi"
                ? "จำนวนผล KPI แยกตามกรอบ"
                : "วงเงินแยกตามหน่วยงาน (10 อันดับแรก)"
          }
          items={kind === "disbursements" ? summary.quarters : summary.groups.slice(0, 10)}
          unit={kind === "kpi" ? "รายการ" : "บาท"}
        />
        <Bars title="จำนวนรายการแยกตามสถานะ" items={summary.statuses} unit="รายการ" />
      </div>
      {kind === "projects" ? (
        <Bars
          title="ความก้าวหน้าโครงการ (10 รายการแรกตามตัวกรอง)"
          items={filtered
            .filter((row) => row.progress !== null)
            .slice(0, 10)
            .map((row) => ({ label: `${row.code} · ${row.title}`, value: row.progress ?? 0 }))}
          unit="%"
        />
      ) : null}
      <section className="border border-stone-200 bg-white">
        <h2 className="border-b border-stone-200 p-4 text-base font-bold">
          รายละเอียดประกอบแดชบอร์ด
        </h2>
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="ตารางรายละเอียด เลื่อนแนวนอนได้"
        >
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-stone-50">
              <tr>
                {[
                  "รหัส / รายการ",
                  kind === "kpi" ? "กรอบ" : "หน่วยงาน",
                  "สถานะ",
                  kind === "kpi" ? "ผลจริง / เป้าหมาย" : "จำนวนเงิน (บาท)",
                  kind === "projects"
                    ? "ความก้าวหน้า"
                    : kind === "kpi"
                      ? "การรับรอง"
                      : kind === "disbursements"
                        ? "ไตรมาส"
                        : "",
                ]
                  .filter(Boolean)
                  .map((label) => (
                    <th key={label} scope="col" className="p-3">
                      {label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id} className="border-t border-stone-200">
                  <td className="max-w-sm p-3">
                    <strong>{row.code}</strong>
                    <span className="mt-1 block">{row.title}</span>
                    {kind === "kpi" ? (
                      <span className="mt-1 block text-xs text-stone-600">
                        รอบผล: {row.quarter === null ? "รายปี" : `ไตรมาส ${row.quarter}`}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">{row.group}</td>
                  <td className="p-3">
                    {DASHBOARD_STATUS_LABELS[
                      kind === "kpi" && row.actual === null ? "no_data" : row.status
                    ] ?? row.status}
                  </td>
                  <td className="p-3 tabular-nums">
                    {kind === "kpi"
                      ? `${row.actual === null ? "ยังไม่กรอก" : number.format(row.actual)} / ${row.target === null ? "—" : number.format(row.target)} ${row.unit}`
                      : row.amount === null
                        ? "—"
                        : number.format(row.amount)}
                  </td>
                  {kind !== "budget" ? (
                    <td className="p-3">
                      {kind === "projects"
                        ? row.progress === null
                          ? "ยังไม่มีข้อมูล"
                          : `${number.format(row.progress)}%`
                        : kind === "kpi"
                          ? row.verified
                            ? "รับรองแล้ว"
                            : "ยังไม่รับรอง"
                          : row.quarter}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length ? (
          <p className="p-8 text-center text-stone-600">
            {records.length
              ? "ไม่พบรายการที่ตรงกับตัวกรอง ลองล้างตัวกรองหรือเปลี่ยนคำค้น"
              : "ยังไม่มีข้อมูลในรอบปีและขอบเขตสิทธิ์นี้ กรุณาตรวจปีงบประมาณหรือบันทึกข้อมูลในทะเบียนต้นทาง"}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t border-stone-200 p-4 text-sm">
          <button
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
            className="min-h-11 border px-3 disabled:opacity-40"
          >
            ก่อนหน้า
          </button>
          <span>
            หน้า {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
            className="min-h-11 border px-3 disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      </section>
    </div>
  );
}
