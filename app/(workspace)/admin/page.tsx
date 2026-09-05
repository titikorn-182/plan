import { AdminView } from "@/components/modules/admin-view";
import { DataError } from "@/components/ui/data-state";
import { requireAdmin } from "@/lib/auth/viewer";
import { getAdminData, getAdminOrganizations } from "@/features/admin/queries";

export default async function AdminPage() {
  const viewer = await requireAdmin();
  const [result, organizations] = await Promise.all([getAdminData(), getAdminOrganizations()]);
  return result.error || organizations.error
    ? <DataError message={result.error ?? organizations.error ?? "ไม่สามารถโหลดข้อมูลได้"} />
    : <AdminView data={result.data} organizations={organizations.data} viewerId={viewer.id} />;
}
