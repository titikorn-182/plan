import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApprovedBudgetSelector } from "@/features/projects/components/approved-budget-selector";
import type { ApprovedBudgetSourceControl } from "@/features/projects/hooks/use-approved-budget-source";

function render(mode: ApprovedBudgetSourceControl["mode"]) {
  return renderToStaticMarkup(
    createElement(ApprovedBudgetSelector, {
      options: {
        organizations: [],
        fiscalYears: [],
        masterData: [],
        budgetRequests: [],
        defaultOwnerName: "",
        record: null,
      },
      source: {
        mode,
        budgetRequestId: "",
        replacementId: null,
        loading: false,
        error: "",
        warnings: [],
        loadedCode: "",
        busy: false,
        markModified: () => undefined,
        select: () => undefined,
        useApprovedMode: () => undefined,
        confirm: () => undefined,
        cancel: () => undefined,
      },
      title: "",
      setTitle: () => undefined,
      disabled: false,
      errors: { budgetRequestId: ["กรุณาเลือกคำของบใหม่"], title: ["กรุณาระบุชื่อกิจกรรมย่อย"] },
    }),
  );
}

describe("approved budget selector validation accessibility", () => {
  it("associates server source and hidden title errors with the approved selector", () => {
    const html = render("approved");
    const select = html.match(/<select\b[^>]*>/)?.[0];
    expect(select).toContain('aria-invalid="true"');
    expect(select).toContain(
      'aria-describedby="approved-budget-help approved-budget-error approved-budget-field-error approved-budget-title-error"',
    );
    expect(html).toContain('id="approved-budget-field-error"');
    expect(html).toContain('id="approved-budget-title-error"');
  });
  it("associates title errors with the editable manual title", () => {
    const html = render("manual");
    const input = html.match(/<input\b[^>]*name="title"[^>]*>/)?.[0];
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain('aria-describedby="approved-budget-title-error"');
  });
});
