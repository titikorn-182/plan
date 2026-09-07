import { notFound } from "next/navigation";
import { ReportPrintButton } from "@/components/modules/report-print-button";
import { getReportData } from "@/features/reports/queries";
import { isReportKind } from "@/features/reports/types";
import { formatThaiNumber } from "@/features/shared/formatters";

function display(value: string | number | Date | null): string {
  if (value === null || value === "") return "—";
  if (value instanceof Date) return value.toLocaleDateString("th-TH");
  return typeof value === "number" ? formatThaiNumber(value, { maximumFractionDigits: 2 }) : value;
}

export default async function ReportPrintPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isReportKind(kind)) notFound();
  const result = await getReportData(kind);
  if (result.error) throw new Error(result.error);
  const report = result.data;
  return (
    <main className="print-report mx-auto min-h-screen max-w-[1400px] bg-white p-6 text-stone-950 sm:p-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#cf430c] pb-5">
        <div>
          <p className="text-xs font-bold tracking-wider text-[#b53807]">POLITICAL SCIENCE · UBU</p>
          <h1 className="mt-2 text-2xl font-bold">{report.title}</h1>
          <p className="mt-2 text-sm text-stone-600">
            {report.period.fiscalYearLabel} · {report.period.quarterLabel} · สร้างเมื่อ{" "}
            {new Date(report.generatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
          </p>
        </div>
        <ReportPrintButton />
      </header>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr>
              {report.columns.map((column) => (
                <th className="border border-stone-300 bg-orange-50 px-3 py-2" key={column.header}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((value, columnIndex) => (
                  <td className="border border-stone-300 px-3 py-2 align-top" key={columnIndex}>
                    {display(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {report.rows.length === 0 ? (
          <p className="border border-t-0 border-stone-300 p-8 text-center text-sm text-stone-500">
            ไม่พบข้อมูลในรอบและขอบเขตสิทธิ์นี้
          </p>
        ) : null}
      </div>
      <footer className="mt-6 border-t border-stone-300 pt-3 text-[10px] text-stone-500">
        ระบบบริหารจัดการงบประมาณและการบริหารกิจกรรมโครงการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี
      </footer>
    </main>
  );
}
