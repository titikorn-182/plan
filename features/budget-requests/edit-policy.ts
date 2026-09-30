import type { DocumentStatus } from "./types";

type EditViewer = { id: string; roles: readonly string[] };
type EditRecord = { status: DocumentStatus; ownerId: string | null; lockedAt: string | null };

export function budgetRequestEditDeniedReason(
  viewer: EditViewer,
  record: EditRecord,
): string | null {
  // Admin takes precedence, including accounts with both admin and staff roles.
  if (viewer.roles.includes("admin")) {
    return record.status === "approved" ? null : "ผู้ดูแลระบบแก้ไขได้เฉพาะคำขอที่อนุมัติแล้ว";
  }
  if (!viewer.roles.includes("staff")) return "บทบาทนี้ไม่มีสิทธิ์แก้ไขคำขอ";
  if (record.ownerId !== viewer.id) return "แก้ไขได้เฉพาะคำขอของตนเอง";
  if (record.lockedAt || !["draft", "revision_required"].includes(record.status)) {
    return "เจ้าหน้าที่แก้ไขได้เฉพาะฉบับร่างหรือส่งกลับแก้ไขที่ไม่ถูกล็อก";
  }
  return null;
}
