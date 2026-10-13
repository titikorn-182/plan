import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), query: vi.fn(), pdf: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/features/projects/project-proposal-pdf-query", () => ({
  getProjectProposalPdfData: mocks.query,
}));
vi.mock("@/features/projects/project-proposal-pdf", () => ({
  createProjectProposalPdf: mocks.pdf,
}));
import { GET } from "@/app/api/projects/[id]/proposal/route";

const client = { auth: { getClaims: vi.fn() } };
const request = () => new Request("https://example.test/api/projects/id/proposal");
const context = () => ({ params: Promise.resolve({ id: "project-id" }) });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue(client);
  client.auth.getClaims.mockResolvedValue({ data: { claims: { sub: "viewer" } } });
  mocks.query.mockResolvedValue({ data: { code: "PR-TEST" }, error: null });
  mocks.pdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
});

describe("project proposal download", () => {
  it("uses the authenticated client and returns a private attachment", async () => {
    const response = await GET(request(), context());
    expect(response.status).toBe(200);
    expect(mocks.query).toHaveBeenCalledExactlyOnceWith(client, "project-id");
    expect(mocks.pdf).toHaveBeenCalledExactlyOnceWith({ code: "PR-TEST" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("project-proposal-PR-TEST.pdf");
  });
  it("rejects signed-out users before any data lookup or generation", async () => {
    client.auth.getClaims.mockResolvedValue({ data: null });
    expect((await GET(request(), context())).status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
  it.each([
    { data: null, error: null },
    { data: null, error: "unavailable" },
  ])("does not generate a document for inaccessible or invalid data", async (reply) => {
    mocks.query.mockResolvedValue(reply);
    expect((await GET(request(), context())).status).toBe(404);
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
});
