"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { ProgressBar, RegisterSection, StatusPill } from "@/components/ui/module-primitives";
import { EmptyData } from "@/components/ui/data-state";
import type { DisbursementRow } from "@/features/disbursements/types";
import type { PaginationMeta } from "@/features/shared/pagination";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { formatThaiInteger, formatThaiNumber } from "@/features/shared/formatters";
import type { ReportingPeriod } from "@/features/shared/types";
import { DisbursementImportPanel } from "@/components/modules/disbursement-import-panel";

function tone(status: string): "green" | "orange" | "red" {
  if (status === "ตามแผน") return "green";
  if (status === "เบิกจ่ายล่าช้า") return "red";
  return "orange";
}

export function DisbursementsView({
  rows,
  pagination,
  period,
}: {
  rows: DisbursementRow[];
  pagination: PaginationMeta;
  period: ReportingPeriod;
}) {
  const [showImport, setShowImport] = useState(false);
  const totals = rows.reduce(
    (sum, row) => ({
      approved: sum.approved + row.approved,
      q1: sum.q1 + row.q1,
      q2: sum.q2 + row.q2,
      q3: sum.q3 + row.q3,
      q4: sum.q4 + row.q4,
    }),
    { approved: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  );
  const disbursed = totals.q1 + totals.q2 + totals.q3 + totals.q4;
  const disbursedPercent = totals.approved
    ? Math.round((disbursed / totals.approved) * 1000) / 10
    : 0;
  const averageTarget = rows.length
    ? rows.reduce((sum, row) => sum + row.target, 0) / rows.length
    : 0;
  const riskRows = rows.filter((row) => {
    const percent = row.approved ? ((row.q1 + row.q2 + row.q3 + row.q4) / row.approved) * 100 : 0;
    return percent < row.target - 15;
  });

  return (
    <div className="space-y-5">
      <section className="grid border border-stone-200 bg-white lg:grid-cols-[1.2fr_1fr]">
        <div className="border-b border-stone-200 p-5 lg:border-r lg:border-b-0">
          <div className="flex items-end justify-between gap-4">
            <span>
              <small className="block text-xs text-stone-500">ภาพรวมการเบิกจ่ายสะสม</small>
              <b className="mt-1 block text-3xl tabular-nums">
                {formatThaiNumber(disbursed / 1_000_000, { maximumFractionDigits: 2 })}{" "}
                <span className="text-sm font-medium text-stone-500">ล้านบาท</span>
              </b>
            </span>
            <b className="text-xl text-[#c9440b]">{disbursedPercent}%</b>
          </div>
          <div className="mt-4">
            <ProgressBar value={disbursedPercent} />
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-stone-500">
            <span>
              งบอนุมัติ{" "}
              {formatThaiNumber(totals.approved / 1_000_000, { maximumFractionDigits: 2 })} ล้านบาท
            </span>
            <span>
              เป้าหมายเฉลี่ย {formatThaiNumber(averageTarget, { maximumFractionDigits: 1 })}%
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3">
          {[
            { q: "Q1", value: totals.q1, state: "ยอดบันทึก" },
            { q: "Q2", value: totals.q2, state: "ยอดบันทึก" },
            { q: "Q3–Q4", value: totals.q3 + totals.q4, state: "ยอดบันทึก" },
          ].map((item, index) => (
            <article
              className={`px-4 py-5 ${index < 2 ? "border-r border-stone-200" : ""}`}
              key={item.q}
            >
              <small className="text-stone-500">{item.q}</small>
              <b className="mt-1 block text-xl tabular-nums">
                {formatThaiNumber(item.value / 1_000_000, { maximumFractionDigits: 2 })}
              </b>
              <span className="text-[10px] text-stone-500">ล้านบาท · {item.state}</span>
            </article>
          ))}
        </div>
      </section>

      <RegisterSection
        title="ทะเบียนการเบิกจ่ายรายไตรมาส"
        aside={
          <div className="flex gap-2">
            <Link
              className="inline-flex items-center gap-2 border border-stone-300 px-3 py-2 text-xs font-semibold"
              href="/api/disbursements/export"
            >
              <Download size={15} /> ส่งออก
            </Link>
            <button
              className="inline-flex items-center gap-2 border border-stone-300 px-3 py-2 text-xs font-semibold"
              type="button"
              aria-expanded={showImport}
              onClick={() => setShowImport((current) => !current)}
            >
              <Upload size={15} /> นำเข้า
            </button>
            <Link
              className="inline-flex items-center gap-2 bg-[#cf430c] px-3 py-2 text-xs font-semibold text-white"
              href="/disbursements/new"
            >
              บันทึกเบิกจ่าย
            </Link>
          </div>
        }
      >
        {showImport ? (
          <DisbursementImportPanel period={period} onClose={() => setShowImport(false)} />
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] text-left text-xs">
            <thead className="bg-stone-50 text-stone-600">
              <tr className="border-b border-stone-200">
                <th className="px-4 py-3">รายการ / หน่วยงาน</th>
                <th className="px-3 py-3 text-right">งบอนุมัติ</th>
                <th className="px-3 py-3 text-right">Q1</th>
                <th className="px-3 py-3 text-right">Q2</th>
                <th className="px-3 py-3 text-right">Q3</th>
                <th className="px-3 py-3 text-right">Q4</th>
                <th className="px-3 py-3 text-right">เบิกจ่ายสะสม</th>
                <th className="px-3 py-3">เทียบเป้าหมาย</th>
                <th className="px-3 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const total = row.q1 + row.q2 + row.q3 + row.q4;
                const percent = row.approved ? Math.round((total / row.approved) * 1000) / 10 : 0;
                return (
                  <tr
                    className="border-b border-stone-200 bg-white hover:bg-orange-50/60"
                    key={row.uuid}
                  >
                    <td className="px-4 py-3">
                      <b className="block text-sm">{row.project}</b>
                      <span className="mt-1 block text-[11px] text-stone-500">
                        {row.id} · {row.unit}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatThaiInteger(row.approved)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatThaiInteger(row.q1)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular-nums">
                      {formatThaiInteger(row.q2)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.q3 ? formatThaiInteger(row.q3) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.q4 ? formatThaiInteger(row.q4) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums">
                      {formatThaiInteger(total)}
                      <small className="block font-normal text-stone-500">{percent}%</small>
                    </td>
                    <td className="min-w-36 px-3 py-3">
                      <div className="mb-1 flex justify-between">
                        <span>{percent}%</span>
                        <span className="text-stone-500">เป้า {row.target}%</span>
                      </div>
                      <ProgressBar
                        value={row.target ? (percent / row.target) * 100 : 0}
                        tone={
                          percent >= row.target
                            ? "green"
                            : percent < row.target - 15
                              ? "red"
                              : "orange"
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill tone={tone(row.status)}>{row.status}</StatusPill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-stone-300 bg-[#fffaf6] font-bold">
              <tr>
                <td className="px-4 py-4">รวมรายการที่แสดง</td>
                <td className="px-3 py-4 text-right">{formatThaiInteger(totals.approved)}</td>
                <td className="px-3 py-4 text-right">{formatThaiInteger(totals.q1)}</td>
                <td className="px-3 py-4 text-right">{formatThaiInteger(totals.q2)}</td>
                <td className="px-3 py-4 text-right">{formatThaiInteger(totals.q3)}</td>
                <td className="px-3 py-4 text-right">{formatThaiInteger(totals.q4)}</td>
                <td className="px-3 py-4 text-right text-[#c9440b]">
                  {formatThaiInteger(disbursed)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
          {rows.length === 0 ? (
            <EmptyData
              title="ยังไม่มีรายการเบิกจ่าย"
              detail="ข้อมูลตามขอบเขตสิทธิ์และปีงบประมาณจะแสดงที่นี่"
            />
          ) : null}
        </div>
        <PaginationNav basePath="/disbursements" pagination={pagination} />
      </RegisterSection>

      <section className="grid gap-px border border-stone-200 bg-stone-200 lg:grid-cols-3">
        <article className="bg-white p-5">
          <AlertTriangle className="text-red-600" size={20} />
          <b className="mt-3 block">วงเงินเสี่ยงเบิกจ่ายไม่ทัน</b>
          <strong className="mt-1 block text-2xl text-red-700">
            {formatThaiNumber(riskRows.reduce((sum, row) => sum + row.approved, 0) / 1_000_000, {
              maximumFractionDigits: 2,
            })}{" "}
            ล้านบาท
          </strong>
          <p className="mt-2 text-xs text-stone-500">
            {formatThaiInteger(riskRows.length)} โครงการต่ำกว่าเป้าหมายมากกว่า 15%
          </p>
        </article>
        <article className="bg-white p-5">
          <CheckCircle2 className="text-emerald-600" size={20} />
          <b className="mt-3 block">รายการตามแผน</b>
          <strong className="mt-1 block text-2xl">
            {formatThaiInteger(rows.filter((row) => row.status === "ตามแผน").length)} รายการ
          </strong>
          <p className="mt-2 text-xs text-stone-500">ยอดเบิกจ่ายเป็นไปตามเป้าหมายที่บันทึก</p>
        </article>
        <article className="bg-white p-5">
          <FileSpreadsheet className="text-sky-700" size={20} />
          <b className="mt-3 block">เอกสารรอตรวจสอบ</b>
          <strong className="mt-1 block text-2xl">
            {formatThaiInteger(rows.filter((row) => row.status === "รอเอกสาร").length)} รายการ
          </strong>
          <p className="mt-2 text-xs text-stone-500">ต้องแนบเอกสารให้ครบก่อนกระทบยอด</p>
        </article>
      </section>
    </div>
  );
}
