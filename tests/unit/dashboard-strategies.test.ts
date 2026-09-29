import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CommandCenterMatrix } from "@/features/dashboard/components/command-center-matrix";
import { calculateDashboardTotals } from "@/features/dashboard/presentation";
import type { CommandCenterRow } from "@/features/dashboard/types";
import { BUDGET_REQUEST_STRATEGY_OPTIONS } from "@/features/budget-requests/source-options";

const strategyRows: CommandCenterRow[] = [
  {
    id: "a",
    code: "SEC-PROCUREMENT",
    unit: "สำนักงานเลขานุการ-งานพัสดุ",
    strategyNames: [BUDGET_REQUEST_STRATEGY_OPTIONS[0], BUDGET_REQUEST_STRATEGY_OPTIONS[4]],
    requested: 5000,
    approved: 5000,
    progress: 0,
    disbursement: 0,
    disbursementTarget: 25,
    kpiScore: null,
    kpiMet: 0,
    kpiTotal: 0,
    evidenceVerified: 0,
    evidenceTotal: 0,
    projectCount: 2,
    status: "noData",
  },
];
function render(rows: CommandCenterRow[]) {
  return renderToStaticMarkup(
    createElement(CommandCenterMatrix, {
      allRows: rows,
      rows,
      totals: calculateDashboardTotals(rows),
      progressTarget: 25,
      onSelect: () => undefined,
      onClearFilters: () => undefined,
    }),
  );
}
describe("dashboard strategy labels", () => {
  it("shows the actual full names in desktop and mobile layouts", () => {
    const html = render(strategyRows);
    for (const strategy of strategyRows[0].strategyNames) {
      expect(html.split(`<em>${strategy}</em>`)).toHaveLength(3);
    }
    expect(html).not.toContain("<em>ยุทธศาสตร์ที่ 1</em>");
  });
  it("keeps the strategy attached to the organization after filtering or reordering", () => {
    const other = {
      ...strategyRows[0],
      id: "b",
      strategyNames: [BUDGET_REQUEST_STRATEGY_OPTIONS[2]],
    };
    const html = render([other, ...strategyRows]);
    expect(html.indexOf(BUDGET_REQUEST_STRATEGY_OPTIONS[2])).toBeLessThan(
      html.indexOf(BUDGET_REQUEST_STRATEGY_OPTIONS[4]),
    );
    expect(render([other])).toContain(BUDGET_REQUEST_STRATEGY_OPTIONS[2]);
    expect(render([other])).not.toContain(BUDGET_REQUEST_STRATEGY_OPTIONS[4]);
  });
  it("uses explicit empty copy instead of assigning a row-based strategy", () => {
    const html = render([{ ...strategyRows[0], strategyNames: [] }]);
    expect(html.split("<em>ยังไม่ระบุกลยุทธ์</em>")).toHaveLength(3);
    expect(html).not.toContain("ยุทธศาสตร์ที่");
  });
});
