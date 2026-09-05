import type { Enums } from "@/types/database.generated";

export type AppRole = Enums<"app_role">;

export const APP_ROLES = [
  "admin",
  "user",
  "executive",
  "staff",
] as const satisfies readonly AppRole[];

export const APP_ROLE_LABELS: Readonly<Record<AppRole, string>> = {
  admin: "ผู้ดูแลระบบ",
  user: "ผู้ประสานงาน",
  executive: "ผู้บริหาร",
  staff: "เจ้าหน้าที่",
};

export const APP_ROLE_NAMES: Readonly<Record<AppRole, string>> = {
  admin: "Admin",
  user: "User",
  executive: "Executive",
  staff: "Staff",
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLES.some((role) => role === value);
}

export type Viewer = {
  id: string;
  email: string;
  fullName: string;
  roles: AppRole[];
  role: AppRole;
  unreadNotifications: number;
};
