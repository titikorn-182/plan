import type { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { createEmptyBudgetExpenseBreakdown } from "@/features/budget-requests/expense-categories";
import { asUser, createTestDatabase, ids } from "./harness";

let db: PGlite;
beforeAll(async () => {
  db = await createTestDatabase();
});
afterAll(async () => {
  await db?.close();
});
beforeEach(async () => {
  await db.exec("begin");
});
afterEach(async () => {
  await db.exec("rollback");
});

async function saveBreakdown(breakdown: unknown, amount: number) {
  return asUser(db, ids.staff, () =>
    db.query(
      `update public.budget_requests
       set expense_breakdown = $1::jsonb, requested_amount = $2
       where id = $3 returning expense_breakdown, requested_amount`,
      [JSON.stringify(breakdown), amount, ids.budget],
    ),
  );
}

describe("budget expense storage constraints", () => {
  test("preserves legacy requests without inventing category allocations", async () => {
    const { rows } = await db.query(
      "select expense_breakdown, requested_amount from public.budget_requests where id = $1",
      [ids.budget],
    );
    expect(rows).toEqual([{ expense_breakdown: null, requested_amount: "1000.00" }]);
  });

  test("saves and reloads all eleven categories and total atomically", async () => {
    const breakdown = {
      operating_compensation: 0.1,
      operating_services: 0.2,
      operating_materials: 200,
      capital_equipment: 10000,
      capital_construction: 25000,
      personnel_compensation: 150,
      personnel_salary: 300,
      general_subsidy_grant: 500,
      general_subsidy_compensation: 125,
      general_subsidy_services: 75.5,
      general_subsidy_materials: 49.5,
    };
    await saveBreakdown(breakdown, 36400.3);
    const { rows } = await asUser(db, ids.staff, () =>
      db.query(
        "select expense_breakdown, requested_amount from public.budget_requests where id = $1",
        [ids.budget],
      ),
    );
    expect(rows).toEqual([{ expense_breakdown: breakdown, requested_amount: "36400.30" }]);
  });

  test.each([-1, 1.001, "1", null, true, 1_000_000_000_000])(
    "rejects invalid category values sent directly to the database: %j",
    async (invalid) => {
      await expect(
        saveBreakdown({ ...createEmptyBudgetExpenseBreakdown(), operating_services: invalid }, 0),
      ).rejects.toMatchObject({ code: "23514" });
    },
  );

  test.each([null, [], {}, { operating_services: 0 }])(
    "rejects malformed JSON breakdowns: %j",
    async (invalid) => {
      await expect(saveBreakdown(invalid, 0)).rejects.toMatchObject({ code: "23514" });
    },
  );

  test("rejects unknown categories and mismatching totals", async () => {
    await expect(
      saveBreakdown({ ...createEmptyBudgetExpenseBreakdown(), unknown: 0 }, 0),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(saveBreakdown(createEmptyBudgetExpenseBreakdown(), 1000)).rejects.toMatchObject({
      code: "23514",
    });
  });

  test("prevents later total changes from disagreeing with a saved breakdown", async () => {
    await saveBreakdown({ ...createEmptyBudgetExpenseBreakdown(), personnel_salary: 1000 }, 1000);
    await expect(
      asUser(db, ids.staff, () =>
        db.query("update public.budget_requests set requested_amount = 900 where id = $1", [
          ids.budget,
        ]),
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  test("prevents a combined budget greater than the supported total", async () => {
    await expect(
      saveBreakdown(
        {
          ...createEmptyBudgetExpenseBreakdown(),
          personnel_salary: 999_999_999_999,
          personnel_compensation: 0.01,
        },
        999_999_999_999.01,
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
