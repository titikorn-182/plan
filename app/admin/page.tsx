import { WorkspaceShell } from "@/components/layout/workspace-shell";
import { AdminView } from "@/components/modules/admin-view";
import { DataError } from "@/components/ui/data-state";
import { requireAdmin } from "@/lib/auth/viewer";
import { getAdminData, getAdminOrganizations, getReportingPeriod } from "@/lib/data/queries";

export default async function AdminPage() {
  const viewer = await requireAdmin();
  const [result, organizations, period] = await Promise.all([getAdminData(), getAdminOrganizations(), getReportingPeriod()]);
  return (
    <WorkspaceShell title="ผู้ใช้ สิทธิ์ และข้อมูลหลัก" viewer={viewer} period={period}>
      {result.error || organizations.error ? <DataError message={result.error ?? organizations.error ?? "ไม่สามารถโหลดข้อมูลได้"} /> : <AdminView data={result.data} organizations={organizations.data} viewerId={viewer.id} />}
    </WorkspaceShell>
  );
}
