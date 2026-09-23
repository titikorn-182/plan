import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadApprovedBudgetProjectSourceAction,
  saveProjectAction,
} from "@/features/projects/actions";
import { createEmptyBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import { createEmptyProjectProposalDetails } from "@/features/projects/proposal-details";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";

type QueryResult = {
  data: Record<string, unknown> | null;
  error: { code?: string; message: string } | null;
};
const mock = vi.hoisted(() => {
  const state = { userId: "10000000-0000-4000-8000-000000000004" as string | null };
  const responses: QueryResult[] = [];
  const terminal = vi.fn(async () => {
    const response = responses.shift();
    if (!response) throw new Error("Unexpected database query");
    return response;
  });
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    single: terminal,
    maybeSingle: terminal,
  };
  const client = {
    from: vi.fn(() => query),
    auth: {
      getClaims: vi.fn(async () => ({
        data: state.userId ? { claims: { sub: state.userId } } : null,
        error: null,
      })),
    },
    rpc: vi.fn<() => Promise<QueryResult>>(),
  };
  return { state, responses, query, client, revalidate: vi.fn() };
});
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.client }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
vi.mock("@/features/shared/master-data-queries", async () => {
  const { TEST_MASTER_DATA } = await import("@/tests/fixtures/master-data");
  return {
    getFiscalYearMasterDataCatalogs: async (ids: readonly string[]) => ({
      data: ids.map((fiscalYearId) => ({ ...TEST_MASTER_DATA, fiscalYearId })),
      error: null,
    }),
  };
});

const budgetId = "60000000-0000-4000-8000-000000000001";
const projectId = "50000000-0000-4000-8000-000000000001";
const organizationId = "20000000-0000-4000-8000-000000000001";
const fiscalYearId = "30000000-0000-4000-8000-000000000001";
const source = {
  id: budgetId,
  code: "BR-TEST",
  organization_id: organizationId,
  fiscal_year_id: fiscalYearId,
  title_th: "โครงการทดสอบ",
  owner_name: "Test staff",
  rationale: "หลักการและเหตุผลจากคำของบ",
  project_type: "โครงการประจำ",
  requested_amount: 1000,
  proposal_details: {
    ...createEmptyBudgetProposalDetails(),
    subActivityName: "กิจกรรมย่อยทดสอบ",
  },
};
const input = {
  id: "",
  version: "1",
  intent: "save",
  organizationId,
  fiscalYearId,
  budgetRequestId: budgetId,
  title: "กิจกรรมย่อยทดสอบ",
  ownerName: "Test staff",
  coordinatorName: "Test coordinator",
  disbursementTarget: "25",
  startsOn: "2026-10-01",
  endsOn: "2027-09-30",
  proposalDetails: JSON.stringify(createEmptyProjectProposalDetails()),
};
function form(changes: Partial<typeof input> = {}) {
  const data = new FormData();
  Object.entries({ ...input, ...changes }).forEach(([key, value]) => data.set(key, value));
  return data;
}
function response(data: QueryResult["data"], error: QueryResult["error"] = null) {
  mock.responses.push({ data, error });
}
function successfulSave() {
  response({ buddhist_year: 2570 });
  mock.client.rpc.mockResolvedValue({
    data: { id: projectId, code: "TEST-P", version: 2 },
    error: null,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.responses.length = 0;
  mock.state.userId = "10000000-0000-4000-8000-000000000004";
  mock.client.rpc.mockResolvedValue({ data: null, error: null });
});

describe("loading an approved budget into a project", () => {
  it("rejects malformed IDs before querying", async () => {
    expect((await loadApprovedBudgetProjectSourceAction("not-a-uuid")).success).toBe(false);
    expect(mock.client.from).not.toHaveBeenCalled();
  });

  it("requires a fresh authenticated session", async () => {
    mock.state.userId = null;
    expect(await loadApprovedBudgetProjectSourceAction(budgetId)).toMatchObject({
      success: false,
      error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
    });
    expect(mock.client.from).not.toHaveBeenCalled();
  });

  it("loads only approved nonarchived non-demo sources using the session client", async () => {
    response(source);
    expect(await loadApprovedBudgetProjectSourceAction(budgetId)).toMatchObject({
      success: true,
      data: { budgetRequestId: budgetId, title: "กิจกรรมย่อยทดสอบ", organizationId, fiscalYearId },
    });
    expect(mock.query.eq).toHaveBeenCalledWith("id", budgetId);
    expect(mock.query.eq).toHaveBeenCalledWith("status", "approved");
    expect(mock.query.is).toHaveBeenCalledWith("archived_at", null);
    expect(mock.query.not).toHaveBeenCalledWith("id", "in", RETIRED_DEMO_FILTERS.budgetRequests);
    expect(mock.client.rpc).not.toHaveBeenCalled();
    expect(mock.revalidate).not.toHaveBeenCalled();
  });

  it("fails closed for missing, inaccessible or no-longer-approved sources", async () => {
    response(null);
    expect(await loadApprovedBudgetProjectSourceAction(budgetId)).toMatchObject({ success: false });
  });

  it("does not return a partial form when stored source details are invalid", async () => {
    response({ ...source, proposal_details: "invalid-json" });
    expect(await loadApprovedBudgetProjectSourceAction(budgetId)).toMatchObject({ success: false });
  });

  it("returns a safe error for database access failures", async () => {
    response(null, { code: "42501", message: "private database details" });
    expect(await loadApprovedBudgetProjectSourceAction(budgetId)).toEqual({
      success: false,
      error: "คุณไม่มีสิทธิ์ดำเนินการกับข้อมูลนี้",
    });
  });
});

describe("saving a project with an approved budget reference", () => {
  it("rejects a source that is no longer accessible or approved", async () => {
    response(null);
    expect(await saveProjectAction({}, form())).toMatchObject({
      success: false,
      errors: { budgetRequestId: expect.any(Array) },
    });
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["organization_id", "organizationId"],
    ["fiscal_year_id", "fiscalYearId"],
  ])("rejects mismatched %s without saving", async (databaseField, formField) => {
    response({ ...source, [databaseField]: "different-source" });
    const result = await saveProjectAction({}, form());
    expect(result.success).toBe(false);
    expect(result.errors?.[formField]).toBeDefined();
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });

  it("saves an accessible approved source matching the organization and fiscal year", async () => {
    response(source);
    successfulSave();
    expect((await saveProjectAction({}, form())).success).toBe(true);
    expect(mock.client.rpc).toHaveBeenCalledWith(
      "save_project_transaction",
      expect.objectContaining({
        p_budget_request_id: budgetId,
        p_organization_id: organizationId,
        p_fiscal_year_id: fiscalYearId,
      }),
    );
  });

  it("preserves the unlinked legacy flow", async () => {
    successfulSave();
    expect((await saveProjectAction({}, form({ budgetRequestId: "" }))).success).toBe(true);
    expect(mock.client.from).not.toHaveBeenCalledWith("budget_requests");
  });

  it("allows unrelated edits with an unchanged historical budget reference", async () => {
    response({
      budget_request_id: budgetId,
      organization_id: organizationId,
      fiscal_year_id: fiscalYearId,
    });
    successfulSave();
    expect((await saveProjectAction({}, form({ id: projectId }))).success).toBe(true);
    expect(mock.client.from).toHaveBeenCalledWith("projects");
    expect(mock.client.from).not.toHaveBeenCalledWith("budget_requests");
  });

  it("revalidates a changed source on an existing project", async () => {
    response({
      budget_request_id: null,
      organization_id: organizationId,
      fiscal_year_id: fiscalYearId,
    });
    response(null);
    expect((await saveProjectAction({}, form({ id: projectId }))).success).toBe(false);
    expect(mock.client.from).toHaveBeenCalledWith("budget_requests");
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });
});
