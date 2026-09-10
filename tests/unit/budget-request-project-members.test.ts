import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BudgetRequestProjectMembers } from "@/features/budget-requests/components/budget-request-project-members";
import {
  createEmptyBudgetRequestProjectMember,
  parseBudgetRequestProjectMembers,
  toBudgetRequestProjectMembers,
  validateBudgetRequestProjectMembersForSubmission,
} from "@/features/budget-requests/project-members";

describe("budget request project members", () => {
  it("trims entered members and omits the untouched empty row", () => {
    expect(
      toBudgetRequestProjectMembers([
        createEmptyBudgetRequestProjectMember(1),
        { id: 2, name: "  สมชาย ใจดี  ", position: "  ผู้ประสานงาน  " },
      ]),
    ).toEqual([{ name: "สมชาย ใจดี", position: "ผู้ประสานงาน" }]);
  });

  it("accepts legacy proposal details without project members", () => {
    expect(parseBudgetRequestProjectMembers(undefined)).toEqual({ success: true, data: [] });
  });

  it("requires a name for a partially entered member on submission", () => {
    expect(
      validateBudgetRequestProjectMembersForSubmission([{ name: "", position: "ผู้ช่วย" }]),
    ).toHaveProperty("proposalDetails.projectMembers.0.name");
  });

  it("renders add and remove controls with accessible names", () => {
    const html = renderToStaticMarkup(
      createElement(BudgetRequestProjectMembers, {
        errors: undefined,
        members: [createEmptyBudgetRequestProjectMember(1)],
        onAdd: () => undefined,
        onChange: () => undefined,
        onRemove: () => undefined,
      }),
    );

    expect(html).toContain("เพิ่มผู้รับผิดชอบโครงการ");
    expect(html).toContain("ชื่อ-นามสกุล");
    expect(html).toContain("ตำแหน่ง");
    expect(html).toContain("ลบผู้รับผิดชอบโครงการคนที่ 1");
  });
});
