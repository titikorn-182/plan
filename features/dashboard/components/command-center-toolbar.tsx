import {
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  LogOut,
  Megaphone,
  Printer,
} from "lucide-react";
import Link from "next/link";
import type { Viewer } from "@/features/auth/types";
import type { ReportingPeriod } from "@/features/shared/types";

export function CommandCenterToolbar({
  filterOpen,
  onExport,
  onToggleFilter,
  period,
  viewer,
}: {
  filterOpen: boolean;
  onExport: () => void;
  onToggleFilter: () => void;
  period: ReportingPeriod;
  viewer: Viewer;
}) {
  return (
    <header className="cc-topbar">
      <div className="cc-period-controls">
        <button type="button">
          ปีงบประมาณ <strong>{period.buddhistYear}</strong>
          <CalendarDays size={16} />
        </button>
        <button type="button">
          {period.quarterLabel}
          <ChevronDown size={16} />
        </button>
        <span className="cc-live-badge">
          <span />
          ข้อมูลจริง
        </span>
      </div>
      <div className="cc-utilities">
        <Link
          className="cc-utility-link"
          aria-label={`การแจ้งเตือน ${viewer.unreadNotifications} รายการ`}
          href="/notifications"
          title="การแจ้งเตือน"
        >
          <Megaphone size={17} />
          <span className="cc-utility-label">แจ้งเตือน</span>
          {viewer.unreadNotifications > 0 ? (
            <b>{Math.min(viewer.unreadNotifications, 99)}</b>
          ) : null}
        </Link>
        <button type="button" onClick={onExport} title="ส่งออก CSV">
          <Download size={17} />
          <span className="cc-utility-label">ส่งออก</span>
        </button>
        <button type="button" onClick={() => window.print()} title="พิมพ์รายงาน">
          <Printer size={17} />
          <span className="cc-utility-label">พิมพ์</span>
        </button>
        <button
          className={filterOpen ? "active" : ""}
          type="button"
          onClick={onToggleFilter}
          aria-expanded={filterOpen}
          title="ตัวกรอง"
        >
          <Filter size={17} />
          <span className="cc-utility-label">ตัวกรอง</span>
        </button>
        <form action="/auth/signout" method="post">
          <button type="submit" title="ออกจากระบบ" aria-label="ออกจากระบบ">
            <LogOut size={17} />
          </button>
        </form>
      </div>
    </header>
  );
}
