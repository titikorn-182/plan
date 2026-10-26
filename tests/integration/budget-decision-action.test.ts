import { beforeEach, describe, expect, it, vi } from "vitest";
import { actOnApprovalAction } from "@/features/approvals/actions";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const taskId = "10000000-0000-4000-8000-000000000001";
const budgetId = "20000000-0000-4000-8000-000000000001";
const client = {
  auth: { getClaims: vi.fn() },
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(client as never);
  client.auth.getClaims.mockResolvedValue({ data: { claims: { sub: taskId } } });
  client.from.mockReturnValue(client);
  client.select.mockReturnValue(client);
  client.eq.mockReturnValue(client);
  client.maybeSingle.mockResolvedValue({
    data: { entity_type: "budget_request", entity_id: budgetId },
    error: null,
  });
  client.rpc.mockResolvedValue({ data: true, error: null });
});
function form(changes: Record<string, string | undefined> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    taskId,
    decision: "approved",
    comment: "ปรับวงเงินตามมติ",
    expectedBudgetVersion: "3",
    approvedAmount: "750.25",
    ...changes,
  })) {
    if (value !== undefined) data.set(key, value);
  }
  return data;
}
describe("budget decision action", () => {
  it("sends the reviewed version and amount in one RPC then refreshes details", async () => {
    expect((await actOnApprovalAction({}, form())).success).toBe(true);
    expect(client.rpc).toHaveBeenCalledExactlyOnceWith("act_on_approval_task", {
      p_task_id: taskId,
      p_decision: "approved",
      p_comment: "ปรับวงเงินตามมติ",
      p_expected_budget_version: 3,
      p_approved_amount: 750.25,
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/budget-requests/${budgetId}`);
  });
  it.each(["", "-1", "1.001", "NaN", "1000000000000"])(
    "rejects invalid amount %s before querying",
    async (approvedAmount) => {
      expect(
        (await actOnApprovalAction({}, form({ approvedAmount }))).errors?.approvedAmount,
      ).toBeDefined();
      expect(client.rpc).not.toHaveBeenCalled();
    },
  );
  it.each(["revision_required", "rejected"])(
    "%s ignores an unfinished amount edit",
    async (decision) => {
      expect(
        (await actOnApprovalAction({}, form({ decision, approvedAmount: "bad" }))).success,
      ).toBe(true);
      expect(client.rpc.mock.calls[0][1].p_approved_amount).toBeUndefined();
    },
  );
  it("requires a version for a budget task", async () => {
    expect(
      (await actOnApprovalAction({}, form({ expectedBudgetVersion: undefined }))).success,
    ).toBe(false);
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it("reports a stale version and does not refresh away entered values", async () => {
    client.rpc.mockResolvedValue({ error: { code: "PT409", message: "stale" } });
    expect((await actOnApprovalAction({}, form())).message).toContain("เปิดรายการใหม่");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("shows the reason error beside the comment field", async () => {
    client.rpc.mockResolvedValue({
      error: { code: "23514", message: "budget amount adjustment requires a reason" },
    });
    expect((await actOnApprovalAction({}, form())).errors?.comment).toBeDefined();
  });
  it("refuses a missing task or expired session", async () => {
    client.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await actOnApprovalAction({}, form())).success).toBe(false);
    client.auth.getClaims.mockResolvedValue({ data: null });
    expect((await actOnApprovalAction({}, form())).message).toContain("เซสชันหมดอายุ");
    expect(client.rpc).not.toHaveBeenCalled();
  });
  it("preserves non-budget decisions without budget arguments", async () => {
    client.maybeSingle.mockResolvedValue({
      data: { entity_type: "project", entity_id: budgetId },
      error: null,
    });
    expect(
      (
        await actOnApprovalAction(
          {},
          form({ expectedBudgetVersion: undefined, approvedAmount: undefined }),
        )
      ).success,
    ).toBe(true);
    expect(client.rpc.mock.calls[0][1].p_expected_budget_version).toBeUndefined();
  });
});
