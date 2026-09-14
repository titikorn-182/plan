import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { REPORT_DEFINITIONS } from "@/features/reports/definitions";

export function ReportDashboardLinks() {
  return (
    <section className="mb-6 border border-stone-200 bg-white">
      <header className="border-b border-stone-200 p-5">
        <h2 className="text-xl font-bold">แดชบอร์ดสรุปรายงาน</h2>
        <p className="mt-2 text-sm text-stone-600">
          เปิดดูกราฟ ยอดสรุป และรายละเอียด · คลังรายงานและการตั้งเวลาเวอร์ชันเดิมอยู่ด้านล่าง
        </p>
      </header>
      <nav aria-label="เลือกแดชบอร์ดรายงาน" className="divide-y divide-stone-200">
        {REPORT_DEFINITIONS.map((report) => (
          <Link
            className="flex items-center justify-between gap-4 p-5 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-700"
            key={report.kind}
            href={`/reports/dashboard/${report.kind}`}
          >
            <span>
              <strong className="block text-base">{report.name}</strong>
              <span className="mt-1 block text-sm text-stone-600">{report.description}</span>
            </span>
            <ArrowUpRight className="shrink-0 text-orange-700" size={20} />
          </Link>
        ))}
      </nav>
    </section>
  );
}
