import { NotificationsView } from "@/components/modules/notifications-view";
import { DataError } from "@/components/ui/data-state";
import { getNotifications } from "@/features/notifications/queries";
import { parsePage } from "@/features/shared/pagination";

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  const page = parsePage((await searchParams).page);
  const result = await getNotifications(page);
  return result.error ? (
    <DataError message={result.error} />
  ) : (
    <NotificationsView
      notifications={result.data.items}
      pagination={result.data.pagination}
      unreadCount={result.data.unreadCount}
    />
  );
}
