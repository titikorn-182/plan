import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectFormOptions } from "@/features/projects/queries";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";
import { QUERY_LIMITS } from "@/lib/config/limits";

const mock = vi.hoisted(() => {
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  };
  return { query, client: { from: vi.fn(() => query) } };
});
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.client }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: async () => ({ fullName: "Test staff" }) }));
vi.mock("@/features/shared/queries", () => ({
  getOrganizationsAndYears: async () => ({
    organizations: [],
    fiscalYears: [{ id: "year", label: "ปีงบประมาณ 2570", buddhistYear: 2570 }],
    error: null,
  }),
}));
vi.mock("@/features/shared/master-data-queries", async () => {
  const { TEST_MASTER_DATA } = await import("@/tests/fixtures/master-data");
  return {
    getFiscalYearMasterDataCatalogs: async () => ({
      data: [{ ...TEST_MASTER_DATA, fiscalYearId: "year" }],
      error: null,
    }),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  mock.query.limit.mockResolvedValue({ data: [], error: null });
});

describe("approved budget source options", () => {
  it("requests lightweight metadata from approved nonarchived, non-demo sources only", async () => {
    await getProjectFormOptions();
    expect(mock.client.from).toHaveBeenCalledExactlyOnceWith("budget_requests");
    expect(mock.query.select).toHaveBeenCalledExactlyOnceWith(
      "id,code,title_th,organization_id,fiscal_year_id,sub_activity_name:proposal_details->>subActivityName",
    );
    expect(mock.query.eq).toHaveBeenCalledExactlyOnceWith("status", "approved");
    expect(mock.query.is).toHaveBeenCalledExactlyOnceWith("archived_at", null);
    expect(mock.query.not).toHaveBeenCalledExactlyOnceWith(
      "id",
      "in",
      RETIRED_DEMO_FILTERS.budgetRequests,
    );
    expect(mock.query.limit).toHaveBeenCalledExactlyOnceWith(QUERY_LIMITS.selectOptions);
  });

  it("labels options with subactivities and falls back safely for older records", async () => {
    mock.query.limit.mockResolvedValue({
      data: [
        {
          id: "a",
          code: "BR-A",
          title_th: "Parent",
          organization_id: "org",
          fiscal_year_id: "year",
          sub_activity_name: "  Subactivity  ",
        },
        {
          id: "b",
          code: "BR-B",
          title_th: "Legacy title",
          organization_id: "org",
          fiscal_year_id: "year",
          sub_activity_name: "  ",
        },
        {
          id: "c",
          code: "BR-C",
          title_th: "Older title",
          organization_id: "org",
          fiscal_year_id: "year",
          sub_activity_name: null,
        },
      ],
      error: null,
    });
    const result = await getProjectFormOptions();
    expect(result.data?.budgetRequests).toEqual([
      {
        id: "a",
        code: "BR-A",
        title: "Subactivity",
        label: "BR-A · Subactivity",
        organizationId: "org",
        fiscalYearId: "year",
      },
      {
        id: "b",
        code: "BR-B",
        title: "Legacy title",
        label: "BR-B · Legacy title",
        organizationId: "org",
        fiscalYearId: "year",
      },
      {
        id: "c",
        code: "BR-C",
        title: "Older title",
        label: "BR-C · Older title",
        organizationId: "org",
        fiscalYearId: "year",
      },
    ]);
  });

  it("returns an empty dropdown when no accessible approved source exists", async () => {
    expect((await getProjectFormOptions()).data?.budgetRequests).toEqual([]);
  });
});
