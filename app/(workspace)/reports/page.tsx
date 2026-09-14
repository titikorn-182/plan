import { ReportsHub } from "@/features/reports/components/reports-hub";
import { ReportsPortal } from "@/features/reports/components/reports-portal";
import { getReportSchedules } from "@/features/reports/queries";
import { getReportingPeriod } from "@/features/shared/queries";

export default async function ReportsPage() {
  const [schedules, period] = await Promise.all([getReportSchedules(), getReportingPeriod()]);
  return (
    <ReportsPortal period={period}>
      <ReportsHub period={period} schedules={schedules.data} scheduleError={schedules.error} />
    </ReportsPortal>
  );
}
