import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  pdf: vi.fn(),
  authenticated: true,
  active: true,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/features/budget-adjustments/pdf", () => ({ createBudgetAdjustmentPdf: mocks.pdf }));
import { POST } from "@/app/api/evidence/budget-adjustment/route";
import { initialAdjustment } from "@/features/budget-adjustments/schema";
function payload() {
  const value = initialAdjustment("2026-10-03");
  Object.assign(value, {
    project: "ทดสอบ",
    head: "ทดสอบ",
    schedule: "พฤศจิกายน 2569",
    reason: "ทดสอบ",
  });
  value.rows = [
    {
      before: { code: "TEST", project: "ทดสอบ", expense: "ค่าวัสดุ", amount: "10" },
      after: { code: "TEST", project: "ทดสอบ", expense: "ค่าวัสดุ", amount: "20" },
    },
  ];
  return value;
}
const request = (body: unknown = payload(), headers = {}) =>
  new Request("https://example.test/api/evidence/budget-adjustment", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  mocks.authenticated = true;
  mocks.active = true;
  mocks.pdf.mockReset().mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
  mocks.createClient.mockResolvedValue({
    auth: {
      getClaims: async () => ({ data: { claims: mocks.authenticated ? { sub: "viewer" } : {} } }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () =>
          table === "profiles"
            ? { maybeSingle: async () => ({ data: { is_active: mocks.active } }) }
            : Promise.resolve({
                data: [{ role: "staff", active_from: "2020-01-01", active_until: null }],
              }),
      }),
    }),
  });
});
describe("budget adjustment PDF endpoint", () => {
  it("returns a private download without any database mutation", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.pdf).toHaveBeenCalledExactlyOnceWith(payload());
  });
  it("rejects signed-out users", async () => {
    mocks.authenticated = false;
    expect((await POST(request())).status).toBe(401);
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it("rejects inactive accounts", async () => {
    mocks.active = false;
    expect((await POST(request())).status).toBe(403);
  });
  it("rejects cross-origin requests", async () => {
    expect((await POST(request(payload(), { Origin: "https://other.test" }))).status).toBe(403);
  });
  it("validates payload on the server", async () => {
    expect((await POST(request({}))).status).toBe(400);
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it("bounds the streamed body even without Content-Length", async () => {
    expect((await POST(request({ reason: "x".repeat(200001) }))).status).toBe(413);
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it("handles broken JSON", async () => {
    expect(
      (
        await POST(
          new Request("https://example.test/api/evidence/budget-adjustment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
  });
});
