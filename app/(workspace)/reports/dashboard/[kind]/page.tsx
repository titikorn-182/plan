import { notFound } from "next/navigation";
import Link from "next/link";
import { ReportDashboard } from "@/components/modules/report-dashboard";
import { getDashboardRecords } from "@/features/reports/dashboard-queries";
import { isReportKind } from "@/features/reports/types";
import { getReportingPeriod } from "@/features/shared/queries";
import { DataError } from "@/components/ui/data-state";

export default async function ReportDashboardPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  if (!isReportKind(kind)) notFound();
  const period = await getReportingPeriod();
  const response = await getDashboardRecords(kind, period);
  if (response.error)
    return (
      <div className="space-y-4">
        <Link href="/reports" className="text-orange-800 underline">
          กลับคลังรายงานเดิม
        </Link>
        <DataError message={response.error} />
      </div>
    );
  return (
    <ReportDashboard
      key={`${kind}-${period.fiscalYearId}-${period.quarter}`}
      kind={kind}
      period={period}
      records={response.data}
    />
  );
}
