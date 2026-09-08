import type { ReactNode } from "react";
import Link from "next/link";
import {
  CircleAlert,
  Database,
  History,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import type { AdminSection, AdminSummary } from "@/features/admin/types";

const adminNavigation = [
  { section: "users", label: "ผู้ใช้งาน", detail: "เชิญผู้ใช้และกำหนดสิทธิ์", icon: Users },
  {
    section: "reference",
    label: "ข้อมูลอ้างอิง",
    detail: "หน่วยงาน ปีงบประมาณ รอบคำขอ",
    icon: Database,
  },
  {
    section: "quality",
    label: "คุณภาพข้อมูล",
    detail: "ตรวจข้อมูลที่ต้องแก้ไข",
    icon: CircleAlert,
  },
  { section: "audit", label: "ประวัติระบบ", detail: "ตรวจสอบการเปลี่ยนแปลง", icon: History },
  { section: "trash", label: "ถังขยะ", detail: "ดูและกู้คืนรายการที่จัดเก็บ", icon: Trash2 },
  {
    section: "settings",
    label: "ตั้งค่าระบบ",
    detail: "ค่าเริ่มต้นและการแจ้งเตือน",
    icon: SlidersHorizontal,
  },
] as const;

export function AdminCenterShell({
  activeSection,
  summary,
  adminEmail,
  children,
}: {
  activeSection: AdminSection;
  summary: AdminSummary;
  adminEmail: string;
  children: ReactNode;
}) {
  const metrics = [
    { label: "ผู้ใช้งานทั้งหมด", value: summary.totalUsers, detail: "บัญชีในระบบ" },
    { label: "บัญชีที่ระงับ", value: summary.inactiveUsers, detail: "ปิดการใช้งานอยู่" },
    { label: "หน่วยงานที่ใช้งาน", value: summary.activeOrganizations, detail: "ขอบเขตข้อมูล" },
    { label: "เปลี่ยนแปลงวันนี้", value: summary.changesToday, detail: "รายการในประวัติระบบ" },
  ];

  return (
    <div className="admin-center">
      <header className="admin-center__masthead">
        <span className="admin-center__mark" aria-hidden="true">
          <ShieldCheck size={24} />
        </span>
        <div>
          <h2>ศูนย์ดูแลระบบ</h2>
          <span className="admin-center__intro">
            จัดการผู้ใช้งาน ข้อมูลพื้นฐาน และตรวจสอบความเรียบร้อยของระบบ
          </span>
          <small>ผู้ดูแลระบบ: {adminEmail}</small>
        </div>
      </header>

      <section className="admin-center__metrics" aria-label="สรุปสถานะระบบ">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <b>{metric.value.toLocaleString("th-TH")}</b>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      <div className="admin-center__layout">
        <aside className="admin-center__rail">
          <p>ดูแลระบบ</p>
          <nav aria-label="เมนูผู้ดูแลระบบ">
            {adminNavigation.map(({ section, label, detail, icon: Icon }) => {
              const active = activeSection === section;
              return (
                <Link
                  href={`/admin?section=${section}`}
                  className={active ? "active" : ""}
                  aria-current={active ? "page" : undefined}
                  key={section}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>
                    {label}
                    <small className="admin-nav-detail">{detail}</small>
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="admin-center__content">{children}</div>
      </div>
    </div>
  );
}
