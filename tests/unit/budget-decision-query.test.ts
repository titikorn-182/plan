import { beforeEach, expect, it, vi } from "vitest";
import { getBudgetDecisionTask } from "@/features/approvals/budget-decision-query";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/auth/viewer", () => ({ getViewer: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
const client = { from: vi.fn(), select: vi.fn(), eq: vi.fn(), limit: vi.fn() };
const task = { id: "task", required_role: "executive", assignee_id: "executive" };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue(client as never);
  vi.mocked(getViewer).mockResolvedValue({ id: "executive", roles: ["executive"] } as never);
  client.from.mockReturnValue(client);
  client.select.mockReturnValue(client);
  client.eq.mockReturnValue(client);
  client.limit.mockResolvedValue({ data: [task], error: null });
});
it("loads only pending tasks for the already-authorized budget and organization", async () => {
  expect((await getBudgetDecisionTask("budget", "org")).data).toEqual({
    id: "task",
    requiredRole: "executive",
    canAct: true,
  });
  expect(client.eq.mock.calls).toEqual([
    ["entity_type", "budget_request"],
    ["entity_id", "budget"],
    ["organization_id", "org"],
    ["status", "pending"],
  ]);
  expect(client.limit).toHaveBeenCalledWith(2);
});
it.each([
  ["staff", ["staff"], false],
  ["other", ["executive"], false],
  ["reviewer", ["user"], false],
  ["admin", ["admin"], true],
  ["executive", [], false],
])("controls the form for %s", async (id, roles, canAct) => {
  vi.mocked(getViewer).mockResolvedValue({ id, roles } as never);
  expect((await getBudgetDecisionTask("budget", "org")).data?.canAct).toBe(canAct);
});
it("handles an unassigned task, absent task and ambiguous tasks", async () => {
  client.limit.mockResolvedValue({ data: [{ ...task, assignee_id: null }], error: null });
  expect((await getBudgetDecisionTask("b", "o")).data?.canAct).toBe(true);
  client.limit.mockResolvedValue({ data: [], error: null });
  expect((await getBudgetDecisionTask("b", "o")).data).toBeNull();
  client.limit.mockResolvedValue({ data: [task, task], error: null });
  expect((await getBudgetDecisionTask("b", "o")).error).toBeTruthy();
});
