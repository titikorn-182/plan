import { beforeEach, describe, expect, it, vi } from "vitest";
import { archiveBudgetRequestAction } from "@/features/budget-requests/archive-action";
import { isBudgetRequestArchivable } from "@/features/budget-requests/register-actions";

const mock = vi.hoisted(() => {
  const budget = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };
  const projects = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn(),
  };
  const from = vi.fn((table: string) => (table === "projects" ? projects : budget));
  return { budget, projects, from, authenticated: vi.fn(), viewer: vi.fn(), revalidate: vi.fn() };
});
vi.mock("@/lib/auth/viewer", () => ({ getViewer: mock.viewer }));
vi.mock("@/features/shared/server-actions", () => ({
  authenticated: mock.authenticated,
  friendlyError: () => "บันทึกไม่สำเร็จ",
  revalidateOperationPaths: mock.revalidate,
  SESSION_EXPIRED_MESSAGE: "เซสชันหมดอายุ",
}));

const input = { id: "00000000-0000-4000-8000-000000000001", version: 3 };

beforeEach(() => {
  vi.clearAllMocks();
  mock.authenticated.mockResolvedValue({ userId: "admin-id", supabase: { from: mock.from } });
  mock.viewer.mockResolvedValue({ id: "admin-id", roles: ["admin"] });
  mock.projects.limit.mockResolvedValue({ data: [], error: null });
  mock.budget.maybeSingle.mockResolvedValue({
    data: { id: input.id, code: "BR-TEST" },
    error: null,
  });
});

describe("budget request archive action", () => {
  it("soft-deletes with id/version/status/lock guards and refreshes the register and trash", async () => {
    const result = await archiveBudgetRequestAction(input);
    expect(result).toMatchObject({ success: true, id: input.id });
    expect(mock.budget.update).toHaveBeenCalledExactlyOnceWith({ archived_at: expect.any(String) });
    expect(mock.budget.eq.mock.calls).toEqual([
      ["id", input.id],
      ["version", 3],
    ]);
    expect(mock.budget.in).toHaveBeenCalledWith("status", ["draft", "cancelled"]);
    expect(mock.budget.is.mock.calls).toEqual([
      ["locked_at", null],
      ["archived_at", null],
    ]);
    expect(mock.projects.eq).toHaveBeenCalledWith("budget_request_id", input.id);
    expect(mock.revalidate).toHaveBeenCalledWith(
      "/",
      "/budget-requests",
      `/budget-requests/${input.id}`,
      `/budget-requests/${input.id}/edit`,
      "/admin",
    );
  });
  it.each(["staff", "user", "executive"])("rejects direct calls from %s", async (role) => {
    mock.viewer.mockResolvedValue({ id: "admin-id", roles: [role] });
    expect((await archiveBudgetRequestAction(input)).success).toBe(false);
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("rejects an expired session before reading roles", async () => {
    mock.authenticated.mockResolvedValue({ userId: null });
    expect((await archiveBudgetRequestAction(input)).success).toBe(false);
    expect(mock.viewer).not.toHaveBeenCalled();
    expect(mock.from).not.toHaveBeenCalled();
  });
  it.each([
    { ...input, id: "bad-id" },
    { ...input, version: 0 },
    { ...input, version: 1.5 },
  ])("rejects malformed input %j", async (value) => {
    expect((await archiveBudgetRequestAction(value)).success).toBe(false);
    expect(mock.authenticated).not.toHaveBeenCalled();
  });
  it("does not archive a budget referenced by a project", async () => {
    mock.projects.limit.mockResolvedValue({ data: [{ id: "project-id" }], error: null });
    expect((await archiveBudgetRequestAction(input)).message).toContain("โครงการอ้างอิง");
    expect(mock.budget.update).not.toHaveBeenCalled();
  });
  it("fails closed when the linked-project check fails", async () => {
    mock.projects.limit.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    expect((await archiveBudgetRequestAction(input)).success).toBe(false);
    expect(mock.budget.update).not.toHaveBeenCalled();
  });
  it("does not report success when a stale, locked, archived or ineligible row is excluded", async () => {
    mock.budget.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await archiveBudgetRequestAction(input)).message).toContain("เปลี่ยนสถานะแล้ว");
    expect(mock.revalidate).not.toHaveBeenCalled();
  });
  it("does not report success on database failure", async () => {
    mock.budget.maybeSingle.mockResolvedValue({ data: null, error: { message: "denied" } });
    expect((await archiveBudgetRequestAction(input)).success).toBe(false);
    expect(mock.revalidate).not.toHaveBeenCalled();
  });
  it.each([
    "submitted",
    "under_review",
    "pending_approval",
    "approved",
    "revision_required",
    "rejected",
    "withdrawn",
    "unknown",
  ])("does not offer deletion for %s", (status) => {
    expect(isBudgetRequestArchivable(status)).toBe(false);
  });
  it.each(["draft", "cancelled"])("allows the existing admin deletion states: %s", (status) => {
    expect(isBudgetRequestArchivable(status)).toBe(true);
  });
});
