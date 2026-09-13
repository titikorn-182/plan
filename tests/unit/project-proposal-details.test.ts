import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProposalBudget } from "@/features/projects/components/project-proposal-sections";
import {
  PROJECT_CHARACTERISTICS,
  calculateProjectExpenseAmount,
  createEmptyProjectProposalDetails,
  deriveProjectType,
  parseProjectProposalDetails,
  sumProjectExpenses,
  validateProjectProposalForSubmission,
} from "@/features/projects/proposal-details";
import { SDG_OPTIONS } from "@/features/shared/sdgs";

describe("project proposal details", () => {
  it("upgrades an empty stored object to the current structure", () => {
    const parsed = parseProjectProposalDetails({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.actionPlan).toEqual([]);
      expect(parsed.data.sdgs).toEqual([]);
      expect(parsed.data.sdgAlignmentDescription).toBe("");
    }
  });

  it("totals expense rows and derives the register project type", () => {
    const details = {
      ...createEmptyProjectProposalDetails(),
      characteristics: [PROJECT_CHARACTERISTICS[1]],
      expenseItems: [
        {
          category: "ค่าตอบแทน" as const,
          description: "ก",
          rate: 250,
          units: 5,
          quantity: 1,
          occurrences: 1,
          amount: 1250,
        },
        {
          category: "ค่าวัสดุ" as const,
          description: "ข",
          rate: 75,
          units: 5,
          quantity: 2,
          occurrences: 1,
          amount: 750,
        },
      ],
    };
    expect(sumProjectExpenses(details)).toBe(2000);
    expect(calculateProjectExpenseAmount(details.expenseItems[0])).toBe(1250);
    expect(deriveProjectType(details)).toBe(PROJECT_CHARACTERISTICS[1]);
  });

  it("upgrades legacy expense rows without changing their total", () => {
    const parsed = parseProjectProposalDetails({
      expenseItems: [{ category: "ค่าตอบแทน", description: "ค่าตอบแทนวิทยากร", amount: 1250 }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.expenseItems[0]).toMatchObject({
        rate: 1250,
        units: 1,
        quantity: 1,
        occurrences: 1,
        amount: 1250,
      });
      expect(sumProjectExpenses(parsed.data)).toBe(1250);
    }
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

  it("accepts known SDGs and rejects unknown goals", () => {
    const valid = parseProjectProposalDetails({
      sdgs: [SDG_OPTIONS[3], SDG_OPTIONS[16]],
      sdgAlignmentDescription: "สนับสนุนการศึกษาและความร่วมมือ",
    });
    expect(valid.success).toBe(true);
    if (valid.success) expect(valid.data.sdgs).toEqual([SDG_OPTIONS[3], SDG_OPTIONS[16]]);
    expect(parseProjectProposalDetails({ sdgs: ["SDG 99"] }).success).toBe(false);
  });

  it("renders every expense factor and the calculated row total", () => {
    const details = {
      ...createEmptyProjectProposalDetails(),
      expenseItems: [
        {
          category: "ค่าตอบแทน" as const,
          description: "ค่าตอบแทนวิทยากร",
          rate: 500,
          units: 2,
          quantity: 3,
          occurrences: 1,
          amount: 3000,
        },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(ProposalBudget, {
        details,
        setDetails: () => undefined,
        errors: undefined,
        disabled: false,
        target: "25",
        setTarget: () => undefined,
      }),
    );
    expect(html).toContain("อัตรา");
    expect(html).toContain("หน่วย");
    expect(html).toContain("จำนวนเงินรวม");
    expect(html).toContain("3,000.00");
  });
});
