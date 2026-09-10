import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { BudgetRequestsView } from "@/components/modules/budget-requests-view";
import { createPagination } from "@/features/shared/pagination";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", props, children),
}));

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
});
