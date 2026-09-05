import type { AppRole } from "@/features/auth/types";
import type { EvidenceEntityType } from "@/features/evidence/types";

export const WORKFLOW_STATUSES = [
  "pending",
  "approved",
  "revision_required",
  "rejected",
  "cancelled",
] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const WORKFLOW_STATUS_LABELS: Readonly<Record<WorkflowStatus, string>> = {
  pending: "รอดำเนินการ",
  approved: "อนุมัติ",
  revision_required: "ส่งกลับแก้ไข",
  rejected: "ไม่อนุมัติ",
  cancelled: "ยกเลิก",
};

export const APPROVAL_ROLE_LABELS: Readonly<Record<AppRole, string>> = {
  admin: "ผู้ดูแลระบบ",
  user: "ผู้ตรวจระดับหน่วยงาน",
  executive: "ผู้บริหาร",
  staff: "ผู้ปฏิบัติงาน",
};

export function isWorkflowStatus(value: unknown): value is WorkflowStatus {
  return typeof value === "string" && WORKFLOW_STATUSES.some((status) => status === value);
}

export type WorkflowTask = {
  id: string;
  entityType: EvidenceEntityType;
  entityId: string;
  businessId: string;
  title: string;
  unit: string;
  requiredRole: AppRole;
  status: WorkflowStatus;
  dueAt: string;
  createdAt: string;
  canAct: boolean;
  overdue: boolean;
};
