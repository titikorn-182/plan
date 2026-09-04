"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2, FileWarning, Target } from "lucide-react";
import type { KpiRow } from "@/lib/domain";
import { EmptyData } from "@/components/ui/data-state";
import { ProgressBar, RegisterSection, StatusPill } from "@/components/ui/module-primitives";

function resultTone(status: string): "green" | "orange" | "red" {
  if (status === "บรรลุ") return "green";
  if (status === "ต่ำกว่าเป้า") return "red";
  return "orange";
}

export function KpiDashboard({ kpis }: { kpis: KpiRow[] }) {
  const [framework, setFramework] = useState<"ทั้งหมด" | "EdPEx" | "AUN-QA">("ทั้งหมด");
  const rows = useMemo(() => kpis.filter((row) => framework === "ทั้งหมด" || row.framework === framework), [framework, kpis]);
  const achieved = kpis.filter((row) => row.status === "บรรลุ").length;
  const watch = kpis.filter((row) => row.status === "เฝ้าระวัง").length;
  const gaps = kpis.filter((row) => row.status === "ต่ำกว่าเป้า" || row.status === "ไม่มีข้อมูล").length;
  const ratios = kpis.filter((row) => row.actual !== null && row.target > 0).map((row) => Math.min(100, ((row.actual ?? 0) / row.target) * 100));
  const overall = ratios.length ? ratios.reduce((sum, value) => sum + value, 0) / ratios.length : 0;
  const worstGap = kpis.reduce<{ name: string; gap: number } | null>((current, row) => {
    const gap = row.actual === null ? row.target : Math.max(0, row.target - row.actual);
    return !current || gap > current.gap ? { name: row.name, gap } : current;
  }, null);

  return (
    <div className="space-y-5">
      <section className="grid border border-stone-200 bg-white lg:grid-cols-[260px_1fr]">
        <div className="border-b border-stone-200 bg-[#fff4eb] p-5 lg:border-r lg:border-b-0"><span className="text-xs font-semibold text-[#b53807]">ผลการดำเนินงานภาพรวม</span><div className="mt-2 flex items-end gap-2"><strong className="text-4xl tabular-nums">{overall.toLocaleString("th-TH", { maximumFractionDigits: 1 })}</strong><span className="mb-1 text-sm text-stone-500">/ 100 คะแนน</span></div><div className="mt-4"><ProgressBar value={overall} /></div></div>
        <div className="grid sm:grid-cols-4">{[
          { label: "ตัวชี้วัดทั้งหมด", value: kpis.length, icon: Target, color: "text-sky-800" },
          { label: "บรรลุเป้าหมาย", value: achieved, icon: CheckCircle2, color: "text-emerald-700" },
          { label: "เฝ้าระวัง", value: watch, icon: AlertTriangle, color: "text-orange-700" },
          { label: "มีช่องว่างข้อมูล/ผลลัพธ์", value: gaps, icon: FileWarning, color: "text-red-700" },
        ].map(({ label, value, icon: Icon, color }, index) => <article className={`flex items-center gap-3 px-4 py-5 ${index < 3 ? "border-b border-stone-200 sm:border-r sm:border-b-0" : ""}`} key={label}><Icon size={20} className={color} /><span><b className="block text-2xl tabular-nums">{value.toLocaleString("th-TH")}</b><small className="text-[11px] text-stone-500">{label}</small></span></article>)}</div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <RegisterSection title="ทะเบียนตัวชี้วัด EdPEx & AUN-QA" aside={<div className="flex border border-stone-300 bg-white">{(["ทั้งหมด", "EdPEx", "AUN-QA"] as const).map((item) => <button className={`px-3 py-2 text-xs font-semibold ${framework === item ? "bg-[#cf430c] text-white" : "hover:bg-orange-50"}`} type="button" key={item} onClick={() => setFramework(item)}>{item}</button>)}</div>}>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-stone-50 text-stone-600"><tr className="border-b border-stone-200"><th className="px-4 py-3">รหัส / ตัวชี้วัด</th><th className="px-3 py-3">เจ้าภาพข้อมูล</th><th className="px-3 py-3 text-right">เป้าหมาย</th><th className="px-3 py-3 text-right">ผลจริง</th><th className="px-3 py-3">เทียบเป้าหมาย</th><th className="px-3 py-3">สถานะ</th><th className="w-12 px-3 py-3" /></tr></thead><tbody>{rows.map((row) => { const ratio = row.actual === null || row.target === 0 ? 0 : (row.actual / row.target) * 100; return <tr className="border-b border-stone-200 bg-white hover:bg-orange-50/60" key={row.uuid}><td className="px-4 py-3"><span className="font-bold text-[#b53807]">{row.code}</span><b className="mt-1 block text-sm">{row.name}</b></td><td className="px-3 py-3">{row.owner}</td><td className="px-3 py-3 text-right font-medium tabular-nums">{row.target} {row.unit}</td><td className={`px-3 py-3 text-right text-sm font-bold tabular-nums ${ratio < 90 ? "text-red-700" : ratio < 100 ? "text-orange-700" : "text-emerald-700"}`}>{row.actual ?? "—"} {row.actual === null ? "" : row.unit}</td><td className="min-w-40 px-3 py-3"><div className="mb-1 flex justify-between"><span>{Math.round(ratio)}%</span><span className="text-stone-500">ของเป้า</span></div><ProgressBar value={ratio} tone={ratio >= 100 ? "green" : ratio < 90 ? "red" : "orange"} /></td><td className="px-3 py-3"><StatusPill tone={resultTone(row.status)}>{row.status}</StatusPill></td><td className="px-3 py-3"><Link className="grid size-8 place-items-center hover:text-[#c9440b]" href={`/kpi/${row.uuid}/edit`} aria-label={`เปิด ${row.code}`}><ArrowUpRight size={16} /></Link></td></tr>; })}</tbody></table>{rows.length === 0 ? <EmptyData title="ไม่พบตัวชี้วัด" detail="ลองเลือกกรอบคุณภาพอื่น หรือตรวจสิทธิ์การเข้าถึงข้อมูล" /> : null}</div>
        </RegisterSection>

        <aside className="space-y-5">
          <section className="border border-stone-200 bg-white"><header className="border-b border-stone-200 px-4 py-3"><h2 className="text-sm font-bold">สถานะตามกรอบคุณภาพ</h2></header><div className="p-4"><div className="mb-4 flex h-4 overflow-hidden" aria-label={`บรรลุ ${achieved} เฝ้าระวัง ${watch} มีช่องว่าง ${gaps}`}><span className="bg-emerald-600" style={{ width: `${kpis.length ? (achieved / kpis.length) * 100 : 0}%` }} /><span className="bg-orange-500" style={{ width: `${kpis.length ? (watch / kpis.length) * 100 : 0}%` }} /><span className="bg-red-600" style={{ width: `${kpis.length ? (gaps / kpis.length) * 100 : 0}%` }} /></div><dl className="space-y-3 text-xs"><div className="flex justify-between"><dt className="flex items-center gap-2"><span className="size-2 bg-emerald-600" />บรรลุ</dt><dd className="font-bold">{achieved} ตัวชี้วัด</dd></div><div className="flex justify-between"><dt className="flex items-center gap-2"><span className="size-2 bg-orange-500" />เฝ้าระวัง</dt><dd className="font-bold">{watch} ตัวชี้วัด</dd></div><div className="flex justify-between"><dt className="flex items-center gap-2"><span className="size-2 bg-red-600" />ต่ำกว่าเป้า/ไม่มีข้อมูล</dt><dd className="font-bold">{gaps} ตัวชี้วัด</dd></div></dl></div></section>
          <section className="border border-stone-200 bg-white"><header className="border-b border-stone-200 px-4 py-3"><h2 className="text-sm font-bold">กติกาการแปลผล</h2></header><div className="space-y-3 p-4 text-xs leading-5 text-stone-600"><p><b className="text-stone-900">บรรลุ:</b> ผลจริงตั้งแต่ 100% ของเป้าหมาย</p><p><b className="text-stone-900">เฝ้าระวัง:</b> ผลจริง 90–99% ของเป้าหมาย</p><p><b className="text-stone-900">ต่ำกว่าเป้า:</b> ผลจริงต่ำกว่า 90% หรือไม่มีหลักฐานรับรอง</p></div></section>
        </aside>
      </div>

      <RegisterSection title="ประเด็นเพื่อการทบทวนของผู้บริหาร" aside={<span className="text-xs text-stone-500">คำนวณจากผลล่าสุดที่เข้าถึงได้</span>}>
        <div className="grid gap-px bg-stone-200 md:grid-cols-3"><article className="bg-white p-5"><b className="text-sm">ช่องว่างสูงสุด</b><strong className="mt-3 block text-2xl text-red-700">{worstGap?.gap.toLocaleString("th-TH", { maximumFractionDigits: 2 }) ?? "—"}</strong><p className="mt-2 text-xs text-stone-500">{worstGap?.name ?? "ยังไม่มีข้อมูลผลลัพธ์"}</p></article><article className="bg-white p-5"><b className="text-sm">ไม่มีข้อมูลผลจริง</b><strong className="mt-3 block text-2xl text-orange-700">{kpis.filter((row) => row.actual === null).length} ตัวชี้วัด</strong><p className="mt-2 text-xs text-stone-500">ควรติดตามเจ้าภาพข้อมูลก่อนรอบทบทวน</p></article><article className="bg-white p-5"><b className="text-sm">บรรลุเป้าหมาย</b><strong className="mt-3 block text-2xl text-emerald-700">{achieved} ตัวชี้วัด</strong><p className="mt-2 text-xs text-stone-500">คิดเป็น {kpis.length ? Math.round((achieved / kpis.length) * 100) : 0}% ของรายการที่แสดง</p></article></div>
      </RegisterSection>
    </div>
  );
}
