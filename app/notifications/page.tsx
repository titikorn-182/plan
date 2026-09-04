import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { NotificationsView } from "@/components/modules/notifications-view";
import { DataError } from "@/components/ui/data-state";
import { getNotifications } from "@/lib/data/queries";

export default async function NotificationsPage() {
  const result = await getNotifications();
  return <AuthenticatedShell title="การแจ้งเตือน">{result.error ? <DataError message={result.error} /> : <NotificationsView notifications={result.data} />}</AuthenticatedShell>;
}
