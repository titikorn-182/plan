import { Bell, Check, CircleCheck, ExternalLink, FileText, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import type { Viewer } from "@/features/auth/types";
import { StatusDot } from "@/features/dashboard/components/status-metric";
import { COMMAND_CENTER_STATUS_META } from "@/features/dashboard/presentation";
import type { CommandCenterRow, DecisionRecord } from "@/features/dashboard/types";
import { formatMillionBaht, formatPercent } from "@/features/shared/formatters";
import type { ReportingPeriod } from "@/features/shared/types";

export type InspectorTab = "summary" | "evidence" | "references";

export type SelectedEvidence = DecisionRecord["evidence"][number] & {
  recordId: string;
};

export function EvidenceInspector({
  evidence,
  onClose,
  onTabChange,
  period,
  progressTarget,
  records,
  selected,
  tab,
  viewer,
}: {
  evidence: SelectedEvidence[];
  onClose: () => void;
  onTabChange: (tab: InspectorTab) => void;
  period: ReportingPeriod;
  progressTarget: number;
  records: DecisionRecord[];
  selected: CommandCenterRow;
  tab: InspectorTab;
  viewer: Viewer;
}) {
  const variance = selected.progress - progressTarget;

  return (
    <aside
      className="cc-inspector"
      id="evidence-inspector"
      aria-label={`เครื่องมือตรวจสอบหลักฐาน ${selected.unit}`}
    >
      <div className="cc-inspector-head">
        <strong>เครื่องมือตรวจสอบหลักฐาน</strong>
        <button type="button" onClick={onClose} aria-label="ปิดเครื่องมือตรวจสอบ">
          <X size={18} />
        </button>
      </div>
      <div className="cc-inspector-identity">
        <span>{selected.unit}</span>
        <strong>{selected.code}</strong>
        <p>
          <StatusDot status={selected.status} />
          {COMMAND_CENTER_STATUS_META[selected.status].label}
        </p>
      </div>
      <div className="cc-inspector-tabs" role="tablist" aria-label="รายละเอียดหน่วยงาน">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "summary"}
          onClick={() => onTabChange("summary")}
        >
          สรุป
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "evidence"}
          onClick={() => onTabChange("evidence")}
        >
          หลักฐาน ({selected.evidenceTotal})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "references"}
          onClick={() => onTabChange("references")}
        >
          การอ้างอิง
        </button>
      </div>

      {tab === "summary" ? (
        <div className="cc-inspector-content">
          <section className="cc-audit-score">
            <span>ความก้าวหน้า {period.quarterLabel}</span>
            <strong>{formatPercent(selected.progress)}</strong>
            <small>เป้าหมาย {formatPercent(progressTarget)}</small>
            <div>
              <span style={{ width: `${Math.min(100, selected.progress)}%` }} />
            </div>
            <em className={selected.progress >= progressTarget ? "positive" : "negative"}>
              {selected.progress >= progressTarget ? "ตามแผน" : "ต่ำกว่าแผน"} (
              {variance >= 0 ? "+" : ""}
              {formatPercent(variance)})
            </em>
          </section>
          <dl className="cc-inspector-facts">
            <div>
              <dt>วงเงินอนุมัติ</dt>
              <dd>{formatMillionBaht(selected.approved)} ลบ.</dd>
            </div>
            <div>
              <dt>เบิกจ่ายสะสม</dt>
              <dd>{formatPercent(selected.disbursement)}</dd>
            </div>
            <div>
              <dt>KPI บรรลุเป้าหมาย</dt>
              <dd>
                {selected.kpiMet}/{selected.kpiTotal}
              </dd>
            </div>
            <div>
              <dt>หลักฐานตรวจแล้ว</dt>
              <dd>
                {selected.evidenceVerified}/{selected.evidenceTotal}
              </dd>
            </div>
          </dl>
          <section className="cc-top-evidence">
            <h3>หลักฐานเด่น (Top Evidence)</h3>
            {evidence.slice(0, 3).map((item) => (
              <div key={`${item.recordId}-${item.name}`}>
                <FileText size={16} />
                <span>
                  <strong>{item.recordId}</strong>
                  <small>{item.name}</small>
                </span>
                {item.verified ? (
                  <Check className="verified" size={15} />
                ) : (
                  <TriangleAlert className="pending" size={15} />
                )}
              </div>
            ))}
            {evidence.length === 0 ? <p>ยังไม่มีหลักฐานในรายการที่รอตัดสินใจ</p> : null}
          </section>
        </div>
      ) : null}

      {tab === "evidence" ? (
        <div className="cc-inspector-content cc-evidence-list">
          {evidence.map((item) => (
            <article key={`${item.recordId}-${item.name}`}>
              <FileText size={17} />
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.recordId} · {item.date}
                </span>
              </div>
              {item.verified ? (
                <CircleCheck className="verified" size={17} />
              ) : (
                <TriangleAlert className="pending" size={17} />
              )}
            </article>
          ))}
          {evidence.length === 0 ? (
            <p className="cc-empty-note">ยังไม่มีเอกสารในรายการที่อยู่ระหว่างตรวจสอบ</p>
          ) : null}
        </div>
      ) : null}

      {tab === "references" ? (
        <div className="cc-inspector-content cc-reference-list">
          <Link href="/budget-requests">
            <span>คำของบประมาณ</span>
            <strong>{records.filter((record) => record.stage === "คำของบ").length} รายการ</strong>
            <ExternalLink size={14} />
          </Link>
          <Link href="/projects">
            <span>ข้อเสนอโครงการ</span>
            <strong>{selected.projectCount} โครงการ</strong>
            <ExternalLink size={14} />
          </Link>
          <Link href="/disbursements">
            <span>ทะเบียนเบิกจ่าย</span>
            <strong>{formatPercent(selected.disbursement)}</strong>
            <ExternalLink size={14} />
          </Link>
          <Link href="/kpi">
            <span>ตัวชี้วัด EdPEx / AUN-QA</span>
            <strong>{selected.kpiTotal} ตัวชี้วัด</strong>
            <ExternalLink size={14} />
          </Link>
        </div>
      ) : null}

      <div className="cc-inspector-actions">
        <button type="button" onClick={() => window.print()}>
          พิมพ์สรุปการตรวจสอบ
        </button>
        <Link href="/reports">เปิดรายงานฉบับเต็ม</Link>
      </div>
      <div className="cc-inspector-user">
        <span className="cc-avatar">{viewer.fullName.slice(0, 1)}</span>
        <p>
          <strong>{viewer.fullName}</strong>
          <small>ข้อมูลตามสิทธิ์ {viewer.role}</small>
        </p>
        <Bell size={16} />
      </div>
    </aside>
  );
}
