import "server-only";

import type { ReportKind } from "@/features/reports/types";
import { getReportData } from "@/features/reports/queries";
import { createWorkbookBuffer, workbookResponse } from "@/lib/server/workbooks";

export async function createReportResponse(kind: ReportKind): Promise<Response> {
  const report = await getReportData(kind);
  if (report.error) return new Response(report.error, { status: 500 });
  const { columns, rows, title, period, generatedAt } = report.data;
  const buffer = await createWorkbookBuffer({
    title,
    subtitle: `${period.fiscalYearLabel} · ${period.quarterLabel} · สร้างเมื่อ ${new Date(generatedAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`,
    sheetName: kind,
    columns,
    rows,
  });
  return workbookResponse(buffer, `${kind}-${period.buddhistYear}-q${period.quarter}.xlsx`);
}
