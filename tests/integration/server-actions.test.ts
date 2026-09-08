import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveProjectAction } from "@/features/projects/actions";
import { saveBudgetRequestAction } from "@/features/budget-requests/actions";
import { actOnApprovalAction } from "@/features/approvals/actions";
import { saveDisbursementAction } from "@/features/disbursements/actions";

// Only the network/cache boundary is mocked; validation, authentication checks,
// action orchestration, and error translation execute the production code.
type QueryResponse = {
  data: Record<string, unknown> | null;
  error: { code?: string; message: string } | null;
};
const mock = vi.hoisted(() => {
  const responses: QueryResponse[] = [];
  const state = { userId: "10000000-0000-4000-8000-000000000004" as string | null };
  const terminal = vi.fn(async () => {
    const result = responses.shift();
    if (!result) throw new Error("Unexpected database call: add an explicit test response");
    return result;
  });
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: terminal,
    maybeSingle: terminal,
  };
  const client = {
    from: vi.fn(() => chain),
    rpc: vi.fn(async (): Promise<QueryResponse> => ({ data: null, error: null })),
    auth: {
      getClaims: vi.fn(async () => ({
        data: state.userId ? { claims: { sub: state.userId } } : null,
        error: null,
      })),
    },
  };
  return { responses, state, chain, client, revalidate: vi.fn() };
});
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.client }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));

const projectId = "50000000-0000-4000-8000-000000000001";
const yearId = "30000000-0000-4000-8000-000000000001";
const projectInput = {
  id: projectId,
  version: "3",
  intent: "save",
  organizationId: "20000000-0000-4000-8000-000000000001",
  fiscalYearId: yearId,
  budgetRequestId: "",
  title: "โครงการทดสอบ",
  projectType: "พัฒนาระบบ",
  ownerName: "Test staff",
  coordinatorName: "Test staff",
  approvedBudget: "1000",
  disbursementTarget: "25",
  startsOn: "2026-10-01",
  endsOn: "2027-09-30",
};
function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}
function response(data: QueryResponse["data"], error: QueryResponse["error"] = null) {
  mock.responses.push({ data, error });
}
function savedProject() {
  response({ buddhist_year: 2570 });
  response({ id: projectId, code: "TEST-P1", version: 4 });
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.responses.length = 0;
  mock.state.userId = "10000000-0000-4000-8000-000000000004";
  mock.client.rpc.mockResolvedValue({ data: null, error: null });
});

describe("project action orchestration", () => {
  it.each([
    { title: "x" },
    { endsOn: "2026-09-30" },
    { endsOn: "2027-02-30" },
    { approvedBudget: "-1" },
    { intent: "submit", approvedBudget: "0" },
  ])("rejects invalid input before connecting: %j", async (invalid) => {
    expect((await saveProjectAction({}, form({ ...projectInput, ...invalid }))).success).toBe(
      false,
    );
    expect(mock.client.auth.getClaims).not.toHaveBeenCalled();
    expect(mock.client.from).not.toHaveBeenCalled();
  });
  it("rejects expired sessions without querying or mutating", async () => {
    mock.state.userId = null;
    expect((await saveProjectAction({}, form(projectInput))).message).toContain("เซสชันหมดอายุ");
    expect(mock.client.from).not.toHaveBeenCalled();
  });
  it("saves with the record ID, proposed status, and optimistic version filter", async () => {
    savedProject();
    expect(await saveProjectAction({}, form(projectInput))).toMatchObject({
      success: true,
      id: projectId,
      version: 4,
    });
    expect(mock.chain.eq).toHaveBeenCalledWith("id", projectId);
    expect(mock.chain.eq).toHaveBeenCalledWith("version", 3);
    expect(mock.chain.eq).toHaveBeenCalledWith("status", "proposed");
    expect(mock.client.rpc).not.toHaveBeenCalled();
    expect(mock.revalidate).toHaveBeenCalledWith("/projects");
  });
  it("does not submit when another editor already changed the version", async () => {
    response({ buddhist_year: 2570 });
    response(null);
    const result = await saveProjectAction({}, form({ ...projectInput, intent: "submit" }));
    expect(result.success).toBe(false);
    expect(result.message).toContain("ผู้ใช้อื่น");
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });
  it("submits the saved entity and refreshes its workflow views", async () => {
    savedProject();
    expect((await saveProjectAction({}, form({ ...projectInput, intent: "submit" }))).success).toBe(
      true,
    );
    expect(mock.client.rpc).toHaveBeenCalledWith(
      "submit_entity_for_approval",
      expect.objectContaining({ p_entity_type: "project", p_entity_id: projectId }),
    );
    expect(mock.revalidate).toHaveBeenCalledWith("/approvals");
    expect(mock.revalidate).toHaveBeenCalledWith("/notifications");
  });
  it("retains saved ID/version when workflow submission fails", async () => {
    savedProject();
    mock.client.rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "internal policy details" },
    });
    const result = await saveProjectAction({}, form({ ...projectInput, intent: "submit" }));
    expect(result).toMatchObject({ success: false, id: projectId, version: 4 });
    expect(result.message).toContain("แต่ส่งอนุมัติไม่สำเร็จ");
    expect(result.message).not.toContain("internal policy details");
  });
  it("does not expose unexpected database errors to the user", async () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    response(null, { code: "XX000", message: "sensitive internal database error" });
    const result = await saveProjectAction({}, form(projectInput));
    expect(result.success).toBe(false);
    expect(result.message).not.toContain("sensitive internal");
    expect(logger).toHaveBeenCalled();
  });
});

describe("budget, approval, and spending actions", () => {
  it("uses the atomic budget submission RPC", async () => {
    response({ buddhist_year: 2570 });
    response({ fiscal_year_id: yearId });
    response({ id: projectId, code: "TEST-P1", version: 4 });
    const result = await saveBudgetRequestAction(
      {},
      form({
        ...projectInput,
        intent: "submit",
        budgetCycleId: "40000000-0000-4000-8000-000000000001",
        rationale: "เหตุผลทดสอบการบันทึกและส่งอนุมัติงบประมาณ",
        amount: "1000",
      }),
    );
    expect(result.success).toBe(true);
    expect(mock.client.rpc).toHaveBeenCalledWith(
      "submit_budget_request_for_approval",
      expect.objectContaining({ p_entity_id: projectId }),
    );
  });
  it("rejects a budget cycle from a different fiscal year", async () => {
    response({ buddhist_year: 2570 });
    response({ fiscal_year_id: "30000000-0000-4000-8000-000000000002" });
    const result = await saveBudgetRequestAction(
      {},
      form({
        ...projectInput,
        intent: "save",
        budgetCycleId: "40000000-0000-4000-8000-000000000001",
        rationale: "เหตุผลทดสอบ",
        amount: "1000",
      }),
    );
    expect(result).toMatchObject({
      success: false,
      message: "ปีงบประมาณที่เลือกไม่ถูกต้อง",
    });
    expect(mock.chain.insert).not.toHaveBeenCalled();
    expect(mock.chain.update).not.toHaveBeenCalled();
  });
  it("requires a reason when returning a task before calling its RPC", async () => {
    expect(
      (
        await actOnApprovalAction(
          {},
          form({ taskId: projectId, decision: "revision_required", comment: "" }),
        )
      ).success,
    ).toBe(false);
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });
  it("refuses to approve a task that is not visible to the caller", async () => {
    response(null);
    expect(
      (
        await actOnApprovalAction(
          {},
          form({ taskId: projectId, decision: "approved", comment: "" }),
        )
      ).success,
    ).toBe(false);
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });
  it("refreshes only the affected module after approval", async () => {
    response({ entity_type: "kpi_result" });
    expect(
      (
        await actOnApprovalAction(
          {},
          form({ taskId: projectId, decision: "approved", comment: "" }),
        )
      ).success,
    ).toBe(true);
    expect(mock.revalidate).toHaveBeenCalledWith("/kpi");
    expect(mock.revalidate).not.toHaveBeenCalledWith("/projects");
  });
  it.each(["301", "300"])("checks the remaining budget before spending %s", async (amount) => {
    response({
      organization_id: projectInput.organizationId,
      fiscal_year_id: yearId,
      approved_budget: 1000,
      disbursed_amount: 700,
    });
    if (amount === "300") response({ id: projectId, version: 1 });
    const result = await saveDisbursementAction(
      {},
      form({
        projectId,
        fiscalYearId: yearId,
        quarter: "1",
        amount,
        disbursedOn: "2026-10-05",
        referenceNo: "TEST",
        status: "recorded",
      }),
    );
    expect(result.success).toBe(amount === "300");
    expect(mock.chain.insert).toHaveBeenCalledTimes(amount === "300" ? 1 : 0);
  });
});
