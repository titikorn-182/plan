import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectProposalPdfCache } from "@/features/projects/project-proposal-pdf-cache";
import type { ProjectProposalPdfData } from "@/features/projects/project-proposal-pdf-data";
import { createEmptyProjectProposalDetails } from "@/features/projects/proposal-details";
import { createProjectProposalPdf } from "@/features/projects/project-proposal-pdf";
import { PDFDocument } from "pdf-lib";

const data: ProjectProposalPdfData = {
  code: "PR-CACHE-TEST",
  title: "โครงการทดสอบ",
  organizationName: "หน่วยงานทดสอบ",
  fiscalYearLabel: "ปีงบประมาณ 2570",
  budgetRequestLabel: "BR-TEST",
  projectType: "โครงการทดสอบ",
  ownerName: "ผู้ทดสอบ",
  coordinatorName: "ผู้ประสานงาน",
  approvedBudget: 1000,
  disbursementTarget: 100,
  startsOn: "2026-10-01",
  endsOn: "2027-09-30",
  status: "active",
  proposalDetails: createEmptyProjectProposalDetails(),
};
const pdf = new Uint8Array([37, 80, 68, 70]);
afterEach(() => vi.useRealTimers());

describe("bounded private PDF rendering cache", () => {
  it("preserves a real PDF byte-for-byte while avoiding repeated rendering", async () => {
    const sample = {
      ...data,
      proposalDetails: {
        ...data.proposalDetails,
        rationale: "พัฒนาคุณภาพการศึกษาและสนับสนุนการเรียนรู้ของนักศึกษา ".repeat(20),
      },
    };
    let baselineCpuMs = 0;
    if (process.env.MEASURE_PROJECT_PDF_CPU === "1") {
      // Warm imports/JIT before comparing the same three-render workload.
      await createProjectProposalPdf(sample);
      const start = process.cpuUsage();
      for (let i = 0; i < 3; i++) await createProjectProposalPdf(sample);
      const cpu = process.cpuUsage(start);
      baselineCpuMs = (cpu.user + cpu.system) / 1000;
    }
    const render = vi.fn(createProjectProposalPdf);
    const cached = createProjectProposalPdfCache(render);
    const start = process.cpuUsage();
    const first = await cached("u", "p", sample);
    const second = await cached("u", "p", sample);
    const third = await cached("u", "p", sample);
    const cpu = process.cpuUsage(start);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(render).toHaveBeenCalledTimes(1);
    expect((await PDFDocument.load(first)).getTitle()).toContain(sample.code);
    expect(Buffer.from(first).toString("latin1")).not.toMatch(/\/Type\s*\/(?:ObjStm|XRef)\b/);
    if (process.env.MEASURE_PROJECT_PDF_CPU === "1") {
      console.info(
        JSON.stringify({
          scenario: "three identical authorized snapshots in one warm instance",
          baselineCpuMs,
          cachedCpuMs: (cpu.user + cpu.system) / 1000,
          renderCalls: render.mock.calls.length,
        }),
      );
    }
  });
  it("coalesces concurrent identical requests and returns independent byte arrays", async () => {
    const render = vi.fn(async () => pdf);
    const cached = createProjectProposalPdfCache(render);
    const [a, b] = await Promise.all([cached("u", "p", data), cached("u", "p", data)]);
    expect(render).toHaveBeenCalledTimes(1);
    expect(a).toEqual(pdf);
    expect(b).toEqual(pdf);
    a[0] = 0;
    expect(b[0]).toBe(37);
    expect(await cached("u", "p", data)).toEqual(pdf);
  });
  it("keys all rendered fields and isolates users and projects", async () => {
    const render = vi.fn(async () => pdf);
    const cached = createProjectProposalPdfCache(render);
    await cached("u", "p", data);
    await cached("other", "p", data);
    await cached("u", "other", data);
    for (const changes of [
      { approvedBudget: 2000 },
      { title: "แก้ไขชื่อ" },
      { organizationName: "เปลี่ยนหน่วยงาน" },
      { budgetRequestLabel: "คำขอฉบับใหม่" },
      { proposalDetails: { ...data.proposalDetails, rationale: "เหตุผลฉบับใหม่" } },
    ]) {
      await cached("u", "p", { ...data, ...changes });
    }
    expect(render).toHaveBeenCalledTimes(8);
  });
  it("expires entries even when they are accessed repeatedly", async () => {
    vi.useFakeTimers();
    const render = vi.fn(async () => pdf);
    const cached = createProjectProposalPdfCache(render, { ttlMs: 1000 });
    await cached("u", "p", data);
    vi.advanceTimersByTime(900);
    await cached("u", "p", data);
    vi.advanceTimersByTime(100);
    await cached("u", "p", data);
    expect(render).toHaveBeenCalledTimes(2);
  });
  it("evicts the least recently used entry at the count limit", async () => {
    const render = vi.fn(async () => pdf);
    const cached = createProjectProposalPdfCache(render, { maxEntries: 2 });
    await cached("u", "p1", data);
    await cached("u", "p2", data);
    await cached("u", "p1", data);
    await cached("u", "p3", data);
    await cached("u", "p1", data);
    expect(render).toHaveBeenCalledTimes(3);
    await cached("u", "p2", data);
    expect(render).toHaveBeenCalledTimes(4);
  });
  it("caps retained bytes and does not retain oversized documents", async () => {
    const render = vi.fn(async () => pdf);
    const cached = createProjectProposalPdfCache(render, { maxBytes: 6 });
    await cached("u", "p1", data);
    await cached("u", "p2", data);
    await cached("u", "p1", data);
    expect(render).toHaveBeenCalledTimes(3);
    const oversized = createProjectProposalPdfCache(render, { maxBytes: 3 });
    await oversized("u", "p", data);
    await oversized("u", "p", data);
    expect(render).toHaveBeenCalledTimes(5);
  });
  it("does not cache failures and permits the next request to retry", async () => {
    const render = vi.fn().mockRejectedValueOnce(new Error("render failed")).mockResolvedValue(pdf);
    const cached = createProjectProposalPdfCache(render);
    await expect(cached("u", "p", data)).rejects.toThrow("render failed");
    expect(await cached("u", "p", data)).toEqual(pdf);
    expect(render).toHaveBeenCalledTimes(2);
  });
  it("does not let a late render repopulate an evicted entry", async () => {
    let complete!: (value: Uint8Array) => void;
    const render = vi
      .fn()
      .mockImplementationOnce(() => new Promise<Uint8Array>((resolve) => (complete = resolve)))
      .mockResolvedValue(pdf);
    const cached = createProjectProposalPdfCache(render, { maxEntries: 1 });
    const pending = cached("u", "p1", data);
    await Promise.resolve();
    await cached("u", "p2", data);
    complete(pdf);
    await pending;
    await cached("u", "p2", data);
    expect(render).toHaveBeenCalledTimes(2);
    await cached("u", "p1", data);
    expect(render).toHaveBeenCalledTimes(3);
  });
});
