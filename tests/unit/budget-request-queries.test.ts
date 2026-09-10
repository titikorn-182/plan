import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBudgetRequests } from "@/features/budget-requests/queries";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";

const mock = vi.hoisted(() => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(async () => ({ data: [], error: null, count: 0 })),
  };
  return { chain, client: { from: vi.fn(() => chain) } };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.client }));
vi.mock("@/features/shared/queries", () => ({
  getReportingPeriod: async () => ({ buddhistYear: 2570, quarter: 1 }),
}));

describe("budget request queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("excludes every retired demonstration request before counting and pagination", async () => {
    const result = await getBudgetRequests();

    expect(mock.chain.not).toHaveBeenCalledWith("id", "in", RETIRED_DEMO_FILTERS.budgetRequests);
    expect(result).toMatchObject({
      data: { items: [], pagination: { total: 0 } },
      error: null,
    });
  });
});
