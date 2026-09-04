"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  FileChartColumn,
  FileCheck2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Stamp,
  Target,
  WalletCards,
} from "lucide-react";
import type { Viewer } from "@/lib/domain";

const navItems = [
  { label: "หน้าหลักฐาน", href: "/", icon: LayoutDashboard },
  { label: "ภาพรวมผู้บริหาร", href: "/reports", icon: ChartNoAxesCombined },
  { label: "แผนและคำของบ", href: "/budget-requests", icon: FileText },
  { label: "โครงการและการดำเนินงาน", href: "/projects", icon: FolderKanban },
  { label: "รายงานรายไตรมาส", href: "/reports/quarterly", icon: FileChartColumn },
  { label: "เบิกจ่ายงบประมาณ", href: "/disbursements", icon: WalletCards },
  { label: "KPI และคุณภาพ", href: "/kpi", icon: Target },
  { label: "หลักฐานและเอกสาร", href: "/evidence", icon: FileCheck2 },
  { label: "Workflow อนุมัติ", href: "/approvals", icon: Stamp },
  { label: "กำกับและตั้งค่าระบบ", href: "/admin", icon: ShieldCheck, adminOnly: true },
] as const;

function isCurrent(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function WorkspaceShell({ children, title, actions, viewer }: { children: ReactNode; title: string; actions?: ReactNode; viewer: Viewer }) {
  const pathname = usePathname();
  const visibleNavItems = navItems.filter((item) => !("adminOnly" in item) || viewer.role === "admin");
  const currentHref = visibleNavItems
    .filter((item) => isCurrent(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;
  const roleLabel = { admin: "ผู้ดูแลระบบ", user: "ผู้ประสานงาน", executive: "ผู้บริหาร", staff: "เจ้าหน้าที่" }[viewer.role];

  return (
    <div className="module-command-shell">
      <aside className="module-command-sidebar" aria-label="เมนูหลัก">
        <Link className="module-command-brand" href="/"><span>ระบบบริหารแผน</span><small>PLAN MANAGEMENT</small></Link>
        <nav>
          {visibleNavItems.map(({ label, href, icon: Icon }) => {
            const active = currentHref === href;
            return <Link className={active ? "active" : ""} href={href} key={href} aria-current={active ? "page" : undefined}><Icon size={18} strokeWidth={1.9} /><span>{label}</span></Link>;
          })}
        </nav>
        <div className="module-command-account"><span>{viewer.fullName.slice(0, 1)}</span><p><strong>{viewer.fullName}</strong><small>{roleLabel}</small></p></div>
      </aside>

      <div className="module-command-workspace">
        <header className="module-command-topbar">
          <div className="module-command-period"><button type="button">ปีงบประมาณ <strong>2570</strong><CalendarDays size={15} /></button><button type="button">ทุกไตรมาส<ChevronDown size={15} /></button><span><i />ข้อมูลจริง</span></div>
          <div className="module-command-tools">
            {actions}
            <Link aria-label={`การแจ้งเตือน ${viewer.unreadNotifications} รายการ`} href="/notifications"><Bell size={17} />{viewer.unreadNotifications > 0 ? <b>{Math.min(viewer.unreadNotifications, 99)}</b> : null}</Link>
            <form action="/auth/signout" method="post"><button type="submit" aria-label="ออกจากระบบ" title="ออกจากระบบ"><LogOut size={17} /></button></form>
          </div>
        </header>
        <div className="module-command-title"><div><h1>{title}</h1><p>ข้อมูลตามสิทธิ์ {roleLabel}</p></div><Settings size={20} aria-hidden="true" /></div>
        <main className="module-stage mx-auto w-full max-w-[1560px] px-4 pb-7 sm:px-6 lg:px-7">{children}</main>
      </div>
    </div>
  );
}
