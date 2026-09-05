import Link from "next/link";
import { isCurrentNavigationPath, primaryNavigation } from "@/components/layout/navigation";
import type { Viewer } from "@/features/auth/types";
import {
  COMMAND_CENTER_STATUSES,
  COMMAND_CENTER_STATUS_META,
} from "@/features/dashboard/presentation";
import { StatusDot } from "@/features/dashboard/components/status-metric";

export function CommandCenterSidebar({ pathname, viewer }: { pathname: string; viewer: Viewer }) {
  const visibleNavigation = primaryNavigation.filter(
    (item) => !item.adminOnly || viewer.roles.includes("admin"),
  );
  const currentHref = visibleNavigation
    .filter((item) => isCurrentNavigationPath(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  return (
    <aside className="cc-sidebar" aria-label="เมนูหลัก">
      <Link className="cc-brand" href="/" aria-label="ระบบบริหารแผน หน้าหลัก">
        <span>ระบบบริหารแผน</span>
        <small>PLAN MANAGEMENT</small>
      </Link>
      <nav className="cc-nav">
        {visibleNavigation.map(({ label, icon: Icon, href }) => (
          <Link
            className={`cc-nav-link ${currentHref === href ? "active" : ""}`}
            href={href}
            key={href}
            aria-current={currentHref === href ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={1.9} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <section className="cc-legend" aria-label="คำอธิบายสถานะ">
        <h2>สถานะ:</h2>
        {COMMAND_CENTER_STATUSES.map((status) => (
          <div key={status}>
            <StatusDot status={status} />
            <span>{COMMAND_CENTER_STATUS_META[status].label}</span>
          </div>
        ))}
      </section>
      <p className="cc-asof">ข้อมูลตามสิทธิ์ผู้ใช้งาน</p>
    </aside>
  );
}
