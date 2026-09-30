import { describe, expect, it } from "vitest";
import { budgetRequestEditDeniedReason } from "@/features/budget-requests/edit-policy";
import { BUDGET_STATUS_LABELS } from "@/features/budget-requests/types";
import type { DocumentStatus } from "@/features/budget-requests/types";

describe("budget request edit policy", () => {
  for (const role of ["admin", "staff", "user", "executive"]) {
    it.each(Object.keys(BUDGET_STATUS_LABELS) as DocumentStatus[])(`${role}: %s`, (status) => {
      const allowed =
        role === "admin"
          ? status === "approved"
          : role === "staff" && ["draft", "revision_required"].includes(status);
      expect(
        budgetRequestEditDeniedReason(
          { id: "owner", roles: [role] },
          { status, ownerId: "owner", lockedAt: null },
        ) === null,
      ).toBe(allowed);
    });
  }
  it("denies other owners, locked drafts, and admin/staff draft bypass", () => {
    for (const [roles, ownerId, lockedAt] of [
      [["staff"], "other", null],
      [["staff"], "owner", "2026-01-01"],
      [["admin", "staff"], "owner", null],
    ] as const) {
      expect(
        budgetRequestEditDeniedReason(
          { id: "owner", roles },
          { status: "draft", ownerId, lockedAt },
        ),
      ).not.toBeNull();
    }
  });
});
