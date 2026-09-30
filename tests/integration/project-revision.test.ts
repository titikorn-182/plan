import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectRevisionAction } from "@/features/projects/revision-action";
const mock = vi.hoisted(() => ({ authenticated: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/features/shared/server-actions", () => ({
  authenticated: mock.authenticated,
  revalidateOperationPaths: mock.revalidate,
  friendlyError: () => "บันทึกไม่สำเร็จ",
  SESSION_EXPIRED_MESSAGE: "เซสชันหมดอายุ",
}));
const input = {
  projectId: "50000000-0000-4000-8000-000000000001",
  version: 2,
  reason: "ต้องการแก้ไขรายละเอียด",
  operation: "request" as const,
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.authenticated.mockResolvedValue({ userId: "staff", supabase: { rpc: mock.rpc } });
  mock.rpc.mockResolvedValue({ data: "request-id", error: null });
});
describe("project revision actions", () => {
  it("sends an authenticated request and refreshes the affected routes", async () => {
    expect((await projectRevisionAction(input)).success).toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith("request_project_revision", {
      p_project_id: input.projectId,
      p_version: 2,
      p_reason: input.reason,
    });
    expect(mock.revalidate).toHaveBeenCalledWith(
      "/projects",
      `/projects/${input.projectId}/edit`,
      "/approvals",
      "/notifications",
      "/",
    );
  });
  it.each(["return", "decline"] as const)(
    "uses the protected decision RPC for %s",
    async (operation) => {
      await projectRevisionAction({ ...input, operation, requestId: input.projectId });
      expect(mock.rpc).toHaveBeenCalledWith(
        "decide_project_revision",
        expect.objectContaining({
          p_return: operation === "return",
          p_request_id: input.projectId,
        }),
      );
    },
  );
  it.each([
    { ...input, reason: " " },
    { ...input, projectId: "bad" },
    { ...input, version: 0 },
    { ...input, operation: "return" as const },
  ])("rejects invalid input", async (value) => {
    expect((await projectRevisionAction(value)).success).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("rejects expired sessions", async () => {
    mock.authenticated.mockResolvedValue({ userId: null });
    expect((await projectRevisionAction(input)).success).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it.each(["42501", "PT409", "PT422", "unknown"])("fails closed on %s", async (code) => {
    mock.rpc.mockResolvedValue({ data: null, error: { code } });
    expect((await projectRevisionAction(input)).success).toBe(false);
    expect(mock.revalidate).not.toHaveBeenCalled();
  });
});
