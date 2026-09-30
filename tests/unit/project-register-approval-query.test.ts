import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjects } from "@/features/projects/queries";
import type { Tables } from "@/types/database.generated";

const mock = vi.hoisted(() => {
  const register = {
    select: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(),
  };
  const metadata = { select: vi.fn().mockReturnThis(), in: vi.fn() };
  const rpc = vi.fn();
  return {
    register,
    metadata,
    rpc,
    client: { from: vi.fn((table: string) => (table === "projects" ? metadata : register)), rpc },
  };
});
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.client }));
vi.mock("@/lib/auth/viewer", () => ({
  getViewer: async () => ({ id: "owner", roles: ["staff"] }),
}));
vi.mock("@/features/shared/queries", () => ({
  getReportingPeriod: async () => ({ fiscalYearId: "year" }),
}));

function row(id: string, pending: boolean): Tables<"project_register"> {
  return {
    id,
    code: `PR-${id}`,
    title: "โครงการทดสอบ",
    unit: "หน่วยงาน",
    owner: "ชื่อหัวหน้า",
    status: pending ? "proposed" : "active",
    health: "normal",
    has_pending_approval: pending,
    budget: 1000,
    spent: 0,
    progress: 0,
    due: "2027-09-30",
    organization_id: "org",
    fiscal_year_id: "year",
    buddhist_year: 2570,
    updated_at: "2026-09-30",
    version: 1,
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.register.range.mockResolvedValue({
    data: [row("a", true), row("b", false)],
    count: 42,
    error: null,
  });
  mock.metadata.in.mockResolvedValue({
    data: [
      { id: "a", owner_id: "owner", version: 1 },
      { id: "b", owner_id: "owner", version: 1 },
    ],
    error: null,
  });
  mock.rpc.mockImplementation(async (name: string) => ({
    data:
      name === "get_project_approval_states"
        ? [
            { project_id: "a", approval_state: "unit_review" },
            { project_id: "b", approval_state: "approved" },
          ]
        : [],
    error: null,
  }));
});

describe("project register approval metadata", () => {
  it("loads one bounded summary for this page and preserves pagination and action permissions", async () => {
    const result = await getProjects(2);
    expect(mock.rpc).toHaveBeenCalledWith("get_project_approval_states", {
      p_project_ids: ["a", "b"],
    });
    expect(
      mock.rpc.mock.calls.filter(([name]) => name === "get_project_approval_states"),
    ).toHaveLength(1);
    expect(mock.register.range).toHaveBeenCalledWith(20, 39);
    expect(result.data.pagination.total).toBe(42);
    expect(result.data.items).toMatchObject([
      { approvalState: "unit_review", health: "ปกติ", canRequestRevision: false, editable: false },
      { approvalState: "approved", health: "ปกติ", canRequestRevision: true, editable: false },
    ]);
  });
  it("never infers approval from health when a summary is missing or unrecognized", async () => {
    mock.rpc.mockResolvedValue({
      data: [{ project_id: "a", approval_state: "normal" }],
      error: null,
    });
    expect((await getProjects()).data.items.map((item) => item.approvalState)).toEqual([
      "unknown",
      "unknown",
    ]);
  });
  it("returns an explicit error if summary loading fails", async () => {
    mock.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "missing test RPC" },
    });
    expect((await getProjects()).error).not.toBeNull();
  });
  it("does not fetch summary metadata for an empty page", async () => {
    mock.register.range.mockResolvedValue({ data: [], count: 0, error: null });
    expect((await getProjects()).data.items).toEqual([]);
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.metadata.in).not.toHaveBeenCalled();
  });
});
