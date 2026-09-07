"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, LogOut, Settings } from "lucide-react";
import {
  getWorkspaceTitle,
  getCurrentNavigationHref,
  getVisibleNavigation,
} from "@/components/layout/navigation";
import { WorkspaceMenu } from "@/components/layout/workspace-menu";
import { PeriodSelector } from "@/components/layout/period-selector";
import { APP_ROLE_LABELS, type Viewer } from "@/features/auth/types";
import type { FiscalYearOption, ReportingPeriod } from "@/features/shared/types";

export function WorkspaceShell({
  children,
  viewer,
  period,
  fiscalYears,
}: {
  children: ReactNode;
  viewer: Viewer;
  period: ReportingPeriod;
  fiscalYears: FiscalYearOption[];
}) {
  const pathname = usePathname();
  const title = getWorkspaceTitle(pathname);
  const visibleNavItems = getVisibleNavigation(viewer.roles);
  const currentHref = getCurrentNavigationHref(pathname, visibleNavItems);
  const roleLabel = APP_ROLE_LABELS[viewer.role];

  if (pathname === "/") return children;

  return (
    <div className="module-command-shell">
      <aside className="module-command-sidebar" aria-label="เมนูหลัก">
        <Link className="module-command-brand" href="/">
          <span>ระบบบริหารแผน</span>
          <small>PLAN MANAGEMENT</small>
        </Link>
        <nav>
          {visibleNavItems.map(({ label, href, icon: Icon }) => {
            const active = currentHref === href;
            return (
              <Link
                className={active ? "active" : ""}
                href={href}
                key={href}
                aria-label={label}
                title={label}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.9} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="module-command-account">
          <span>{viewer.fullName.slice(0, 1)}</span>
          <p>
            <strong>{viewer.fullName}</strong>
            <small>{roleLabel}</small>
          </p>
        </div>
      </aside>

      <div className="module-command-workspace">
        <header className="module-command-topbar">
          <div className="module-command-period">
            <PeriodSelector fiscalYears={fiscalYears} period={period} />
            <span>
              <i />
              ข้อมูลจริง
            </span>
          </div>
          <div className="module-command-tools">
            <WorkspaceMenu pathname={pathname} roles={viewer.roles} />
            <Link
              aria-label={`การแจ้งเตือน ${viewer.unreadNotifications} รายการ`}
              href="/notifications"
            >
              <Bell size={17} />
              {viewer.unreadNotifications > 0 ? (
                <b>{Math.min(viewer.unreadNotifications, 99)}</b>
              ) : null}
            </Link>
            <form action="/auth/signout" method="post">
              <button type="submit" aria-label="ออกจากระบบ" title="ออกจากระบบ">
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </header>
        <div className="module-command-title">
          <div>
            <h1>{title}</h1>
            <p>ข้อมูลตามสิทธิ์ {roleLabel}</p>
          </div>
          <Settings size={20} aria-hidden="true" />
        </div>
        <main className="module-stage mx-auto w-full max-w-[1560px] px-4 pb-7 sm:px-6 lg:px-7">
          {children}
        </main>
      </div>
    </div>
  );
}
