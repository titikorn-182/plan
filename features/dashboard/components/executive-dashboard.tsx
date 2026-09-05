"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import type { Viewer } from "@/features/auth/types";
import { CommandCenterFilters } from "@/features/dashboard/components/command-center-filters";
import { CommandCenterMatrix } from "@/features/dashboard/components/command-center-matrix";
import { CommandCenterSidebar } from "@/features/dashboard/components/command-center-sidebar";
import { CommandCenterToolbar } from "@/features/dashboard/components/command-center-toolbar";
import { DecisionQueue } from "@/features/dashboard/components/decision-queue";
import {
  EvidenceInspector,
  type InspectorTab,
} from "@/features/dashboard/components/evidence-inspector";
import {
  calculateDashboardTotals,
  COMMAND_CENTER_STATUS_META,
  createCommandCenterCsv,
} from "@/features/dashboard/presentation";
import type {
  CommandCenterRow,
  CommandCenterStatus,
  DecisionRecord,
} from "@/features/dashboard/types";
import type { ReportingPeriod } from "@/features/shared/types";
import { downloadCsv } from "@/lib/browser/download";
import { getQuarterProgressTarget } from "@/lib/operations/rules";

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
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("summary");

  const selected = matrix.find((row) => row.id === selectedUnitId) ?? matrix[0];
  const selectedRecords = useMemo(
    () => records.filter((record) => record.unit === selected?.unit),
    [records, selected?.unit],
  );
  const selectedEvidence = useMemo(
    () =>
      selectedRecords.flatMap((record) =>
        record.evidence.map((item) => ({ ...item, recordId: record.id })),
      ),
    [selectedRecords],
  );
  const progressTarget = getQuarterProgressTarget(period.quarter);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th");
    return matrix.filter((row) => {
      const matchesQuery =
        !normalized || `${row.code} ${row.unit}`.toLocaleLowerCase("th").includes(normalized);
      const matchesStatus = statusFilter === "all" || row.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [matrix, query, statusFilter]);

  const totals = useMemo(() => calculateDashboardTotals(matrix), [matrix]);

  function selectUnit(row: CommandCenterRow): void {
    setSelectedUnitId(row.id);
    setInspectorOpen(true);
    setInspectorTab("summary");
  }

  function selectQueueRecord(record: DecisionRecord): void {
    const row = matrix.find((item) => item.unit === record.unit);
    if (row) selectUnit(row);
  }

  function exportCsv(): void {
    downloadCsv(
      createCommandCenterCsv(visibleRows),
      `executive-command-center-${period.buddhistYear}.csv`,
    );
  }

  function clearFilters(): void {
    setQuery("");
    setStatusFilter("all");
  }

  return (
    <div className="cc-shell">
      <CommandCenterSidebar pathname={pathname} viewer={viewer} />

      <div className="cc-workspace">
        <CommandCenterToolbar
          filterOpen={filterOpen}
          onExport={exportCsv}
          onToggleFilter={() => setFilterOpen((open) => !open)}
          period={period}
          viewer={viewer}
        />

        <main className="cc-main">
          <p className="sr-only" role="status" aria-live="polite">
            {selected
              ? `กำลังแสดงข้อมูล ${selected.unit} สถานะ ${COMMAND_CENTER_STATUS_META[selected.status].label}`
              : "ยังไม่มีข้อมูลหน่วยงาน"}
          </p>
          <DecisionQueue records={records} onSelect={selectQueueRecord} />

          {filterOpen ? (
            <CommandCenterFilters
              query={query}
              status={statusFilter}
              onQueryChange={setQuery}
              onStatusChange={setStatusFilter}
            />
          ) : null}

          <section
            className={`cc-command-grid ${inspectorOpen && selected ? "with-inspector" : ""}`}
          >
            <CommandCenterMatrix
              allRows={matrix}
              onClearFilters={clearFilters}
              onSelect={selectUnit}
              progressTarget={progressTarget}
              rows={visibleRows}
              selected={selected}
              totals={totals}
            />

            {inspectorOpen && selected ? (
              <EvidenceInspector
                evidence={selectedEvidence}
                onClose={() => setInspectorOpen(false)}
                onTabChange={setInspectorTab}
                period={period}
                progressTarget={progressTarget}
                records={selectedRecords}
                selected={selected}
                tab={inspectorTab}
                viewer={viewer}
              />
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
