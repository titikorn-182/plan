import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { BUDGET_REQUEST_FISCAL_YEARS } from "@/features/budget-requests/fiscal-year-options";
import { createTestDatabase } from "./harness";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
});

afterAll(async () => {
  await db?.close();
});

describe("budget request fiscal year migration", () => {
  test("creates one active request cycle for each configured fiscal year", async () => {
    const result = await db.query<{
      buddhist_year: number;
      cycle_name: string;
      cycle_status: string;
    }>(
      `select fiscal_year.buddhist_year,
              budget_cycle.name as cycle_name,
              budget_cycle.status::text as cycle_status
       from fiscal_years as fiscal_year
       join budget_cycles as budget_cycle on budget_cycle.fiscal_year_id = fiscal_year.id
       where budget_cycle.name = any($1::text[])
       order by fiscal_year.buddhist_year`,
      [BUDGET_REQUEST_FISCAL_YEARS.map(({ cycleName }) => cycleName)],
    );

    expect(result.rows).toEqual(
      BUDGET_REQUEST_FISCAL_YEARS.map(({ buddhistYear, cycleName }) => ({
        buddhist_year: buddhistYear,
        cycle_name: cycleName,
        cycle_status: "open",
      })),
    );
  });
});
