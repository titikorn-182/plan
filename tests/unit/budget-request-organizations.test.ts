import { describe, expect, it } from "vitest";
import {
  BUDGET_REQUEST_ORGANIZATION_NAMES,
  BUDGET_REQUEST_ORGANIZATIONS,
  getBudgetRequestOrganizationOrder,
} from "@/features/budget-requests/organization-options";

describe("budget request organization options", () => {
  it("contains the 15 organizations in the supplied order", () => {
    expect(BUDGET_REQUEST_ORGANIZATIONS).toHaveLength(15);
    expect(BUDGET_REQUEST_ORGANIZATIONS[0]?.name).toBe("สำนักงานเลขานุการ-งานสารบรรณและธุรการ");
    expect(BUDGET_REQUEST_ORGANIZATIONS.at(-1)?.name).toBe("ภาควิชารัฐประศาสนศาสตร์");
  });

  it("uses unique names and provides deterministic ordering", () => {
    expect(new Set(BUDGET_REQUEST_ORGANIZATION_NAMES).size).toBe(
      BUDGET_REQUEST_ORGANIZATION_NAMES.length,
    );
    expect(getBudgetRequestOrganizationOrder("สำนักงานเลขานุการ-งานสารบรรณและธุรการ")).toBe(0);
    expect(getBudgetRequestOrganizationOrder("ภาควิชารัฐประศาสนศาสตร์")).toBe(14);
    expect(getBudgetRequestOrganizationOrder("UNKNOWN")).toBe(Number.MAX_SAFE_INTEGER);
  });
});
