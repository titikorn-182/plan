"use client";

import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleCheck,
  Download,
  ExternalLink,
  FileText,
  Filter,
  FolderKanban,
  LogOut,
  Megaphone,
  Paperclip,
  Pin,
  Printer,
  Search,
  Target,
  TriangleAlert,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { isCurrentNavigationPath, primaryNavigation } from "@/components/layout/navigation";
import type { CommandCenterRow, CommandCenterStatus, DecisionRecord, ReportingPeriod, Viewer } from "@/lib/domain";
import { COMMAND_CENTER_THRESHOLDS, getQuarterProgressTarget } from "@/lib/operations/rules";

const stageIcons: Record<DecisionRecord["stage"], LucideIcon> = {
  คำของบ: FileText,
  โครงการ: FolderKanban,
  ดำเนินงาน: ChartNoAxesCombined,
  เบิกจ่าย: WalletCards,
  KPI: Target,
};

const statusMeta: Record<CommandCenterStatus, { label: string; short: string; className: string }> = {
  ahead: { label: "สูงกว่าแผน", short: "สูงกว่าแผน", className: "ahead" },
  onTrack: { label: "ตามแผน (±5%)", short: "ตามแผน", className: "on-track" },
  watch: { label: "ต้องติดตาม (5–15%)", short: "ต้องติดตาม", className: "watch" },
  risk: { label: "ต่ำกว่าแผน (>15%)", short: "ต่ำกว่าแผน", className: "risk" },
  noData: { label: "ยังไม่เริ่ม/ไม่มีข้อมูล", short: "ไม่มีข้อมูล", className: "no-data" },
};

const statusFilters: Array<{ value: "all" | CommandCenterStatus; label: string }> = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "ahead", label: "สูงกว่าแผน" },
  { value: "onTrack", label: "ตามแผน" },
  { value: "watch", label: "ต้องติดตาม" },
  { value: "risk", label: "ต่ำกว่าแผน" },
  { value: "noData", label: "ไม่มีข้อมูล" },
];
const commandCenterStatuses = ["ahead", "onTrack", "watch", "risk", "noData"] as const satisfies readonly CommandCenterStatus[];

function formatMillion(value: number) {
  return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value / 1_000_000);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("th-TH", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
}

function StatusDot({ status }: { status: CommandCenterStatus }) {
  const meta = statusMeta[status];
  return <span className={`cc-status-dot ${meta.className}`} title={meta.label} aria-label={meta.label} />;
}

function ProgressMetric({ value, target, status }: { value: number; target: number; status: CommandCenterStatus }) {
  const variance = value - target;
  return (
    <div className="cc-metric-cell">
      <div><strong>{formatPercent(value)}</strong><StatusDot status={status} /></div>
      <small className={variance >= 0 ? "positive" : "negative"}>
        {variance >= 0 ? "ตามแผน" : "ต่ำกว่าแผน"} ({variance >= 0 ? "+" : ""}{formatPercent(variance)})
      </small>
    </div>
  );
}

export function ExecutiveDashboard({
  records,
  matrix,
  viewer,
  period,
}: {
  records: DecisionRecord[];
  matrix: CommandCenterRow[];
  viewer: Viewer;
  period: ReportingPeriod;
}) {
  const pathname = usePathname();
  const [selectedUnitId, setSelectedUnitId] = useState(matrix[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CommandCenterStatus>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [inspectorTab, setInspectorTab] = useState<"summary" | "evidence" | "references">("summary");

  const selected = matrix.find((row) => row.id === selectedUnitId) ?? matrix[0];
  const selectedRecords = useMemo(() => records.filter((record) => record.unit === selected?.unit), [records, selected]);
  const selectedEvidence = useMemo(() => selectedRecords.flatMap((record) => record.evidence.map((item) => ({ ...item, recordId: record.id }))), [selectedRecords]);
  const fiscalYear = String(period.buddhistYear);
  const progressTarget = getQuarterProgressTarget(period.quarter);
  const visibleNavigation = primaryNavigation.filter((item) => !item.adminOnly || viewer.roles.includes("admin"));
  const currentHref = visibleNavigation
    .filter((item) => isCurrentNavigationPath(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th");
    return matrix.filter((row) => {
      const matchesQuery = !normalized || `${row.code} ${row.unit}`.toLocaleLowerCase("th").includes(normalized);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [matrix, query, statusFilter]);

  const totals = useMemo(() => {
    const approved = matrix.reduce((sum, row) => sum + row.approved, 0);
    const requested = matrix.reduce((sum, row) => sum + row.requested, 0);
    const projects = matrix.reduce((sum, row) => sum + row.projectCount, 0);
    const evidence = matrix.reduce((sum, row) => sum + row.evidenceTotal, 0);
    const averageProgress = projects > 0 ? matrix.reduce((sum, row) => sum + row.progress * row.projectCount, 0) / projects : 0;
    const averageDisbursement = approved > 0 ? matrix.reduce((sum, row) => sum + row.disbursement * row.approved, 0) / approved : 0;
    return { approved, requested, projects, evidence, averageProgress, averageDisbursement };
  }, [matrix]);

  function selectUnit(row: CommandCenterRow) {
    setSelectedUnitId(row.id);
    setInspectorOpen(true);
    setInspectorTab("summary");
  }

  function selectQueueRecord(record: DecisionRecord) {
    const row = matrix.find((item) => item.unit === record.unit);
    if (row) selectUnit(row);
  }

  function exportCsv() {
    const header = ["รหัสหน่วยงาน", "หน่วยงาน", "คำของบ (บาท)", "อนุมัติ (บาท)", "ความก้าวหน้า (%)", "เบิกจ่าย (%)", "KPI (%)", "หลักฐานตรวจแล้ว", "หลักฐานทั้งหมด", "สถานะ"];
    const rows = visibleRows.map((row) => [row.code, row.unit, row.requested, row.approved, row.progress.toFixed(1), row.disbursement.toFixed(1), row.kpiScore?.toFixed(1) ?? "", row.evidenceVerified, row.evidenceTotal, statusMeta[row.status].label]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `executive-command-center-${fiscalYear}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="cc-shell">
      <aside className="cc-sidebar" aria-label="เมนูหลัก">
        <Link className="cc-brand" href="/" aria-label="ระบบบริหารแผน หน้าหลัก"><span>ระบบบริหารแผน</span><small>PLAN MANAGEMENT</small></Link>
        <nav className="cc-nav">
          {visibleNavigation.map(({ label, icon: Icon, href }) => (
            <Link className={`cc-nav-link ${currentHref === href ? "active" : ""}`} href={href} key={href} aria-current={currentHref === href ? "page" : undefined}><Icon size={18} strokeWidth={1.9} /><span>{label}</span></Link>
          ))}
        </nav>
        <section className="cc-legend" aria-label="คำอธิบายสถานะ">
          <h2>สถานะ:</h2>
          {commandCenterStatuses.map((status) => <div key={status}><StatusDot status={status} /><span>{statusMeta[status].label}</span></div>)}
        </section>
        <p className="cc-asof">ข้อมูลตามสิทธิ์ผู้ใช้งาน</p>
      </aside>

      <div className="cc-workspace">
        <header className="cc-topbar">
          <div className="cc-period-controls">
            <button type="button">ปีงบประมาณ <strong>{fiscalYear}</strong><CalendarDays size={16} /></button>
            <button type="button">{period.quarterLabel}<ChevronDown size={16} /></button>
            <span className="cc-live-badge"><span />ข้อมูลจริง</span>
          </div>
          <div className="cc-utilities">
            <Link className="cc-utility-link" aria-label={`การแจ้งเตือน ${viewer.unreadNotifications} รายการ`} href="/notifications" title="การแจ้งเตือน"><Megaphone size={17} /><span className="cc-utility-label">แจ้งเตือน</span>{viewer.unreadNotifications > 0 ? <b>{Math.min(viewer.unreadNotifications, 99)}</b> : null}</Link>
            <button type="button" onClick={exportCsv} title="ส่งออก CSV"><Download size={17} /><span className="cc-utility-label">ส่งออก</span></button>
            <button type="button" onClick={() => window.print()} title="พิมพ์รายงาน"><Printer size={17} /><span className="cc-utility-label">พิมพ์</span></button>
            <button className={filterOpen ? "active" : ""} type="button" onClick={() => setFilterOpen((open) => !open)} aria-expanded={filterOpen} title="ตัวกรอง"><Filter size={17} /><span className="cc-utility-label">ตัวกรอง</span></button>
            <form action="/auth/signout" method="post"><button type="submit" title="ออกจากระบบ" aria-label="ออกจากระบบ"><LogOut size={17} /></button></form>
          </div>
        </header>

        <main className="cc-main">
          <p className="sr-only" role="status" aria-live="polite">{selected ? `กำลังแสดงข้อมูล ${selected.unit} สถานะ ${statusMeta[selected.status].label}` : "ยังไม่มีข้อมูลหน่วยงาน"}</p>
          <section className="cc-decision-strip" aria-labelledby="decision-heading">
            <div className="cc-section-heading"><div><h1 id="decision-heading">รายการที่ต้องตัดสินใจ</h1><span>{records.length.toLocaleString("th-TH")}</span></div><Link href="/reports">ดูทั้งหมด</Link></div>
            <div className="cc-queue">
              {records.slice(0, 6).map((record) => {
                const Icon = stageIcons[record.stage];
                return <button type="button" className="cc-queue-item" key={`${record.uuid}-${record.stage}`} onClick={() => selectQueueRecord(record)}><Icon size={21} aria-hidden="true" /><span><strong>{record.state}</strong><small>{record.unit}</small><b>{record.amount}</b><em>{record.progress < 40 ? "ควรดำเนินการเร่งด่วน" : `ความก้าวหน้า ${record.progress}%`}</em></span></button>;
              })}
              {records.length === 0 ? <div className="cc-queue-empty"><CircleCheck size={22} /><span><strong>ไม่มีรายการรอตัดสินใจ</strong><small>รายการทั้งหมดอยู่ในสถานะปกติ</small></span></div> : null}
            </div>
          </section>

          {filterOpen ? <section className="cc-filter-panel" aria-label="ตัวกรองข้อมูล"><label><Search size={16} /><span className="sr-only">ค้นหาหน่วยงาน</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหารหัสหรือชื่อหน่วยงาน" /></label><div role="group" aria-label="กรองตามสถานะ">{statusFilters.map((filter) => <button type="button" className={statusFilter === filter.value ? "active" : ""} key={filter.value} onClick={() => setStatusFilter(filter.value)}>{filter.label}</button>)}</div></section> : null}

          <section className={`cc-command-grid ${inspectorOpen && selected ? "with-inspector" : ""}`}>
            <div className="cc-matrix-panel">
              <div className="cc-matrix-scroll" role="region" aria-label="ตารางภาพรวมผลการดำเนินงานทุกหน่วยงาน" tabIndex={0}>
                <table className="cc-matrix">
                  <thead><tr><th className="cc-rank-col">#</th><th>หน่วยงาน / โครงการ</th><th>คำของบ<small>(ล้านบาท)</small></th><th>อนุมัติ<small>(ล้านบาท)</small></th><th>ดำเนินงาน<small>(ร้อยละ)</small></th><th>เบิกจ่าย<small>(ร้อยละ)</small></th><th>KPI<small>ผลเทียบเป้าหมาย</small></th><th>หลักฐาน<small>ตรวจแล้ว / ทั้งหมด</small></th><th className="cc-pin-col"><span className="sr-only">เปิดเครื่องมือตรวจสอบ</span></th></tr></thead>
                  <tbody>
                    {visibleRows.map((row, index) => (
                      <tr className={selected?.id === row.id ? "selected" : ""} key={row.id} onClick={() => selectUnit(row)}>
                        <td className="cc-rank-col">{index + 1}</td>
                        <td className="cc-unit-cell"><strong>{row.unit}</strong><span>{row.code} · {row.projectCount.toLocaleString("th-TH")} โครงการ</span><em>ยุทธศาสตร์ที่ {((index % 4) + 1).toLocaleString("th-TH")}</em></td>
                        <td><strong>{formatMillion(row.requested)}</strong><small>{row.requested > 0 ? "100%" : "—"}</small></td>
                        <td><strong>{formatMillion(row.approved)}</strong><small>{row.requested > 0 ? formatPercent(Math.min(100, (row.approved / row.requested) * 100)) : "—"}</small></td>
                        <td><ProgressMetric value={row.progress} target={progressTarget} status={row.status} /></td>
                        <td><ProgressMetric value={row.disbursement} target={row.disbursementTarget} status={row.status} /></td>
                        <td className="cc-kpi-cell"><strong>{row.kpiScore === null ? "—" : formatPercent(row.kpiScore)}</strong><StatusDot status={row.kpiScore === null ? "noData" : row.kpiScore >= COMMAND_CENTER_THRESHOLDS.kpiAhead ? "ahead" : row.kpiScore >= COMMAND_CENTER_THRESHOLDS.kpiOnTrack ? "onTrack" : row.kpiScore >= COMMAND_CENTER_THRESHOLDS.kpiRisk ? "watch" : "risk"} /><small>บรรลุ {row.kpiMet}/{row.kpiTotal}</small></td>
                        <td className="cc-evidence-cell"><span><FileText size={15} />{row.evidenceVerified}</span><span><Paperclip size={15} />{row.evidenceTotal}</span></td>
                        <td className="cc-pin-col"><button type="button" aria-label={`ตรวจสอบ ${row.unit}`} aria-pressed={selected?.id === row.id} onClick={(event) => { event.stopPropagation(); selectUnit(row); }}><Pin size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td /><td><strong>รวมทั้งสิ้น</strong><small>{matrix.length} หน่วยงาน · {totals.projects} โครงการ</small></td><td><strong>{formatMillion(totals.requested)}</strong></td><td><strong>{formatMillion(totals.approved)}</strong></td><td><strong>{formatPercent(totals.averageProgress)}</strong></td><td><strong>{formatPercent(totals.averageDisbursement)}</strong></td><td><strong>{matrix.reduce((sum, row) => sum + row.kpiMet, 0)}/{matrix.reduce((sum, row) => sum + row.kpiTotal, 0)}</strong></td><td><strong>{totals.evidence}</strong></td><td /></tr></tfoot>
                </table>
                {visibleRows.length === 0 ? <div className="cc-no-results"><Search size={22} /><strong>ไม่พบหน่วยงานที่ตรงกับตัวกรอง</strong><button type="button" onClick={() => { setQuery(""); setStatusFilter("all"); }}>ล้างตัวกรอง</button></div> : null}
              </div>

              <div className="cc-mobile-list">{visibleRows.map((row, index) => <button type="button" className={selected?.id === row.id ? "selected" : ""} key={row.id} onClick={() => selectUnit(row)}><span className="cc-mobile-rank">{index + 1}</span><span className="cc-mobile-unit"><strong>{row.unit}</strong><small>{row.code} · {row.projectCount} โครงการ</small></span><StatusDot status={row.status} /><span className="cc-mobile-metrics"><b>คืบหน้า {formatPercent(row.progress)}</b><b>เบิกจ่าย {formatPercent(row.disbursement)}</b></span></button>)}</div>

              <footer className="cc-matrix-footer"><div>{commandCenterStatuses.map((status) => <span key={status}><StatusDot status={status} />{statusMeta[status].short}</span>)}</div><p>กฎการเชื่อมหลักฐาน: หน่วยงาน → โครงการ → KPI → รายงานรายไตรมาส</p></footer>
            </div>

            {inspectorOpen && selected ? (
              <aside className="cc-inspector" id="evidence-inspector" aria-label={`เครื่องมือตรวจสอบหลักฐาน ${selected.unit}`}>
                <div className="cc-inspector-head"><strong>เครื่องมือตรวจสอบหลักฐาน</strong><button type="button" onClick={() => setInspectorOpen(false)} aria-label="ปิดเครื่องมือตรวจสอบ"><X size={18} /></button></div>
                <div className="cc-inspector-identity"><span>{selected.unit}</span><strong>{selected.code}</strong><p><StatusDot status={selected.status} />{statusMeta[selected.status].label}</p></div>
                <div className="cc-inspector-tabs" role="tablist" aria-label="รายละเอียดหน่วยงาน"><button type="button" role="tab" aria-selected={inspectorTab === "summary"} onClick={() => setInspectorTab("summary")}>สรุป</button><button type="button" role="tab" aria-selected={inspectorTab === "evidence"} onClick={() => setInspectorTab("evidence")}>หลักฐาน ({selected.evidenceTotal})</button><button type="button" role="tab" aria-selected={inspectorTab === "references"} onClick={() => setInspectorTab("references")}>การอ้างอิง</button></div>

                {inspectorTab === "summary" ? <div className="cc-inspector-content"><section className="cc-audit-score"><span>ความก้าวหน้า {period.quarterLabel}</span><strong>{formatPercent(selected.progress)}</strong><small>เป้าหมาย {formatPercent(progressTarget)}</small><div><span style={{ width: `${Math.min(100, selected.progress)}%` }} /></div><em className={selected.progress >= progressTarget ? "positive" : "negative"}>{selected.progress >= progressTarget ? "ตามแผน" : "ต่ำกว่าแผน"} ({selected.progress - progressTarget >= 0 ? "+" : ""}{formatPercent(selected.progress - progressTarget)})</em></section><dl className="cc-inspector-facts"><div><dt>วงเงินอนุมัติ</dt><dd>{formatMillion(selected.approved)} ลบ.</dd></div><div><dt>เบิกจ่ายสะสม</dt><dd>{formatPercent(selected.disbursement)}</dd></div><div><dt>KPI บรรลุเป้าหมาย</dt><dd>{selected.kpiMet}/{selected.kpiTotal}</dd></div><div><dt>หลักฐานตรวจแล้ว</dt><dd>{selected.evidenceVerified}/{selected.evidenceTotal}</dd></div></dl><section className="cc-top-evidence"><h3>หลักฐานเด่น (Top Evidence)</h3>{selectedEvidence.slice(0, 3).map((evidence) => <div key={`${evidence.recordId}-${evidence.name}`}><FileText size={16} /><span><strong>{evidence.recordId}</strong><small>{evidence.name}</small></span>{evidence.verified ? <Check className="verified" size={15} /> : <TriangleAlert className="pending" size={15} />}</div>)}{selectedEvidence.length === 0 ? <p>ยังไม่มีหลักฐานในรายการที่รอตัดสินใจ</p> : null}</section></div> : null}

                {inspectorTab === "evidence" ? <div className="cc-inspector-content cc-evidence-list">{selectedEvidence.map((evidence) => <article key={`${evidence.recordId}-${evidence.name}`}><FileText size={17} /><div><strong>{evidence.name}</strong><span>{evidence.recordId} · {evidence.date}</span></div>{evidence.verified ? <CircleCheck className="verified" size={17} /> : <TriangleAlert className="pending" size={17} />}</article>)}{selectedEvidence.length === 0 ? <p className="cc-empty-note">ยังไม่มีเอกสารในรายการที่อยู่ระหว่างตรวจสอบ</p> : null}</div> : null}

                {inspectorTab === "references" ? <div className="cc-inspector-content cc-reference-list"><Link href="/budget-requests"><span>คำของบประมาณ</span><strong>{selectedRecords.filter((record) => record.stage === "คำของบ").length} รายการ</strong><ExternalLink size={14} /></Link><Link href="/projects"><span>โครงการและการดำเนินงาน</span><strong>{selected.projectCount} โครงการ</strong><ExternalLink size={14} /></Link><Link href="/disbursements"><span>ทะเบียนเบิกจ่าย</span><strong>{formatPercent(selected.disbursement)}</strong><ExternalLink size={14} /></Link><Link href="/kpi"><span>ตัวชี้วัด EdPEx / AUN-QA</span><strong>{selected.kpiTotal} ตัวชี้วัด</strong><ExternalLink size={14} /></Link></div> : null}

                <div className="cc-inspector-actions"><button type="button" onClick={() => window.print()}>พิมพ์สรุปการตรวจสอบ</button><Link href="/reports">เปิดรายงานฉบับเต็ม</Link></div>
                <div className="cc-inspector-user"><span className="cc-avatar">{viewer.fullName.slice(0, 1)}</span><p><strong>{viewer.fullName}</strong><small>ข้อมูลตามสิทธิ์ {viewer.role}</small></p><Bell size={16} /></div>
              </aside>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
