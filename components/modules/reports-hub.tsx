import { BarChart3, Download, FileSpreadsheet, FileText, PieChart, RefreshCw } from "lucide-react";
import { RegisterSection, StatusPill } from "@/components/ui/module-primitives";

const reports = [
  { name: "สรุปคำของบประมาณประจำปี", description: "แยกตามหน่วยงาน หมวดรายจ่าย และสถานะอนุมัติ", format: "XLSX / PDF", icon: FileSpreadsheet },
  { name: "สรุปสถานะและความก้าวหน้าโครงการ", description: "ความก้าวหน้า สุขภาพโครงการ ปัญหา และ Milestone", format: "XLSX / PDF", icon: BarChart3 },
  { name: "รายงานเบิกจ่ายงบประมาณรายไตรมาส", description: "แผน ผลจริง ร้อยละ และยอดคงเหลือรายโครงการ", format: "XLSX", icon: PieChart },
  { name: "รายงานผล KPI EdPEx & AUN-QA", description: "เป้าหมาย ผลจริง แนวโน้ม และสถานะหลักฐาน", format: "XLSX / PDF", icon: FileText },
];

export function ReportsHub() {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <RegisterSection title="คลังรายงานมาตรฐาน" aside={<span className="text-xs text-stone-500">ส่งออกตามสิทธิ์ของผู้ใช้งาน</span>}>
        <div className="divide-y divide-stone-200">{reports.map(({ name, description, format, icon: Icon }) => <article className="grid items-center gap-4 px-5 py-5 sm:grid-cols-[40px_1fr_auto]" key={name}><span className="grid size-10 place-items-center border border-orange-200 bg-orange-50 text-[#c9440b]"><Icon size={20} /></span><span><b className="block text-sm">{name}</b><small className="mt-1 block text-xs text-stone-500">{description}</small><small className="mt-2 block text-[10px] font-semibold text-stone-400">{format}</small></span><button className="inline-flex items-center justify-center gap-2 border border-stone-300 px-4 py-2 text-xs font-semibold hover:border-[#d8470c] hover:text-[#b53807]" type="button"><Download size={15} /> สร้างรายงาน</button></article>)}</div>
      </RegisterSection>

      <aside className="space-y-5">
        <section className="border border-stone-200 bg-white"><header className="border-b border-stone-200 px-4 py-3"><h2 className="text-sm font-bold">รายงานตามกำหนด</h2></header><div className="divide-y divide-stone-200"><article className="p-4"><div className="flex justify-between gap-3"><b className="text-xs">สรุปผู้บริหารประจำสัปดาห์</b><StatusPill tone="green">พร้อมส่ง</StatusPill></div><p className="mt-2 text-[11px] text-stone-500">ทุกวันจันทร์ · 08:00 น. · PDF</p></article><article className="p-4"><div className="flex justify-between gap-3"><b className="text-xs">เบิกจ่ายรายเดือน</b><StatusPill tone="orange">รอข้อมูล</StatusPill></div><p className="mt-2 text-[11px] text-stone-500">วันที่ 5 ของเดือน · XLSX</p></article></div><button className="w-full border-t border-stone-200 px-4 py-3 text-left text-xs font-bold text-[#b53807]" type="button">+ เพิ่มกำหนดการ</button></section>
        <section className="border border-stone-200 bg-white p-5"><RefreshCw className="text-sky-800" size={20} /><b className="mt-3 block text-sm">ข้อมูลอัปเดตล่าสุด</b><p className="mt-2 text-xs leading-5 text-stone-500">24 เม.ย. 2570 09:30 น.<br />รายการที่ผ่านการกระทบยอด 96.8%</p></section>
      </aside>
    </div>
  );
}

