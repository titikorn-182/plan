import type { ReportKind } from "./types";

export type DashboardRecord = {
  id: string;
  code: string;
  title: string;
  group: string;
  status: string;
  amount: number | null;
  progress: number | null;
  quarter: number | null;
  actual: number | null;
  target: number | null;
  unit: string;
  verified: boolean;
};

export const DASHBOARD_STATUS_LABELS: Readonly<Record<string, string>> = {
  draft: "ฉบับร่าง",
  submitted: "ส่งแล้ว",
  under_review: "กำลังตรวจสอบ",
  pending_approval: "รออนุมัติ",
  revision_required: "ส่งกลับแก้ไข",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  withdrawn: "ถอนคำขอ",
  cancelled: "ยกเลิก",
  proposed: "เสนอโครงการ",
  active: "กำลังดำเนินงาน",
  on_hold: "พักโครงการ",
  completed: "เสร็จสิ้น",
  recorded: "บันทึกแล้ว",
  reconciled: "กระทบยอดแล้ว",
  pending_docs: "รอเอกสาร",
  delayed: "ล่าช้า",
  achieved: "บรรลุเป้าหมาย",
  on_track: "เป็นไปตามแผน",
  at_risk: "เสี่ยงต่ำกว่าเป้า",
  not_achieved: "ไม่บรรลุเป้าหมาย",
  no_data: "ไม่มีผลประเมิน",
};

export function summarizeDashboard(kind: ReportKind, rows: DashboardRecord[]) {
  const totalAmount = rows.reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const measured = rows.filter((row) => row.progress !== null);
  const averageProgress = measured.length
    ? measured.reduce((sum, row) => sum + (row.progress ?? 0), 0) / measured.length
    : null;
  const statusCounts = new Map<string, number>();
  const groups = new Map<string, number>();
  for (const row of rows) {
    const status = kind === "kpi" && row.actual === null ? "no_data" : row.status;
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    groups.set(row.group, (groups.get(row.group) ?? 0) + (kind === "kpi" ? 1 : (row.amount ?? 0)));
  }
  return {
    count: rows.length,
    totalAmount,
    averageProgress,
    achieved: rows.filter((row) => row.actual !== null && row.status === "achieved").length,
    verified: rows.filter((row) => row.verified).length,
    reconciled: rows
      .filter((row) => row.status === "reconciled")
      .reduce((sum, row) => sum + (row.amount ?? 0), 0),
    statuses: [...statusCounts].map(([label, value]) => ({
      label: DASHBOARD_STATUS_LABELS[label] ?? label,
      value,
    })),
    groups: [...groups]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    quarters: [1, 2, 3, 4].map((quarter) => ({
      label: `ไตรมาส ${quarter}`,
      value: rows
        .filter((row) => row.quarter === quarter)
        .reduce((sum, row) => sum + (row.amount ?? 0), 0),
    })),
  };
}
