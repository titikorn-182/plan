import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBudgetRequests } from "@/features/budget-requests/queries";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";
import type { Json, Tables } from "@/types/database.generated";

type QueryError = { code: string; message: string };
type RegisterResult = {
  data: Tables<"budget_request_register">[] | null;
  error: QueryError | null;
  count: number | null;
};
type DetailsResult = {
  data:
    | {
        id: string;
        subOrganizationName?: Json;
        subActivityName: Json;
        expenseItems: Json;
      }[]
    | null;
  error: QueryError | null;
};

const mock = vi.hoisted(() => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn<() => Promise<RegisterResult>>(),
  };
  const details = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn<() => Promise<DetailsResult>>(),
  };
  return {
    chain,
    details,
    client: { from: vi.fn((table: string) => (table === "budget_requests" ? details : chain)) },
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.client }));
vi.mock("@/features/shared/queries", () => ({
  getReportingPeriod: async () => ({ buddhistYear: 2570, quarter: 1 }),
}));

function registerRow(id: string): Tables<"budget_request_register"> {
  return {
    id,
    code: `BR-${id}`,
    title: "โครงการพัฒนาบุคลากร",
    unit: "สำนักงานเลขานุการ",
    category: "ดำเนินงาน",
    amount: 1000,
    status: "draft",
    buddhist_year: 2570,
    organization_id: "organization-id",
    updated_at: "2026-09-21T10:00:00Z",
    version: 1,
  };
}

describe("budget request queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.chain.range.mockResolvedValue({ data: [], error: null, count: 0 });
    mock.details.in.mockResolvedValue({ data: [], error: null });
  });

  it("excludes every retired demonstration request before counting and pagination", async () => {
    const result = await getBudgetRequests();

    expect(mock.chain.not).toHaveBeenCalledWith("id", "in", RETIRED_DEMO_FILTERS.budgetRequests);
    expect(mock.client.from).toHaveBeenCalledTimes(1);
    expect(mock.details.in).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      data: { items: [], pagination: { total: 0 } },
      error: null,
    });
  });

  it("loads only the displayed page's metadata in one RLS query without changing filters or pagination", async () => {
    mock.chain.range.mockResolvedValue({
      data: [
        registerRow("first"),
        registerRow("second"),
        { ...registerRow("invalid"), title: null },
      ],
      error: null,
      count: 45,
    });
    mock.details.in.mockResolvedValue({
      data: [
        {
          id: "second",
          subOrganizationName: "สำนักงานเลขานุการ-งานโสตทัศนศึกษา",
          subActivityName: null,
          expenseItems: [{ subActivityName: "นำเข้าจากไฟล์" }],
        },
        {
          id: "first",
          subOrganizationName: " สำนักงานเลขานุการ-งานสารบรรณและธุรการ ",
          subActivityName: "ประชุมบุคลากร",
          expenseItems: [{ subActivityName: "ประชุมบุคลากร" }, { subActivityName: "ติดตามผล" }],
        },
      ],
      error: null,
    });

    const result = await getBudgetRequests(2);

    expect(mock.client.from.mock.calls).toEqual([["budget_request_register"], ["budget_requests"]]);
    expect(mock.chain.eq).toHaveBeenCalledWith("buddhist_year", 2570);
    expect(mock.chain.not).toHaveBeenCalledWith("id", "in", RETIRED_DEMO_FILTERS.budgetRequests);
    expect(mock.chain.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    expect(mock.chain.range).toHaveBeenCalledWith(20, 39);
    expect(mock.details.select).toHaveBeenCalledWith(
      "id,subOrganizationName:proposal_details->organizationName,subActivityName:proposal_details->subActivityName,expenseItems:proposal_details->expenseItems",
    );
    expect(mock.details.in).toHaveBeenCalledExactlyOnceWith("id", ["first", "second"]);
    expect(result.error).toBeNull();
    expect(
      result.data.items.map((item) => ({ uuid: item.uuid, names: item.subActivityNames })),
    ).toEqual([
      { uuid: "first", names: ["ประชุมบุคลากร", "ติดตามผล"] },
      { uuid: "second", names: ["นำเข้าจากไฟล์"] },
    ]);
    expect(result.data.pagination).toEqual({ page: 2, pageSize: 20, total: 45, totalPages: 3 });
    expect(
      result.data.items.map((item) => ({
        unit: item.unit,
        subOrganizationName: item.subOrganizationName,
      })),
    ).toEqual([
      { unit: "สำนักงานเลขานุการ", subOrganizationName: "สำนักงานเลขานุการ-งานสารบรรณและธุรการ" },
      { unit: "สำนักงานเลขานุการ", subOrganizationName: "สำนักงานเลขานุการ-งานโสตทัศนศึกษา" },
    ]);
  });

  it.each([null, undefined, "", "   ", 123, true, {}, ["not a name"]])(
    "does not fabricate a sub-organization for empty or invalid metadata: %j",
    async (subOrganizationName) => {
      mock.chain.range.mockResolvedValue({ data: [registerRow("legacy")], error: null, count: 1 });
      mock.details.in.mockResolvedValue({
        data: [{ id: "legacy", subOrganizationName, subActivityName: null, expenseItems: null }],
        error: null,
      });
      const result = await getBudgetRequests();
      expect(result.error).toBeNull();
      expect(result.data.items[0]).toMatchObject({
        subOrganizationName: "",
        unit: "สำนักงานเลขานุการ",
      });
    },
  );

  it("keeps a missing metadata row's sub-organization empty instead of falling back to the owning unit", async () => {
    mock.chain.range.mockResolvedValue({ data: [registerRow("missing")], error: null, count: 1 });
    const result = await getBudgetRequests();
    expect(result.error).toBeNull();
    expect(result.data.items[0]).toMatchObject({
      subOrganizationName: "",
      unit: "สำนักงานเลขานุการ",
    });
  });

  it("returns no names for an existing record with no sub-activity metadata", async () => {
    mock.chain.range.mockResolvedValue({ data: [registerRow("legacy")], error: null, count: 1 });
    mock.details.in.mockResolvedValue({
      data: [{ id: "legacy", subActivityName: null, expenseItems: null }],
      error: null,
    });
    expect((await getBudgetRequests()).data.items[0].subActivityNames).toEqual([]);
  });

  it("does not fetch metadata when the primary register query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mock.chain.range.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "not authorized" },
      count: null,
    });
    const result = await getBudgetRequests();
    expect(result.error).toBeTruthy();
    expect(result.data.items).toEqual([]);
    expect(mock.client.from).toHaveBeenCalledTimes(1);
    expect(mock.details.in).not.toHaveBeenCalled();
  });

  it("reports metadata failures explicitly rather than pretending sub-activity data is absent", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mock.chain.range.mockResolvedValue({ data: [registerRow("first")], error: null, count: 1 });
    mock.details.in.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "sensitive database detail" },
    });
    const result = await getBudgetRequests();
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain("sensitive database detail");
    expect(result.data.items).toEqual([]);
    expect(log).toHaveBeenCalledWith(
      "[application-error]",
      expect.stringContaining('"operation":"budget_requests.list_sub_activities"'),
    );
  });
});
