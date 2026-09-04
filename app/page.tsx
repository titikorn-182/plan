import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { DataError } from "@/components/ui/data-state";
import { getViewer } from "@/lib/auth/viewer";
import { getDashboardData } from "@/lib/data/queries";

export default async function Home() {
  const [viewer, result] = await Promise.all([getViewer(), getDashboardData()]);
  if (result.error) return <main className="min-h-screen bg-[#fffaf6] p-6"><DataError message={result.error} /></main>;
  return <ExecutiveDashboard records={result.data.records} lifecycle={result.data.lifecycle} matrix={result.data.matrix} viewer={viewer} />;
}
