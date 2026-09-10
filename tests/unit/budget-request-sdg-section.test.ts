import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BudgetRequestSdgSection } from "@/features/budget-requests/components/budget-request-sdg-section";

describe("budget request SDG section", () => {
  it("renders all seventeen goals, selected count, and alignment explanation", () => {
    const html = renderToStaticMarkup(
      createElement(BudgetRequestSdgSection, {
        alignmentDescription: "สนับสนุนการเข้าถึงการศึกษาที่มีคุณภาพ",
        errors: undefined,
        onAlignmentChange: () => undefined,
        onSelectionChange: () => undefined,
        selected: ["SDG 4 การศึกษาที่มีคุณภาพ", "SDG 17 หุ้นส่วนเพื่อการพัฒนา"],
      }),
    );

    expect(html.match(/type="checkbox"/g)).toHaveLength(17);
    expect(html).toContain("เลือกแล้ว 2 เป้าหมาย");
    expect(html).toContain("SDG 1");
    expect(html).toContain("SDG 17");
    expect(html).toContain("การศึกษาที่มีคุณภาพ");
    expect(html).toContain("คำอธิบายความเชื่อมโยง");
    expect(html).toContain("สนับสนุนการเข้าถึงการศึกษาที่มีคุณภาพ");
  });
});
