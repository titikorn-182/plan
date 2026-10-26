import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ createClient: vi.fn(), query: vi.fn(), pdf: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/features/projects/project-proposal-pdf-query", () => ({
  getProjectProposalPdfData: mocks.query,
}));
vi.mock("@/features/projects/project-proposal-pdf", () => ({
  createProjectProposalPdf: mocks.pdf,
}));
let GET: typeof import("@/app/api/projects/[id]/proposal/route").GET;
let HEAD: typeof import("@/app/api/projects/[id]/proposal/route").HEAD;

const client = { auth: { getClaims: vi.fn() } };
const request = () => new Request("https://example.test/api/projects/id/proposal");
const context = () => ({ params: Promise.resolve({ id: "project-id" }) });
beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  ({ GET, HEAD } = await import("@/app/api/projects/[id]/proposal/route"));
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
  it("rechecks auth and RLS on repeated downloads while reusing identical rendering", async () => {
    const first = await GET(request(), context());
    const second = await GET(request(), context());
    expect(await first.arrayBuffer()).toEqual(await second.arrayBuffer());
    expect(client.auth.getClaims).toHaveBeenCalledTimes(2);
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.pdf).toHaveBeenCalledTimes(1);
  });
  it("cannot serve a cached PDF after access is revoked or the project is archived", async () => {
    await GET(request(), context());
    mocks.query.mockResolvedValue({ data: null, error: null });
    expect((await GET(request(), context())).status).toBe(404);
    expect(mocks.query).toHaveBeenCalledTimes(2);
    expect(mocks.pdf).toHaveBeenCalledTimes(1);
    client.auth.getClaims.mockResolvedValue({ data: null });
    expect((await GET(request(), context())).status).toBe(401);
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });
  it("regenerates when current authorized data or the viewer changes", async () => {
    await GET(request(), context());
    mocks.query.mockResolvedValue({ data: { code: "PR-TEST", approvedBudget: 2500 }, error: null });
    await GET(request(), context());
    client.auth.getClaims.mockResolvedValue({ data: { claims: { sub: "another-viewer" } } });
    await GET(request(), context());
    expect(mocks.pdf).toHaveBeenCalledTimes(3);
  });
  it("HEAD checks access and attachment metadata without rendering the document", async () => {
    const response = await HEAD(request(), context());
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.query).toHaveBeenCalledExactlyOnceWith(client, "project-id");
    expect(mocks.pdf).not.toHaveBeenCalled();
    mocks.query.mockResolvedValue({ data: null, error: null });
    expect((await HEAD(request(), context())).status).toBe(404);
    client.auth.getClaims.mockResolvedValue({ data: null });
    expect((await HEAD(request(), context())).status).toBe(401);
    expect(mocks.pdf).not.toHaveBeenCalled();
  });
});
