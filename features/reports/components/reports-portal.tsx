"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  FileText,
} from "lucide-react";
import Link from "next/link";
import type { ReportingPeriod } from "@/features/shared/types";
import { REPORT_DEFINITIONS } from "@/features/reports/definitions";
import styles from "./reports-portal.module.css";

const reportContext = {
  budget: {
    label: "งบประมาณ",
    scope: "ภาพรวมรายปี",
    detail: "เปรียบเทียบคำขอและวงเงินของแต่ละหน่วยงาน",
  },
  projects: {
    label: "โครงการ",
    scope: "สถานะและความก้าวหน้า",
    detail: "ดูภาพรวมการดำเนินงานและความก้าวหน้าที่บันทึกไว้",
  },
  disbursements: {
    label: "การเบิกจ่าย",
    scope: "เปรียบเทียบ 4 ไตรมาส",
    detail: "ตรวจยอดบันทึกและยอดที่กระทบยอดแล้วในปีเดียวกัน",
  },
  kpi: {
    label: "คุณภาพการศึกษา",
    scope: "EdPEx / AUN-QA",
    detail: "ติดตามผลจริง เป้าหมาย และการรับรองผลตัวชี้วัด",
  },
} as const;

export function ReportsPortal({
  period,
  children,
}: {
  period: ReportingPeriod;
  children: ReactNode;
}) {
  const [view, setView] = useState<"dashboards" | "documents">("dashboards");
  const documentPanelRef = useRef<HTMLElement>(null);
  return (
    <div className={styles.portal}>
      <header className={styles.header}>
        <div>
          <h1>รายงานและการวิเคราะห์</h1>
          <p>มองภาพรวมแผนงาน ตรวจสอบผล และเตรียมรายงานจากข้อมูลที่คุณเข้าถึงได้</p>
        </div>
        <div className={styles.period}>
          <CalendarDays size={19} aria-hidden="true" />
          <span>
            <strong>{period.fiscalYearLabel}</strong>
            <small>{period.quarterLabel} · รอบที่เลือก</small>
          </span>
        </div>
      </header>
      <nav className={styles.switcher} aria-label="มุมมองศูนย์รายงาน">
        <button
          type="button"
          aria-pressed={view === "dashboards"}
          aria-controls="reports-dashboard-panel"
          onClick={() => setView("dashboards")}
        >
          <ChartNoAxesCombined size={18} aria-hidden="true" />
          แดชบอร์ดสรุป<span>4</span>
        </button>
        <button
          type="button"
          aria-pressed={view === "documents"}
          aria-controls="reports-document-panel"
          onClick={() => setView("documents")}
        >
          <ArrowDownToLine size={18} aria-hidden="true" />
          ดาวน์โหลดและตั้งเวลา
        </button>
      </nav>
      <section
        id="reports-dashboard-panel"
        hidden={view !== "dashboards"}
        aria-label="แดชบอร์ดสรุปรายงาน"
      >
        <div className={styles.workspace}>
          <div className={styles.catalog}>
            <div className={styles.catalogTitle}>
              <h2>เลือกเรื่องที่ต้องการติดตาม</h2>
              <span>ข้อมูลสรุปพร้อมรายละเอียด</span>
            </div>
            <nav aria-label="เลือกแดชบอร์ดรายงาน">
              {REPORT_DEFINITIONS.map((report) => {
                const context = reportContext[report.kind];
                return (
                  <Link
                    href={`/reports/dashboard/${report.kind}`}
                    key={report.kind}
                    className={styles.report}
                  >
                    <span className={styles.category}>{context.label}</span>
                    <span className={styles.reportBody}>
                      <strong>{report.name}</strong>
                      <span>{context.detail}</span>
                      <small>{context.scope}</small>
                    </span>
                    <span className={styles.open}>
                      <span>เปิดดู</span>
                      <ArrowUpRight size={20} aria-hidden="true" />
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <aside className={styles.aside}>
            <section className={styles.guide}>
              <ChartNoAxesCombined size={28} aria-hidden="true" />
              <h2>
                เริ่มจากภาพรวม
                <br />
                ลงไปถึงรายละเอียด
              </h2>
              <p>ค้นหาและกรองข้อมูลในแดชบอร์ด กราฟ ยอดสรุป และตารางจะเปลี่ยนตามตัวกรองเดียวกัน</p>
              <div className={styles.guideNote}>
                <CalendarDays size={17} aria-hidden="true" />
                <p>เปลี่ยนปีงบประมาณและไตรมาสได้จากแถบด้านบนของระบบ</p>
              </div>
            </section>
            <section className={styles.documents}>
              <FileText size={22} aria-hidden="true" />
              <h2>ต้องการไฟล์รายงาน?</h2>
              <p>เปิดคลังรายงานมาตรฐานเพื่อดาวน์โหลด PDF / Excel หรือจัดการกำหนดการที่บันทึกไว้</p>
              <button
                type="button"
                onClick={() => {
                  setView("documents");
                  requestAnimationFrame(() => documentPanelRef.current?.focus());
                }}
              >
                ไปที่คลังรายงาน <ArrowUpRight size={17} aria-hidden="true" />
              </button>
            </section>
          </aside>
        </div>
        <p className={styles.footer}>
          แดชบอร์ดแสดงข้อมูลตามสิทธิ์ของบัญชี ·
          ตรวจรอบข้อมูลและเงื่อนไขการคำนวณในแต่ละรายงานก่อนนำไปใช้งาน
        </p>
      </section>
      <section
        id="reports-document-panel"
        ref={documentPanelRef}
        tabIndex={-1}
        hidden={view !== "documents"}
        aria-label="ดาวน์โหลดและตั้งเวลารายงาน"
      >
        <div className={styles.documentHeading}>
          <h2>คลังรายงานและกำหนดการ</h2>
          <p>ดาวน์โหลดรายงานหรือจัดการคิวงานด้วยเครื่องมือเดิม</p>
        </div>
        {children}
      </section>
    </div>
  );
}
