export type NotificationRow = {
  id: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
};
