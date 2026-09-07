import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleAlert, ShieldAlert } from "lucide-react";
import type { AdminQualityData } from "@/features/admin/types";

const severityLabel = {
  critical: "ต้องแก้ไข",
  warning: "ควรติดตาม",
  review: "รอตรวจสอบ",
} as const;

export function AdminQualitySection({ data }: { data: AdminQualityData }) {
  const unresolved = data.issues.reduce((sum, issue) => sum + issue.count, 0);
  return (
    <section className="admin-register">
      <header className="admin-register__header">
        <div>
          <p>DATA QUALITY</p>
          <h3>คุณภาพข้อมูล</h3>
          <small>ตรวจหาข้อมูลไม่ครบและงานค้างที่กระทบต่อรายงานผู้บริหาร</small>
        </div>
        <span className="admin-checked-at">ตรวจล่าสุด {data.checkedAt}</span>
      </header>
      <div className="admin-quality-overview">
        <article>
          <ShieldAlert size={22} />
          <span>
            <b>{unresolved.toLocaleString("th-TH")}</b>
            <small>รายการที่ต้องติดตาม</small>
          </span>
        </article>
        <article>
          <CheckCircle2 size={22} />
          <span>
            <b>
              {data.passedChecks}/{data.issues.length}
            </b>
            <small>กฎที่ไม่พบปัญหา</small>
          </span>
        </article>
      </div>
      <div className="admin-quality-list">
        {data.issues.map((issue) => (
          <article
            className={`admin-quality-row admin-quality-row--${issue.severity}`}
            key={issue.id}
          >
            <span className="admin-quality-row__icon">
              {issue.count === 0 ? <CheckCircle2 size={20} /> : <CircleAlert size={20} />}
            </span>
            <div>
              <p>
                <b>{issue.title}</b>
                <em>{severityLabel[issue.severity]}</em>
              </p>
              <small>{issue.detail}</small>
            </div>
            <strong>{issue.count.toLocaleString("th-TH")}</strong>
            <Link href={issue.href}>
              {issue.actionLabel}
              <ArrowUpRight size={14} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
