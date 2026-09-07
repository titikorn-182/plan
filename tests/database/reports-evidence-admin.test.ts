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

async function reviewBothStages(entityId: string) {
  for (const reviewer of [ids.user, ids.executive]) {
    const task = await db.query<{ id: string }>(
      "select id from approval_tasks where entity_id=$1 and status='pending'",
      [entityId],
    );
    expect(task.rows).toHaveLength(1);
    await asUser(db, reviewer, () =>
      db.query("select act_on_approval_task($1,'approved')", [task.rows[0].id]),
    );
  }
}

describe("quarterly and KPI verification", () => {
  test("quarterly report can be created, submitted, and verified by the executive", async () => {
    const { rows } = await asUser(db, ids.staff, () =>
      db.query<{ id: string }>(
        "insert into quarterly_reports (project_id,fiscal_year_id,organization_id,quarter,due_at,cumulative_progress,achievement_summary,created_by) values ($1,$2,$3,1,'2027-01-15',25,'Quarter one completed',$4) returning id",
        [ids.project, ids.year, ids.org, ids.staff],
      ),
    );
    const id = rows[0].id;
    expect(
      (
        await asUser(db, ids.otherStaff, () =>
          db.query("select id from quarterly_reports where id=$1", [id]),
        )
      ).rows,
    ).toHaveLength(0);
    await asUser(db, ids.staff, () =>
      db.query("select submit_entity_for_approval('quarterly_report',$1)", [id]),
    );
    await reviewBothStages(id);
    expect(
      (await db.query("select status,verified_by from quarterly_reports where id=$1", [id])).rows,
    ).toEqual([{ status: "approved", verified_by: ids.executive }]);
    expect(
      (
        await asUser(db, ids.staff, () =>
          db.query("update quarterly_reports set cumulative_progress=99 where id=$1 returning id", [
            id,
          ]),
        )
      ).rows,
    ).toHaveLength(0);
  });

  test("KPI assigned staff submits actual and executive certifies; verified results are locked", async () => {
    await asUser(db, ids.staff, () =>
      db.query(
        "update kpi_results set actual=100,result_state='achieved',status='draft' where id=$1",
        [ids.kpi],
      ),
    );
    await asUser(db, ids.staff, () =>
      db.query("select submit_entity_for_approval('kpi_result',$1)", [ids.kpi]),
    );
    await reviewBothStages(ids.kpi);
    expect(
      (await db.query("select status,verified_by from kpi_results where id=$1", [ids.kpi])).rows,
    ).toEqual([{ status: "verified", verified_by: ids.executive }]);
    expect(
      (
        await asUser(db, ids.staff, () =>
          db.query("update kpi_results set actual=90 where id=$1 returning id", [ids.kpi]),
        )
      ).rows,
    ).toHaveLength(0);
  });
});

describe("evidence review permissions", () => {
  test("only authorized reviewers can certify evidence; rejection needs a reason", async () => {
    const { rows } = await asUser(db, ids.staff, () =>
      db.query<{ id: string }>(
        "insert into attachments (organization_id,entity_type,entity_id,file_name,storage_path,mime_type,size_bytes,uploaded_by) values ($1,'project',$2,'test.pdf',$3,'application/pdf',10,$4) returning id",
        [
          ids.org,
          ids.project,
          `${ids.org}/project/${ids.project}/${ids.staff}/test.pdf`,
          ids.staff,
        ],
      ),
    );
    const id = rows[0].id;
    await expect(
      asUser(db, ids.staff, () => db.query("select review_evidence($1,true)", [id])),
    ).rejects.toMatchObject({ code: "42501" });
    await asUser(db, ids.user, () => db.query("select review_evidence($1,true)", [id]));
    expect((await db.query("select is_verified from attachments where id=$1", [id])).rows).toEqual([
      { is_verified: true },
    ]);
    await expect(
      asUser(db, ids.user, () => db.query("select review_evidence($1,false,'')", [id])),
    ).rejects.toMatchObject({ code: "23514" });
    await asUser(db, ids.user, () =>
      db.query("select review_evidence($1,false,'Please replace document')", [id]),
    );
    expect((await db.query("select is_verified from attachments where id=$1", [id])).rows).toEqual([
      { is_verified: false },
    ]);
    expect(
      (await db.query("select id from notifications where recipient_id=$1", [ids.staff])).rows,
    ).toHaveLength(2);
  });
});

describe("administrator access updates", () => {
  test.each([ids.staff, ids.user, ids.executive, ids.inactive])(
    "non-admin %s cannot call the access RPC",
    async (caller) => {
      await expect(
        asUser(db, caller, () =>
          db.query(
            "select admin_update_user_access($1,'Forbidden admin',true,array['admin'],array[$2::uuid])",
            [caller, ids.org],
          ),
        ),
      ).rejects.toMatchObject({ code: "42501" });
    },
  );
  test("failed access update rolls back profile changes and existing roles", async () => {
    const before = (await db.query("select full_name from profiles where id=$1", [ids.staff])).rows;
    await expect(
      asUser(db, ids.admin, () =>
        db.query(
          "select admin_update_user_access($1,'Should rollback',true,array['invalid'],array[$2::uuid])",
          [ids.staff, ids.org],
        ),
      ),
    ).rejects.toMatchObject({ code: "22023" });
    expect(
      (await db.query("select full_name from profiles where id=$1", [ids.staff])).rows,
    ).toEqual(before);
    expect(
      (await db.query("select role from user_roles where profile_id=$1", [ids.staff])).rows,
    ).toEqual([{ role: "staff" }]);
  });
  test("audit columns use created_by for both roles and organization scopes", async () => {
    await asUser(db, ids.admin, () =>
      db.query(
        "select admin_update_user_access($1,'Updated staff',true,array['staff'],array[$2::uuid])",
        [ids.staff, ids.org],
      ),
    );
    expect(
      (await db.query("select created_by from user_roles where profile_id=$1", [ids.staff])).rows,
    ).toEqual([{ created_by: ids.admin }]);
    expect(
      (
        await db.query("select created_by from user_organization_scopes where profile_id=$1", [
          ids.staff,
        ])
      ).rows,
    ).toEqual([{ created_by: ids.admin }]);
  });
  test("null role array cannot bypass the self-lockout guard", async () => {
    await expect(
      asUser(db, ids.admin, () =>
        db.query("select admin_update_user_access($1,'Admin',true,null,array[$2::uuid])", [
          ids.admin,
          ids.org,
        ]),
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
