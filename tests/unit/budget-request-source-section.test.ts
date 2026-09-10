import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BudgetRequestSourceSection } from "@/features/budget-requests/components/budget-request-source-section";
import {
  BUDGET_REQUEST_SOURCE_SECTIONS,
  createEmptyBudgetRequestSourceValues,
} from "@/features/budget-requests/source-fields";

describe("budget request source section", () => {
  it("renders fiscal-year content before the source fields", () => {
    const section = BUDGET_REQUEST_SOURCE_SECTIONS.find((item) => item.id === "source");
    expect(section).toBeDefined();

    const html = renderToStaticMarkup(
      createElement(
        BudgetRequestSourceSection,
        {
          section: section!,
          errors: undefined,
          onChange: () => undefined,
          values: createEmptyBudgetRequestSourceValues(),
        },
        createElement("select", { id: "budget-fiscal-year" }),
      ),
    );

    expect(html.indexOf('id="budget-fiscal-year"')).toBeGreaterThan(-1);
    expect(html.indexOf('id="budget-fiscal-year"')).toBeLessThan(
      html.indexOf('id="budget-source-organizationCode"'),
    );
  });

  it("shows system organization errors on the visible organization-name field", () => {
    const section = BUDGET_REQUEST_SOURCE_SECTIONS.find((item) => item.id === "source");
    expect(section).toBeDefined();

    const html = renderToStaticMarkup(
      createElement(BudgetRequestSourceSection, {
        section: section!,
        errors: { organizationId: ["ไม่พบหน่วยงานที่เชื่อมโยงในระบบ"] },
        onChange: () => undefined,
        values: createEmptyBudgetRequestSourceValues(),
      }),
    );

    expect(html).toContain("ไม่พบหน่วยงานที่เชื่อมโยงในระบบ");
    expect(html).toContain('id="budget-source-organizationName"');
    expect(html).toContain('aria-invalid="true"');
  });
});
