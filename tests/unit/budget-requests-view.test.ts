import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BudgetRequestsView } from "@/features/budget-requests/components/budget-requests-view";
import type { BudgetRequest } from "@/features/budget-requests/types";
import { createPagination } from "@/features/shared/pagination";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", props, children),
}));

function requestFixture(overrides: Partial<BudgetRequest> = {}): BudgetRequest {
  return {
    uuid: "00000000-0000-4000-8000-000000000001",
    id: "BR-TEST-001",
    title: "โครงการทดสอบทะเบียนคำขอ",
    unit: "หน่วยงานทดสอบ",
    subActivityNames: [],
    category: "ดำเนินงาน",
    amount: 10000,
    status: "รอตรวจสอบ",
    updated: "21 ก.ย. 2569",
    editable: true,
    ...overrides,
  };
}

function renderRequests(requests: BudgetRequest[]) {
  return renderToStaticMarkup(
    createElement(BudgetRequestsView, {
      requests,
      pagination: createPagination(requests.length, 1, 25),
    }),
  );
}

function rowCells(html: string): string[][] {
  const body = html.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  return [...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => cell[1]),
  );
}

describe("budget requests view", () => {
  it("shows a real-data empty state with a direct create action", () => {
    const html = renderToStaticMarkup(
      createElement(BudgetRequestsView, {
        requests: [],
        pagination: createPagination(0, 1, 25),
      }),
    );

    expect(html).toContain("ยังไม่มีคำของบประมาณในปีงบประมาณนี้");
    expect(html).toContain("เริ่มบันทึกข้อมูลจริง");
    expect(html).toContain('href="/budget-requests/new"');
    expect(html).not.toContain("BR70000123");
  });

  it("places the subactivity column immediately after the title and organization", () => {
    const html = renderRequests([requestFixture()]);
    const headers = [...html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/g)].map((header) =>
      header[1].replace(/<[^>]*>/g, "").trim(),
    );

    expect(headers).toEqual([
      "รหัสคำขอ",
      "รายการ / หน่วยงาน",
      "ชื่อกิจกรรมย่อยภายใต้โครงการ 12 หลัก",
      "หมวดงบ",
      "วงเงิน (บาท)",
      "สถานะ",
      "แก้ไขล่าสุด",
      "เปิด",
    ]);
  });

  it("uses an accessible missing-value placeholder when no subactivity was entered", () => {
    const cells = rowCells(renderRequests([requestFixture()]))[0];

    expect(cells).toHaveLength(8);
    expect(cells[2]).toContain('<span class="sr-only">ไม่ได้ระบุชื่อกิจกรรมย่อย</span>');
    expect(cells[2]).toContain('aria-hidden="true">—</span>');
    expect(cells[2]).toContain("—");
    expect(cells[2]).not.toContain("<li");
  });

  it("shows a single subactivity in its own cell without changing the other values", () => {
    const request = requestFixture({ subActivityNames: ["อบรมการจัดทำแผน"] });
    const cells = rowCells(renderRequests([request]))[0];

    expect(cells[0]).toBe(request.id);
    expect(cells[1]).toContain(request.title);
    expect(cells[1]).toContain(request.unit);
    expect(cells[2]).toContain("อบรมการจัดทำแผน");
    expect(cells[2].match(/<li\b/g)).toHaveLength(1);
    expect(cells[3]).toBe(request.category);
    expect(cells[4]).toBe("10,000.00");
    expect(cells[5]).toContain(request.status);
    expect(cells[6]).toBe(request.updated);
    expect(cells[7]).toContain(`href="/budget-requests/${request.uuid}/edit"`);
  });

  it("keeps multiple long names in the same request and escapes imported markup", () => {
    const longName = `กิจกรรมระยะยาว${"พัฒนาศักยภาพ".repeat(35)}`;
    const names = ["กิจกรรมเตรียมความพร้อม", longName, '<script>alert("test")</script> & ทดสอบ'];
    const html = renderRequests([
      requestFixture({ subActivityNames: names }),
      requestFixture({
        uuid: "00000000-0000-4000-8000-000000000002",
        id: "BR-TEST-002",
        subActivityNames: ["กิจกรรมของคำขอที่สอง"],
        editable: false,
      }),
    ]);
    const rows = rowCells(html);

    expect(rows).toHaveLength(2);
    expect(rows[0][2].match(/<li\b/g)).toHaveLength(3);
    expect(rows[0][2]).toContain(longName);
    expect(rows[0][2]).toContain(
      "&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt; &amp; ทดสอบ",
    );
    expect(rows[0][2]).not.toContain("<script>");
    expect(rows[0][2]).not.toContain("truncate");
    expect(rows[0][2]).not.toContain("line-clamp");
    expect(rows[0][2]).not.toContain("กิจกรรมของคำขอที่สอง");
    expect(rows[1][2]).toContain("กิจกรรมของคำขอที่สอง");
    expect(rows[1][7]).toContain('href="/approvals"');
  });
});
