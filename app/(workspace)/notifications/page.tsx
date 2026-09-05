import { NotificationsView } from "@/components/modules/notifications-view";
import { DataError } from "@/components/ui/data-state";
import { getNotifications } from "@/features/notifications/queries";

export default async function NotificationsPage() {
  const result = await getNotifications();
  return result.error ? <DataError message={result.error} /> : <NotificationsView notifications={result.data} />;
}
