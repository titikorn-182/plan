import { ExecutiveDashboard } from "@/features/dashboard/components/executive-dashboard";
import { DataError } from "@/components/ui/data-state";
import { getViewer } from "@/lib/auth/viewer";
import { getDashboardData } from "@/features/dashboard/queries";
import { getReportingContext } from "@/features/shared/queries";

export default async function Home() {
  const [viewer, result, reporting] = await Promise.all([
    getViewer(),
    getDashboardData(),
    getReportingContext(),
  ]);
  if (result.error)
    return (
      <main className="min-h-screen bg-[#fffaf6] p-6">
        <DataError message={result.error} />
      </main>
    );
  return (
    <ExecutiveDashboard
      records={result.data.records}
      matrix={result.data.matrix}
      viewer={viewer}
      period={reporting.period}
      fiscalYears={reporting.fiscalYears}
    />
  );
}
