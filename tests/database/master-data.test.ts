import type { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
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

describe("fiscal-year master data", () => {
  test.each([
    { outputCode: "3101", outputName: "ผู้สำเร็จการศึกษาด้านสังคมศาสตร์" },
    { outputCode: "3101", operationalPlanCode: "10021023" },
  ])("rejects mismatched budget plan values even on draft save: %j", async (details) => {
    await expect(
      asUser(db, ids.staff, () =>
        db.query(
          `select save_budget_request_transaction(
        $1, 1, $2, $3, $4, 'Test staff', 'คำของบประมาณทดสอบ',
        'ดำเนินงาน', 'โครงการทดสอบ', '', 1000, null, $5::jsonb, false
      )`,
          [
            ids.budget,
            ids.year,
            "40000000-0000-4000-8000-000000000001",
            ids.org,
            JSON.stringify(details),
          ],
        ),
      ),
    ).rejects.toMatchObject({
      code: "23514",
      message: "plan structure is not valid for the selected fiscal year",
    });
    const saved = await db.query("select version,status from budget_requests where id=$1", [
      ids.budget,
    ]);
    expect(saved.rows).toEqual([{ version: 1, status: "draft" }]);
  });
  test("saves a paired hierarchy through the budget draft transaction", async () => {
    const details = {
      outputCode: "3101",
      outputName: "ผลงานการให้บริการวิชาการ",
      operationalPlanCode: "31013200",
      operationalPlanName: "แผนการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ",
      activityCode: "310132000001",
    };
    await asUser(db, ids.staff, () =>
      db.query(
        `select save_budget_request_transaction(
        $1, 1, $2, $3, $4, 'Test staff', 'คำของบประมาณทดสอบ',
        'ดำเนินงาน', 'โครงการทดสอบ', '', 1000, null, $5::jsonb, false
      )`,
        [
          ids.budget,
          ids.year,
          "40000000-0000-4000-8000-000000000001",
          ids.org,
          JSON.stringify(details),
        ],
      ),
    );
    const saved = await db.query(
      "select version,status,proposal_details from budget_requests where id=$1",
      [ids.budget],
    );
    expect(saved.rows).toEqual([{ version: 2, status: "draft", proposal_details: details }]);
  });
  test("seeds the complete plan and expense catalogs for every supported year", async () => {
    const plans = await db.query<{ buddhist_year: number; count: number }>(
      `select fiscal_year.buddhist_year, count(*)::integer as count
       from plan_structure_master_data master
       join fiscal_years fiscal_year on fiscal_year.id = master.fiscal_year_id
       where fiscal_year.buddhist_year between 2570 and 2572
       group by fiscal_year.buddhist_year
       order by fiscal_year.buddhist_year`,
    );
    const expenses = await db.query<{ buddhist_year: number; count: number }>(
      `select fiscal_year.buddhist_year, count(*)::integer as count
       from budget_expense_master_data master
       join fiscal_years fiscal_year on fiscal_year.id = master.fiscal_year_id
       where fiscal_year.buddhist_year between 2570 and 2572
       group by fiscal_year.buddhist_year
       order by fiscal_year.buddhist_year`,
    );

    expect(plans.rows).toEqual([
      { buddhist_year: 2570, count: 45 },
      { buddhist_year: 2571, count: 45 },
      { buddhist_year: 2572, count: 45 },
    ]);
    expect(expenses.rows).toEqual([
      { buddhist_year: 2570, count: 18 },
      { buddhist_year: 2571, count: 18 },
      { buddhist_year: 2572, count: 18 },
    ]);
  });

  test("lets authenticated users read catalogs but reserves changes for admins", async () => {
    const visible = await asUser(db, ids.staff, () =>
      db.query("select code from plan_structure_master_data where fiscal_year_id=$1", [ids.year]),
    );
    expect(visible.rows).toHaveLength(45);

    await expect(
      asUser(db, ids.staff, () =>
        db.query(
          `insert into plan_structure_master_data
             (fiscal_year_id,level,code,name_th,sort_order)
           values ($1,'output','9999','ทดสอบ',999)`,
          [ids.year],
        ),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  test("rejects plan hierarchies from the wrong master branch", async () => {
    await expect(
      db.query(
        `update projects
         set proposal_details = $2::jsonb
         where id = $1`,
        [
          ids.project,
          JSON.stringify({
            outputCode: "3101",
            outputName: "ผลงานการให้บริการวิชาการ",
            operationalPlanCode: "10021023",
            operationalPlanName: "แผนการผลิตบัณฑิตสาขาวิชารัฐประศาสนศาสตร์",
          }),
        ],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  test("rejects expense categories from the wrong master branch", async () => {
    await expect(
      db.query(
        `update budget_requests
         set proposal_details = $2::jsonb
         where id = $1`,
        [
          ids.budget,
          JSON.stringify({
            expenseItems: [
              {
                expenditureBudget: "งบลงทุน",
                expenseCategory: "ค่าใช้สอย",
                expenseSubcategory: "ค่าจ้างเหมาบริการ",
              },
            ],
          }),
        ],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
