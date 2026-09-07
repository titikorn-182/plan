import type { ReactNode } from "react";
import { AdminView } from "@/components/modules/admin-view";
import { AdminAuditSection } from "@/components/modules/admin/admin-audit-section";
import { AdminCenterShell } from "@/components/modules/admin/admin-center-shell";
import { AdminQualitySection } from "@/components/modules/admin/admin-quality-section";
import { AdminReferenceSection } from "@/components/modules/admin/admin-reference-section";
import { AdminSettingsSection } from "@/components/modules/admin/admin-settings-section";
import { AdminTrashSection } from "@/components/modules/admin/admin-trash-section";
import { DataError } from "@/components/ui/data-state";
import {
  getAdminAudit,
  getAdminOrganizations,
  getAdminQualityData,
  getAdminReferenceData,
  getAdminSettings,
  getAdminSummary,
  getAdminTrash,
  getAdminUsers,
} from "@/features/admin/queries";
import { parseAdminSection } from "@/features/admin/types";
import { parsePage } from "@/features/shared/pagination";
import { requireAdmin } from "@/lib/auth/viewer";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const params = await searchParams;
  const section = parseAdminSection(params.section);
  const page = parsePage(params.page);
  const viewer = await requireAdmin();
  const summary = await getAdminSummary();
  if (summary.error) return <DataError message={summary.error} />;

  let content: ReactNode;
  if (section === "users") {
    const [users, organizations] = await Promise.all([
      getAdminUsers(page),
      getAdminOrganizations(),
    ]);
    content =
      users.error || organizations.error ? (
        <DataError message={users.error ?? organizations.error ?? "ไม่สามารถโหลดข้อมูลได้"} />
      ) : (
        <AdminView data={users.data} organizations={organizations.data} viewerId={viewer.id} />
      );
  } else if (section === "reference") {
    const reference = await getAdminReferenceData();
    content = reference.error ? (
      <DataError message={reference.error} />
    ) : (
      <AdminReferenceSection data={reference.data} />
    );
  } else if (section === "quality") {
    const quality = await getAdminQualityData();
    content = quality.error ? (
      <DataError message={quality.error} />
    ) : (
      <AdminQualitySection data={quality.data} />
    );
  } else if (section === "audit") {
    const audit = await getAdminAudit(page);
    content = audit.error ? (
      <DataError message={audit.error} />
    ) : (
      <AdminAuditSection items={audit.data.items} pagination={audit.data.pagination} />
    );
  } else if (section === "trash") {
    const trash = await getAdminTrash();
    content = trash.error ? (
      <DataError message={trash.error} />
    ) : (
      <AdminTrashSection records={trash.data} />
    );
  } else {
    const [settings, reference] = await Promise.all([getAdminSettings(), getAdminReferenceData()]);
    content =
      settings.error || reference.error ? (
        <DataError message={settings.error ?? reference.error ?? "ไม่สามารถโหลดข้อมูลได้"} />
      ) : (
        <AdminSettingsSection settings={settings.data} fiscalYears={reference.data.fiscalYears} />
      );
  }

  return (
    <AdminCenterShell activeSection={section} summary={summary.data} adminEmail={viewer.email}>
      {content}
    </AdminCenterShell>
  );
}
