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

describe("report schedule row-level security", () => {
  test("an active user manages their own schedule and Admin can audit it", async () => {
    const created = await asUser(db, ids.staff, () =>
      db.query<{ id: string }>(
        "insert into report_schedules (owner_id,name,report_kind,format,cadence,day_of_week,send_time) values ($1,'Weekly report','projects','pdf','weekly',1,'08:00') returning id",
        [ids.staff],
      ),
    );
    const scheduleId = created.rows[0].id;
    expect(
      (
        await asUser(db, ids.otherStaff, () =>
          db.query("select id from report_schedules where id=$1", [scheduleId]),
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await asUser(db, ids.admin, () =>
          db.query("select id from report_schedules where id=$1", [scheduleId]),
        )
      ).rows,
    ).toHaveLength(1);
    await asUser(db, ids.staff, () =>
      db.query("update report_schedules set is_active=false where id=$1", [scheduleId]),
    );
    expect(
      (await db.query("select is_active from report_schedules where id=$1", [scheduleId])).rows,
    ).toEqual([{ is_active: false }]);
  });

  test("a user cannot create a schedule for another account", async () => {
    await expect(
      asUser(db, ids.staff, () =>
        db.query(
          "insert into report_schedules (owner_id,name,report_kind,format,cadence,day_of_month,send_time) values ($1,'Forged owner','budget','xlsx','monthly',5,'08:00')",
          [ids.otherStaff],
        ),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
});

describe("reporting period views and bulk imports", () => {
  test("register views expose fiscal period keys for server-side filtering", async () => {
    expect(
      (
        await asUser(db, ids.admin, () =>
          db.query("select fiscal_year_id,buddhist_year from project_register where id=$1", [
            ids.project,
          ]),
        )
      ).rows,
    ).toEqual([{ fiscal_year_id: ids.year, buddhist_year: 2570 }]);
    const columns = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_schema='public' and table_name in ('disbursement_register','kpi_register') and column_name in ('fiscal_year_id','buddhist_year','quarter')",
    );
    expect(columns.rows.map((row) => row.column_name)).toEqual(
      expect.arrayContaining(["fiscal_year_id", "buddhist_year", "quarter"]),
    );
  });

  test("a multi-row disbursement statement rolls back when its total exceeds the budget", async () => {
    await expect(
      asUser(db, ids.staff, () =>
        db.query(
          "insert into disbursements (project_id,organization_id,fiscal_year_id,quarter,amount,disbursed_on,created_by) values ($1,$2,$3,1,600,'2027-01-05',$4),($1,$2,$3,1,500,'2027-01-06',$4)",
          [ids.project, ids.org, ids.year, ids.staff],
        ),
      ),
    ).rejects.toMatchObject({ code: "23514" });
    expect(
      (await db.query("select id from disbursements where project_id=$1", [ids.project])).rows,
    ).toHaveLength(0);
  });

  test("the database rejects a disbursement with a mismatched scope or fiscal date", async () => {
    await expect(
      asUser(db, ids.staff, () =>
        db.query(
          "insert into disbursements (project_id,organization_id,fiscal_year_id,quarter,amount,disbursed_on,created_by) values ($1,'20000000-0000-4000-8000-000000000002',$2,1,100,'2027-01-05',$3)",
          [ids.project, ids.year, ids.staff],
        ),
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      asUser(db, ids.staff, () =>
        db.query(
          "insert into disbursements (project_id,organization_id,fiscal_year_id,quarter,amount,disbursed_on,created_by) values ($1,$2,$3,1,100,'2026-09-30',$4)",
          [ids.project, ids.org, ids.year, ids.staff],
        ),
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
