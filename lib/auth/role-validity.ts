import type { AppRole } from "@/lib/auth/types";

export type RoleAssignment = {
  role: AppRole;
  active_from: string;
  active_until: string | null;
};

export function isRoleAssignmentActive(assignment: RoleAssignment, at: Date = new Date()): boolean {
  const activeFrom = Date.parse(assignment.active_from);
  const activeUntil = assignment.active_until ? Date.parse(assignment.active_until) : null;
  const timestamp = at.getTime();

  if (!Number.isFinite(activeFrom)) return false;
  if (activeUntil !== null && !Number.isFinite(activeUntil)) return false;

  return activeFrom <= timestamp && (activeUntil === null || activeUntil > timestamp);
}
