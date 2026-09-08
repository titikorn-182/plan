import { ReportsHub } from "@/components/modules/reports-hub";
import { ReportDashboardLinks } from "@/components/modules/report-dashboard-links";
import { getReportSchedules } from "@/features/reports/queries";
import { getReportingPeriod } from "@/features/shared/queries";

export default async function ReportsPage() {
  const [schedules, period] = await Promise.all([getReportSchedules(), getReportingPeriod()]);
  return (
    <>
      <ReportDashboardLinks />
      <ReportsHub period={period} schedules={schedules.data} scheduleError={schedules.error} />
    </>
  );
}
