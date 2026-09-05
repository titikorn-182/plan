import { AdminView } from "@/components/modules/admin-view";
import { DataError } from "@/components/ui/data-state";
import { requireAdmin } from "@/lib/auth/viewer";
import { getAdminData, getAdminOrganizations } from "@/features/admin/queries";
import { parsePage } from "@/features/shared/pagination";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const page = parsePage((await searchParams).page);
  const viewer = await requireAdmin();
  const [result, organizations] = await Promise.all([getAdminData(page), getAdminOrganizations()]);
  return result.error || organizations.error ? (
    <DataError message={result.error ?? organizations.error ?? "ไม่สามารถโหลดข้อมูลได้"} />
  ) : (
    <AdminView data={result.data} organizations={organizations.data} viewerId={viewer.id} />
  );
}
