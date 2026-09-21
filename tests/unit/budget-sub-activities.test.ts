import { describe, expect, it } from "vitest";
import { getBudgetSubActivityNames } from "@/features/budget-requests/sub-activities";

describe("budget sub-activity names", () => {
  it("combines the form name and imported expense names in their original order", () => {
    expect(
      getBudgetSubActivityNames({
        subActivityName: " ประชุมบุคลากร ",
        expenseItems: [
          { subActivityName: "ประชุมบุคลากร" },
          { subActivityName: "อบรมเชิงปฏิบัติการ" },
          { subActivityName: " อบรมเชิงปฏิบัติการ " },
          { subActivityName: "ติดตามผล" },
        ],
      }),
    ).toEqual(["ประชุมบุคลากร", "อบรมเชิงปฏิบัติการ", "ติดตามผล"]);
  });

  it("ignores blank, missing, and non-text values without inventing names", () => {
    expect(
      getBudgetSubActivityNames({
        subActivityName: 123,
        expenseItems: [
          null,
          "not an item",
          {},
          { subActivityName: true },
          { subActivityName: "  " },
          { subActivityName: ["not text"] },
        ],
      }),
    ).toEqual([]);
  });

  it.each([null, undefined, {}, "invalid", 0])(
    "accepts old records without an expense array: %j",
    (expenseItems) => {
      expect(getBudgetSubActivityNames({ subActivityName: "กิจกรรมเดิม", expenseItems })).toEqual([
        "กิจกรรมเดิม",
      ]);
    },
  );

  it("supports imported requests that only store sub-activities on expenses", () => {
    expect(
      getBudgetSubActivityNames({
        subActivityName: null,
        expenseItems: [{ subActivityName: "กิจกรรมจากไฟล์" }],
      }),
    ).toEqual(["กิจกรรมจากไฟล์"]);
  });
});
