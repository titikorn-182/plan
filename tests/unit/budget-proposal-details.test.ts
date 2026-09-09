import { describe, expect, it } from "vitest";
import {
  BUDGET_SDG_OPTIONS,
  createEmptyBudgetProposalDetails,
  parseBudgetProposalDetails,
} from "@/features/budget-requests/proposal-details";

describe("budget proposal details", () => {
  it("provides all seventeen sustainable development goals", () => {
    expect(BUDGET_SDG_OPTIONS).toHaveLength(17);
    expect(BUDGET_SDG_OPTIONS[0]).toBe("SDG 1 ขจัดความยากจน");
    expect(BUDGET_SDG_OPTIONS[16]).toBe("SDG 17 หุ้นส่วนเพื่อการพัฒนา");
  });

  it("normalizes missing legacy details to an empty typed structure", () => {
    expect(parseBudgetProposalDetails(null)).toEqual({
      success: true,
      data: createEmptyBudgetProposalDetails(),
    });
  });

  it("trims known fields and preserves selected SDGs", () => {
    const parsed = parseBudgetProposalDetails(
      JSON.stringify({
        missionName: "  พันธกิจด้านบริการวิชาการ  ",
        startsOn: "2026-10-01",
        endsOn: "2027-09-30",
        sdgs: ["SDG 4 การศึกษาที่มีคุณภาพ"],
      }),
    );
    expect(parsed).toMatchObject({
      success: true,
      data: {
        missionName: "พันธกิจด้านบริการวิชาการ",
        startsOn: "2026-10-01",
        endsOn: "2027-09-30",
        sdgs: ["SDG 4 การศึกษาที่มีคุณภาพ"],
      },
    });
  });

  it("normalizes previously saved SDG labels", () => {
    const parsed = parseBudgetProposalDetails({
      sdgs: [
        "SDG 8 งานที่มีคุณค่าและการเติบโตทางเศรษฐกิจ",
        "SDG 9 อุตสาหกรรม นวัตกรรม และโครงสร้างพื้นฐาน",
      ],
    });
    expect(parsed).toMatchObject({
      success: true,
      data: {
        sdgs: [
          "SDG 8 งานที่มีคุณค่าและเศรษฐกิจที่เติบโต",
          "SDG 9 อุตสาหกรรม นวัตกรรม โครงสร้างพื้นฐาน",
        ],
      },
    });
  });

  it.each([
    ["malformed JSON", "{", "proposalDetails"],
    ["invalid dates", { startsOn: "2027-10-01", endsOn: "2027-09-30" }, "proposalDetails.endsOn"],
    ["unknown SDG", { sdgs: ["SDG 99"] }, "proposalDetails.sdgs"],
    ["overlong text", { fundingSource: "x".repeat(121) }, "proposalDetails.fundingSource"],
  ])("rejects %s", (_label, value, errorKey) => {
    const parsed = parseBudgetProposalDetails(value);
    expect(parsed.success).toBe(false);
    if (!parsed.success) expect(parsed.errors[errorKey]).toEqual(expect.any(Array));
  });
});
