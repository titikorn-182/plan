import { beforeEach, describe, expect, it, vi } from "vitest";
import { archiveProjectAction } from "@/features/projects/archive-action";

const mock = vi.hoisted(() => {
  const project = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  };
  const links = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), limit: vi.fn() };
  return {
    project,
    links,
    from: vi.fn((table: string) => (table === "projects" ? project : links)),
    authenticated: vi.fn(),
    viewer: vi.fn(),
    revalidate: vi.fn(),
  };
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
  mock.links.limit.mockResolvedValue({ data: [], error: null });
  mock.project.maybeSingle.mockResolvedValue({
    data: { id: input.id, code: "PR-TEST" },
    error: null,
  });
});
describe("project recoverable deletion", () => {
  it("archives with version/status/spending guards and refreshes register/trash", async () => {
    expect(await archiveProjectAction(input)).toMatchObject({ success: true, id: input.id });
    expect(mock.project.update).toHaveBeenCalledExactlyOnceWith({
      archived_at: expect.any(String),
    });
    expect(mock.project.eq.mock.calls).toEqual([
      ["id", input.id],
      ["version", 3],
      ["status", "proposed"],
      ["disbursed_amount", 0],
    ]);
    expect(mock.project.is).toHaveBeenCalledWith("archived_at", null);
    expect(mock.revalidate).toHaveBeenCalled();
  });
  it.each(["staff", "user", "executive"])("rejects a direct %s call", async (role) => {
    mock.viewer.mockResolvedValue({ id: "admin-id", roles: [role] });
    expect((await archiveProjectAction(input)).success).toBe(false);
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("rejects an expired session", async () => {
    mock.authenticated.mockResolvedValue({ userId: null });
    expect((await archiveProjectAction(input)).success).toBe(false);
    expect(mock.viewer).not.toHaveBeenCalled();
  });
  it.each([
    { ...input, id: "bad" },
    { ...input, version: 0 },
    { ...input, version: 1.5 },
  ])("rejects invalid input", async (value) => {
    expect((await archiveProjectAction(value)).success).toBe(false);
    expect(mock.authenticated).not.toHaveBeenCalled();
  });
  it.each([0, 1, 2, 3])("blocks related record check %i", async (index) => {
    for (let i = 0; i < 4; i++)
      mock.links.limit.mockResolvedValueOnce({
        data: i === index ? [{ id: "linked" }] : [],
        error: null,
      });
    expect((await archiveProjectAction(input)).message).toContain("อ้างอิง");
    expect(mock.project.update).not.toHaveBeenCalled();
  });
  it("fails closed on a failed reference check", async () => {
    mock.links.limit.mockResolvedValueOnce({ data: null, error: { message: "unavailable" } });
    expect((await archiveProjectAction(input)).success).toBe(false);
    expect(mock.project.update).not.toHaveBeenCalled();
  });
  it("rejects a stale or ineligible record", async () => {
    mock.project.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await archiveProjectAction(input)).success).toBe(false);
    expect(mock.revalidate).not.toHaveBeenCalled();
  });
  it("does not report database errors as success", async () => {
    mock.project.maybeSingle.mockResolvedValue({ data: null, error: { message: "denied" } });
    expect((await archiveProjectAction(input)).success).toBe(false);
    expect(mock.revalidate).not.toHaveBeenCalled();
  });
});
