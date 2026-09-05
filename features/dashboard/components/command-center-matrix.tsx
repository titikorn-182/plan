import { FileText, Paperclip, Pin, Search } from "lucide-react";
import {
  COMMAND_CENTER_STATUSES,
  COMMAND_CENTER_STATUS_META,
  getKpiCommandStatus,
  type DashboardTotals,
} from "@/features/dashboard/presentation";
import type { CommandCenterRow } from "@/features/dashboard/types";
import { formatMillionBaht, formatPercent, formatThaiInteger } from "@/features/shared/formatters";
import { ProgressMetric, StatusDot } from "@/features/dashboard/components/status-metric";

export function CommandCenterMatrix({
  allRows,
  onClearFilters,
  onSelect,
  progressTarget,
  rows,
  selected,
  totals,
}: {
  allRows: CommandCenterRow[];
  onClearFilters: () => void;
  onSelect: (row: CommandCenterRow) => void;
  progressTarget: number;
  rows: CommandCenterRow[];
  selected?: CommandCenterRow;
  totals: DashboardTotals;
}) {
  const kpiMet = allRows.reduce((sum, row) => sum + row.kpiMet, 0);
  const kpiTotal = allRows.reduce((sum, row) => sum + row.kpiTotal, 0);

  return (
    <div className="cc-matrix-panel">
      <div
        className="cc-matrix-scroll"
        role="region"
        aria-label="ตารางภาพรวมผลการดำเนินงานทุกหน่วยงาน"
        tabIndex={0}
      >
        <table className="cc-matrix">
          <thead>
            <tr>
              <th className="cc-rank-col">#</th>
              <th>หน่วยงาน / โครงการ</th>
              <th>
                คำของบ<small>(ล้านบาท)</small>
              </th>
              <th>
                อนุมัติ<small>(ล้านบาท)</small>
              </th>
              <th>
                ดำเนินงาน<small>(ร้อยละ)</small>
              </th>
              <th>
                เบิกจ่าย<small>(ร้อยละ)</small>
              </th>
              <th>
                KPI<small>ผลเทียบเป้าหมาย</small>
              </th>
              <th>
                หลักฐาน<small>ตรวจแล้ว / ทั้งหมด</small>
              </th>
              <th className="cc-pin-col">
                <span className="sr-only">เปิดเครื่องมือตรวจสอบ</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                className={selected?.id === row.id ? "selected" : ""}
                key={row.id}
                onClick={() => onSelect(row)}
              >
                <td className="cc-rank-col">{index + 1}</td>
                <td className="cc-unit-cell">
                  <strong>{row.unit}</strong>
                  <span>
                    {row.code} · {formatThaiInteger(row.projectCount)} โครงการ
                  </span>
                  <em>ยุทธศาสตร์ที่ {formatThaiInteger((index % 4) + 1)}</em>
                </td>
                <td>
                  <strong>{formatMillionBaht(row.requested)}</strong>
                  <small>{row.requested > 0 ? "100%" : "—"}</small>
                </td>
                <td>
                  <strong>{formatMillionBaht(row.approved)}</strong>
                  <small>
                    {row.requested > 0
                      ? formatPercent(Math.min(100, (row.approved / row.requested) * 100))
                      : "—"}
                  </small>
                </td>
                <td>
                  <ProgressMetric
                    value={row.progress}
                    target={progressTarget}
                    status={row.status}
                  />
                </td>
                <td>
                  <ProgressMetric
                    value={row.disbursement}
                    target={row.disbursementTarget}
                    status={row.status}
                  />
                </td>
                <td className="cc-kpi-cell">
                  <strong>{row.kpiScore === null ? "—" : formatPercent(row.kpiScore)}</strong>
                  <StatusDot status={getKpiCommandStatus(row.kpiScore)} />
                  <small>
                    บรรลุ {row.kpiMet}/{row.kpiTotal}
                  </small>
                </td>
                <td className="cc-evidence-cell">
                  <span>
                    <FileText size={15} />
                    {row.evidenceVerified}
                  </span>
                  <span>
                    <Paperclip size={15} />
                    {row.evidenceTotal}
                  </span>
                </td>
                <td className="cc-pin-col">
                  <button
                    type="button"
                    aria-label={`ตรวจสอบ ${row.unit}`}
                    aria-pressed={selected?.id === row.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(row);
                    }}
                  >
                    <Pin size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              <td>
                <strong>รวมทั้งสิ้น</strong>
                <small>
                  {allRows.length} หน่วยงาน · {totals.projects} โครงการ
                </small>
              </td>
              <td>
                <strong>{formatMillionBaht(totals.requested)}</strong>
              </td>
              <td>
                <strong>{formatMillionBaht(totals.approved)}</strong>
              </td>
              <td>
                <strong>{formatPercent(totals.averageProgress)}</strong>
              </td>
              <td>
                <strong>{formatPercent(totals.averageDisbursement)}</strong>
              </td>
              <td>
                <strong>
                  {kpiMet}/{kpiTotal}
                </strong>
              </td>
              <td>
                <strong>{totals.evidence}</strong>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
        {rows.length === 0 ? (
          <div className="cc-no-results">
            <Search size={22} />
            <strong>ไม่พบหน่วยงานที่ตรงกับตัวกรอง</strong>
            <button type="button" onClick={onClearFilters}>
              ล้างตัวกรอง
            </button>
          </div>
        ) : null}
      </div>

      <div className="cc-mobile-list">
        {rows.map((row, index) => (
          <button
            type="button"
            className={selected?.id === row.id ? "selected" : ""}
            key={row.id}
            onClick={() => onSelect(row)}
          >
            <span className="cc-mobile-rank">{index + 1}</span>
            <span className="cc-mobile-unit">
              <strong>{row.unit}</strong>
              <small>
                {row.code} · {row.projectCount} โครงการ
              </small>
            </span>
            <StatusDot status={row.status} />
            <span className="cc-mobile-metrics">
              <b>คืบหน้า {formatPercent(row.progress)}</b>
              <b>เบิกจ่าย {formatPercent(row.disbursement)}</b>
            </span>
          </button>
        ))}
      </div>

      <footer className="cc-matrix-footer">
        <div>
          {COMMAND_CENTER_STATUSES.map((status) => (
            <span key={status}>
              <StatusDot status={status} />
              {COMMAND_CENTER_STATUS_META[status].short}
            </span>
          ))}
        </div>
        <p>กฎการเชื่อมหลักฐาน: หน่วยงาน → โครงการ → KPI → รายงานรายไตรมาส</p>
      </footer>
    </div>
  );
}
