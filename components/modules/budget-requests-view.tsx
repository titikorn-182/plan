"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, ChevronDown, Download, FilePlus2, Search } from "lucide-react";
import type { BudgetRequest } from "@/features/budget-requests/types";
import { RegisterSection, StatusPill } from "@/components/ui/module-primitives";

const statusTone: Record<BudgetRequest["status"], "orange" | "red" | "green" | "gray"> = {
  "ฉบับร่าง": "gray",
  "รอตรวจสอบ": "orange",
  "รออนุมัติ": "orange",
  "อนุมัติแล้ว": "green",
  "ส่งกลับแก้ไข": "red",
  "ยกเลิก": "gray",
};

const formatter = new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pageSize = 10;

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export function BudgetRequestsView({ requests }: { requests: BudgetRequest[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ทั้งหมด");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => requests.filter((item) => {
    const matchesQuery = [item.id, item.title, item.unit].join(" ").toLocaleLowerCase("th").includes(query.toLocaleLowerCase("th"));
    return matchesQuery && (status === "ทั้งหมด" || item.status === status);
  }), [query, requests, status]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);

  function exportCsv() {
    const header = ["รหัสคำขอ", "ชื่อกิจกรรม/โครงการ", "หน่วยงาน", "หมวดงบ", "วงเงิน (บาท)", "สถานะ", "แก้ไขล่าสุด"];
    const data = rows.map((item) => [item.id, item.title, item.unit, item.category, item.amount, item.status, item.updated]);
    const csv = [header, ...data].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `budget-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const summary = [
    ["คำขอทั้งหมด", requests.length, `วงเงิน ${(requests.reduce((sum, item) => sum + item.amount, 0) / 1_000_000).toLocaleString("th-TH", { maximumFractionDigits: 2 })} ล้านบาท`],
    ["รอตรวจสอบ", requests.filter((item) => item.status === "รอตรวจสอบ").length, "อยู่ระหว่างตรวจความครบถ้วน"],
    ["รออนุมัติ", requests.filter((item) => item.status === "รออนุมัติ").length, "อยู่ในคิวผู้มีอำนาจอนุมัติ"],
    ["ส่งกลับแก้ไข", requests.filter((item) => item.status === "ส่งกลับแก้ไข").length, "รอเจ้าของคำขอดำเนินการ"],
  ] as const;

  return (
    <div className="space-y-5">
      <section className="grid border border-stone-200 bg-white sm:grid-cols-2 xl:grid-cols-4">
        {summary.map(([label, value, note], index) => (
          <article className={`flex min-h-24 items-center gap-4 px-5 py-4 ${index < 3 ? "border-b border-stone-200 sm:border-r xl:border-b-0" : ""}`} key={label}>
          <strong className="text-3xl font-bold text-[#d8460b] tabular-nums">{value.toLocaleString("th-TH")}</strong>
            <span><b className="block text-sm">{label}</b><small className="mt-1 block text-[11px] text-stone-500">{note}</small></span>
          </article>
        ))}
      </section>

      <RegisterSection
        title="ทะเบียนคำของบประมาณรายจ่ายประจำปี"
        aside={<span className="text-xs text-stone-500">แสดง {rows.length} จาก {requests.length} รายการ</span>}
      >
        <div className="grid gap-2 border-b border-stone-200 bg-[#fffdfa] p-3 md:grid-cols-[minmax(260px,1fr)_190px_auto_auto]">
          <label className="flex h-10 items-center gap-2 border border-stone-300 bg-white px-3 focus-within:border-[#dc4f12]">
            <Search size={17} className="text-stone-500" />
            <span className="sr-only">ค้นหาคำของบประมาณ</span>
            <input className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="ค้นหารหัส รายการ หรือหน่วยงาน" />
          </label>
          <label className="relative flex h-10 items-center border border-stone-300 bg-white px-3">
            <span className="sr-only">กรองตามสถานะ</span>
            <select className="w-full appearance-none bg-transparent pr-6 text-sm outline-none" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
              <option>ทั้งหมด</option><option>ฉบับร่าง</option><option>รอตรวจสอบ</option><option>รออนุมัติ</option><option>อนุมัติแล้ว</option><option>ส่งกลับแก้ไข</option><option>ยกเลิก</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3" size={15} />
          </label>
          <button className="inline-flex h-10 items-center justify-center gap-2 border border-stone-300 bg-white px-4 text-sm font-semibold hover:border-[#dc4f12] hover:text-[#c9440b]" type="button" onClick={exportCsv} disabled={rows.length === 0}><Download size={16} /> ส่งออก CSV</button>
          <Link className="inline-flex h-10 items-center justify-center gap-2 bg-[#cf430c] px-4 text-sm font-semibold text-white hover:bg-[#ad3507]" href="/budget-requests/new"><FilePlus2 size={16} /> สร้างคำขอ</Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-xs">
            <thead className="bg-stone-50 text-stone-600">
              <tr className="border-b border-stone-200">
                <th className="px-3 py-3 font-semibold">รหัสคำขอ</th>
                <th className="px-3 py-3 font-semibold">รายการ / หน่วยงาน</th>
                <th className="px-3 py-3 font-semibold">หมวดงบ</th>
                <th className="px-3 py-3 text-right font-semibold">วงเงิน (บาท)</th>
                <th className="px-3 py-3 font-semibold">สถานะ</th>
                <th className="px-3 py-3 font-semibold">แก้ไขล่าสุด</th>
                <th className="w-12 px-3 py-3"><span className="sr-only">เปิด</span></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((item) => (
                <tr className="border-b border-stone-200 bg-white transition-colors hover:bg-orange-50/60" key={item.uuid}>
                  <td className="px-3 py-3 font-semibold tabular-nums">{item.id}</td>
                  <td className="max-w-[380px] px-3 py-3"><b className="block truncate text-sm">{item.title}</b><span className="mt-1 block text-[11px] text-stone-500">{item.unit}</span></td>
                  <td className="px-3 py-3">{item.category}</td>
                  <td className="px-3 py-3 text-right font-medium tabular-nums">{formatter.format(item.amount)}</td>
                  <td className="px-3 py-3"><StatusPill tone={statusTone[item.status]}>{item.status}</StatusPill></td>
                  <td className="px-3 py-3 text-stone-600">{item.updated}</td>
                  <td className="px-3 py-3"><Link className="grid size-8 place-items-center border border-transparent hover:border-stone-300 hover:text-[#c9440b]" href={item.editable ? `/budget-requests/${item.uuid}/edit` : "/approvals"} aria-label={item.editable ? `แก้ไข ${item.id}` : `ติดตามสถานะ ${item.id}`} title={item.editable ? "แก้ไขคำขอ" : "ติดตาม Workflow"}><ArrowUpRight size={16} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <div className="grid min-h-48 place-items-center p-6 text-center text-sm text-stone-500">ไม่พบคำขอที่ตรงกับเงื่อนไข ลองเปลี่ยนคำค้นหรือสถานะ</div> : null}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs text-stone-500">
          <span>หน้า {page.toLocaleString("th-TH")} จาก {totalPages.toLocaleString("th-TH")} · แสดง {pageRows.length.toLocaleString("th-TH")} รายการ</span>
          <div className="flex gap-1"><button className="border border-stone-300 px-3 py-1.5 disabled:opacity-40" type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>ก่อนหน้า</button><span className="bg-[#cf430c] px-3 py-1.5 text-white" aria-current="page">{page.toLocaleString("th-TH")}</span><button className="border border-stone-300 px-3 py-1.5 disabled:opacity-40" type="button" disabled={page === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>ถัดไป</button></div>
        </footer>
      </RegisterSection>
    </div>
  );
}
