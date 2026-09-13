import { History } from "lucide-react";
import type { AuditRow } from "@/features/admin/types";
import type { PaginationMeta } from "@/features/shared/pagination";
import { PaginationNav } from "@/components/ui/pagination-nav";

const actionLabel: Record<string, string> = {
  insert: "เพิ่มข้อมูล",
  update: "แก้ไขข้อมูล",
  delete: "ลบข้อมูล",
  restore: "กู้คืนข้อมูล",
  submit: "ส่งอนุมัติ",
  approve: "อนุมัติ",
  reject: "ไม่อนุมัติ",
};

const entityLabel: Record<string, string> = {
  organization: "หน่วยงาน",
  profile: "ผู้ใช้งาน",
  user_role: "บทบาท",
  user_scope: "ขอบเขตหน่วยงาน",
  fiscal_year: "ปีงบประมาณ",
  budget_cycle: "รอบคำของบ",
  system_setting: "การตั้งค่าระบบ",
  budget_request: "คำของบประมาณ",
  project: "โครงการ",
  quarterly_report: "รายงานรายไตรมาส",
  project_completion_report: "รายงานผลโครงการ",
  disbursement: "รายการเบิกจ่าย",
  kpi_result: "ผล KPI",
  attachment: "หลักฐาน",
  comment: "ความคิดเห็น",
};

export function AdminAuditSection({
  items,
  pagination,
}: {
  items: AuditRow[];
  pagination: PaginationMeta;
}) {
  return (
    <section className="admin-register">
      <header className="admin-register__header">
        <div>
          <p>AUDIT TRAIL</p>
          <h3>ประวัติระบบ</h3>
          <small>หลักฐานการเปลี่ยนแปลงสำหรับตรวจสอบย้อนหลัง</small>
        </div>
        <History size={21} />
      </header>
      <div className="overflow-x-auto">
        <table className="admin-table min-w-[760px]">
          <thead>
            <tr>
              <th>เวลา</th>
              <th>การดำเนินการ</th>
              <th>ข้อมูล</th>
              <th>ผู้ดำเนินการ</th>
              <th>หน่วยงาน / รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="whitespace-nowrap">{item.createdAt}</td>
                <td>
                  <span className="admin-action-tag">
                    {actionLabel[item.action] ?? item.action}
                  </span>
                </td>
                <td>{entityLabel[item.entityType] ?? item.entityType}</td>
                <td>{item.actorEmail}</td>
                <td>
                  <b>{item.organizationName}</b>
                  {item.changedFields.length ? (
                    <small>แก้ไข: {item.changedFields.slice(0, 4).join(", ")}</small>
                  ) : null}
                  {item.reason ? <small>{item.reason}</small> : null}
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty">
                  ยังไม่มีประวัติการเปลี่ยนแปลง
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <PaginationNav basePath="/admin" pagination={pagination} query={{ section: "audit" }} />
    </section>
  );
}
