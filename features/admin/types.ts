import type { AppRole } from "@/features/auth/types";

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  active: boolean;
  roles: AppRole[];
  organizationIds: string[];
};

export type AuditRow = {
  id: number;
  action: string;
  entityType: string;
  createdAt: string;
  actorEmail: string;
};
