import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDashboardData } from "@/features/dashboard/queries";
import { BUDGET_REQUEST_STRATEGY_OPTIONS } from "@/features/budget-requests/source-options";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";

const mock = vi.hoisted(() => {
  type Response = { data: Record<string, unknown>[]; error: { message: string } | null };
  const responses = new Map<string, Response>();
  const queries = new Map<string, ReturnType<typeof makeQuery>>();
  function makeQuery(table: string) {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      then(resolve: (value: Response) => unknown) {
        return Promise.resolve(responses.get(table) ?? { data: [], error: null }).then(resolve);
      },
    };
  }
  const from = vi.fn((table: string) => {
    const query = makeQuery(table);
    queries.set(table, query);
    return query;
  });
  return { responses, queries, from };
});
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: mock.from }) }));
vi.mock("@/features/shared/queries", () => ({
  getReportingPeriod: async () => ({ fiscalYearId: "year-2570", buddhistYear: 2570, quarter: 1 }),
}));
vi.mock("@/lib/observability/server-logger", () => ({
  reportServerError: () => "test-event",
  publicFailureMessage: () => "อ่านข้อมูลไม่สำเร็จ",
}));

beforeEach(() => {
  vi.clearAllMocks();
  mock.responses.clear();
  mock.queries.clear();
});

describe("dashboard strategies from budget requests", () => {
  it("keeps all selected names per organization, deduplicates, and supports strategy 5", async () => {
    const budget = (organization_id: string, strategyName: unknown) => ({
      organization_id,
      strategyName,
      amount: 100,
      organizations: { name_th: organization_id },
    });
    mock.responses.set("budget_requests", {
      error: null,
      data: [
        budget("procurement", BUDGET_REQUEST_STRATEGY_OPTIONS[4]),
        budget("procurement", BUDGET_REQUEST_STRATEGY_OPTIONS[0]),
        budget("procurement", ` ${BUDGET_REQUEST_STRATEGY_OPTIONS[4]} `),
        budget("research", BUDGET_REQUEST_STRATEGY_OPTIONS[2]),
        budget("empty", "  "),
        budget("empty", null),
        budget("empty", 5),
      ],
    });
    const response = await getDashboardData();
    expect(response.error).toBeNull();
    const rows = response.data.matrix;
    expect(rows.find((row) => row.id === "procurement")).toMatchObject({
      requested: 300,
      strategyNames: [BUDGET_REQUEST_STRATEGY_OPTIONS[0], BUDGET_REQUEST_STRATEGY_OPTIONS[4]],
    });
    expect(rows.find((row) => row.id === "research")?.strategyNames).toEqual([
      BUDGET_REQUEST_STRATEGY_OPTIONS[2],
    ]);
    expect(rows.find((row) => row.id === "empty")?.strategyNames).toEqual([]);
    const query = mock.queries.get("budget_requests");
    expect(query?.eq).toHaveBeenCalledWith("fiscal_years.buddhist_year", 2570);
    expect(query?.is).toHaveBeenCalledWith("archived_at", null);
    expect(query?.not).toHaveBeenCalledWith("id", "in", RETIRED_DEMO_FILTERS.budgetRequests);
    expect(query?.select).toHaveBeenCalledWith(
      expect.stringContaining("strategyName:proposal_details->strategyName"),
    );
    expect(mock.from.mock.calls.filter(([name]) => name === "budget_requests")).toHaveLength(1);
  });

  it("does not invent a strategy for organizations with projects but no budget metadata", async () => {
    mock.responses.set("project_register", {
      error: null,
      data: [{ organization_id: "legacy", unit: "Legacy", budget: 500, progress: 0 }],
    });
    const response = await getDashboardData();
    expect(response.data.matrix[0].strategyNames).toEqual([]);
  });

  it("reports a failed budget query instead of showing misleading strategy labels", async () => {
    mock.responses.set("budget_requests", { data: [], error: { message: "unavailable" } });
    const response = await getDashboardData();
    expect(response.error).not.toBeNull();
    expect(response.data.matrix).toEqual([]);
  });
});
