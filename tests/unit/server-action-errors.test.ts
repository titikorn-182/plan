import { describe, expect, it, vi } from "vitest";
import { friendlyError } from "@/features/shared/server-actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

describe("safe actionable constraint errors", () => {
  it.each([
    ["plan structure is not valid for the selected fiscal year", "โครงสร้างแผนและกิจกรรม"],
    ["expense category is not valid for the selected fiscal year", "หมวดรายจ่ายย่อย"],
    ["the budget cycle is not open", "รอบรับคำของบประมาณ"],
  ])("maps known constraints without exposing SQL details: %s", (message, expected) => {
    expect(friendlyError({ code: "23514", message })).toContain(expected);
  });
  it("logs unknown constraints with a support reference without returning private details", () => {
    const logger = vi.spyOn(console, "error").mockImplementation(() => {});
    const message = friendlyError(
      { code: "23514", message: "private_database_constraint" },
      "budget_requests.save_transaction",
    );
    expect(message).toContain("รหัสอ้างอิง");
    expect(message).not.toContain("private_database_constraint");
    expect(logger).toHaveBeenCalledWith(
      "[application-error]",
      expect.stringContaining('"operation":"budget_requests.save_transaction"'),
    );
  });
});
