import { describe, expect, it } from "vitest";
import {
  PROJECT_CHARACTERISTICS,
  createEmptyProjectProposalDetails,
  deriveProjectType,
  parseProjectProposalDetails,
  sumProjectExpenses,
  validateProjectProposalForSubmission,
} from "@/features/projects/proposal-details";

describe("project proposal details", () => {
  it("upgrades an empty stored object to the current structure", () => {
    const parsed = parseProjectProposalDetails({});
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.actionPlan).toEqual([]);
  });

  it("totals expense rows and derives the register project type", () => {
    const details = {
      ...createEmptyProjectProposalDetails(),
      characteristics: [PROJECT_CHARACTERISTICS[1]],
      expenseItems: [
        { category: "ค่าตอบแทน" as const, description: "ก", amount: 1250 },
        { category: "ค่าวัสดุ" as const, description: "ข", amount: 750 },
      ],
    };
    expect(sumProjectExpenses(details)).toBe(2000);
    expect(deriveProjectType(details)).toBe(PROJECT_CHARACTERISTICS[1]);
  });

  it("reports missing submission sections with field paths", () => {
    const errors = validateProjectProposalForSubmission(createEmptyProjectProposalDetails());
    expect(errors["proposalDetails.strategies"]).toBeDefined();
    expect(errors["proposalDetails.expenseItems"]).toBeDefined();
    expect(errors["proposalDetails.outputIndicator"]).toBeDefined();
  });

  it("rejects unsafe shapes without using untyped values", () => {
    expect(parseProjectProposalDetails({ actionPlan: "invalid" }).success).toBe(false);
    expect(parseProjectProposalDetails("not-json").success).toBe(false);
  });
});
