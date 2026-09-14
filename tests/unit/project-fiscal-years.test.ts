import { describe, expect, it } from "vitest";
import { sortProjectFiscalYears } from "@/features/projects/fiscal-years";

describe("project fiscal year options", () => {
  it("orders project proposal years from 2570 through 2572 without mutating the query result", () => {
    const source = [
      { id: "2572", buddhistYear: 2572, label: "ปีงบประมาณ 2572" },
      { id: "2571", buddhistYear: 2571, label: "ปีงบประมาณ 2571" },
      { id: "2570", buddhistYear: 2570, label: "ปีงบประมาณ 2570" },
    ];

    expect(sortProjectFiscalYears(source).map((item) => item.buddhistYear)).toEqual([
      2570, 2571, 2572,
    ]);
    expect(source.map((item) => item.buddhistYear)).toEqual([2572, 2571, 2570]);
  });
});
