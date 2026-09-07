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

async function projectCodes(userId: string) {
  return asUser(db, userId, async () =>
    (
      await db.query<{ code: string }>("select code from public.project_register order by code")
    ).rows.map((row) => row.code),
  );
}
async function pendingTask(entityId: string) {
  const { rows } = await db.query<{ id: string; required_role: string }>(
    "select id, required_role from approval_tasks where entity_id = $1 and status = 'pending'",
    [entityId],
  );
  expect(rows).toHaveLength(1);
  return rows[0];
}
async function submitProject() {
  await asUser(db, ids.staff, () =>
    db.query("select public.submit_entity_for_approval('project', $1)", [ids.project]),
  );
}
async function approveAs(userId: string, taskId: string) {
  return asUser(db, userId, () =>
    db.query("select public.act_on_approval_task($1, 'approved')", [taskId]),
  );
}

describe("production RLS policies applied to PostgreSQL", () => {
  test.each([
    ["admin", ids.admin, ["TEST-P1", "TEST-P2", "TEST-P3"]],
    ["user", ids.user, ["TEST-P1", "TEST-P2"]],
    ["executive", ids.executive, ["TEST-P1", "TEST-P2"]],
    ["staff", ids.staff, ["TEST-P1"]],
    ["outside staff", ids.outside, ["TEST-P3"]],
    ["inactive account", ids.inactive, []],
  ])("%s sees only authorized projects through the register view", async (_role, id, expected) => {
    expect(await projectCodes(id as string)).toEqual(expected);
  });

  test("expired roles cannot read project data", async () => {
    await db.query(
      "update user_roles set active_until = now() - interval '1 second' where profile_id = $1",
      [ids.staff],
    );
    expect(await projectCodes(ids.staff)).toEqual([]);
  });
  test("expired organization scope removes the reviewer's access", async () => {
    await db.query(
      "update user_organization_scopes set active_until = now() - interval '1 second' where profile_id = $1",
      [ids.user],
    );
    expect(await projectCodes(ids.user)).toEqual([]);
  });
  test("a staff member cannot edit a colleague's project", async () => {
    const result = await asUser(db, ids.otherStaff, () =>
      db.query("update projects set title_th = 'Forbidden' where id = $1 returning id", [
        ids.project,
      ]),
    );
    expect(result.rows).toHaveLength(0);
  });
  test("executive cannot edit a project proposal directly", async () => {
    const result = await asUser(db, ids.executive, () =>
      db.query("update projects set title_th = 'Forbidden' where id = $1 returning id", [
        ids.project,
      ]),
    );
    expect(result.rows).toHaveLength(0);
  });
  test("staff cannot grant themselves administrator access", async () => {
    await expect(
      asUser(db, ids.staff, () =>
        db.query("insert into user_roles (profile_id, role) values ($1, 'admin')", [ids.staff]),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  test("KPI assignee can read their result but a colleague cannot", async () => {
    const own = await asUser(db, ids.staff, () => db.query("select id from kpi_results"));
    const other = await asUser(db, ids.otherStaff, () => db.query("select id from kpi_results"));
    expect(own.rows).toHaveLength(1);
    expect(other.rows).toHaveLength(0);
  });
  test("notifications are private to their recipient even for an admin", async () => {
    await db.query(
      "insert into notifications (recipient_id,title,body) values ($1, 'test', 'private')",
      [ids.staff],
    );
    expect(
      (await asUser(db, ids.staff, () => db.query("select id from notifications"))).rows,
    ).toHaveLength(1);
    expect(
      (await asUser(db, ids.admin, () => db.query("select id from notifications"))).rows,
    ).toHaveLength(0);
  });
  test("storage requires an accessible entity and the signed-in uploader's path", async () => {
    const ownPath = `${ids.org}/project/${ids.project}/${ids.staff}/file.pdf`;
    await asUser(db, ids.staff, () =>
      db.query("insert into storage.objects (bucket_id,name) values ('evidence',$1)", [ownPath]),
    );
    expect(
      (await asUser(db, ids.staff, () => db.query("select name from storage.objects"))).rows,
    ).toHaveLength(1);
    expect(
      (await asUser(db, ids.outside, () => db.query("select name from storage.objects"))).rows,
    ).toHaveLength(0);
    await expect(
      asUser(db, ids.otherStaff, () =>
        db.query("insert into storage.objects (bucket_id,name) values ('evidence',$1)", [
          ownPath + ".fake",
        ]),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
});

describe("workflow transactions and database guards", () => {
  test("project progresses from staff to user to executive with notifications", async () => {
    await submitProject();
    const first = await pendingTask(ids.project);
    expect(first.required_role).toBe("user");
    const locked = await asUser(db, ids.staff, () =>
      db.query("update projects set title_th = 'changed' where id = $1 returning id", [
        ids.project,
      ]),
    );
    expect(locked.rows).toHaveLength(0);
    await approveAs(ids.user, first.id);
    const second = await pendingTask(ids.project);
    expect(second.required_role).toBe("executive");
    await approveAs(ids.executive, second.id);
    expect(
      (await db.query("select status from projects where id = $1", [ids.project])).rows,
    ).toEqual([{ status: "active" }]);
    expect(
      (
        await db.query(
          "select id from approval_tasks where entity_id = $1 and status = 'pending'",
          [ids.project],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select id from notifications where recipient_id = $1", [ids.staff])).rows
        .length,
    ).toBeGreaterThan(0);
  });
  test("staff cannot approve their own task and completed tasks cannot be replayed", async () => {
    await submitProject();
    const task = await pendingTask(ids.project);
    await expect(approveAs(ids.staff, task.id)).rejects.toMatchObject({ code: "42501" });
    await approveAs(ids.user, task.id);
    await expect(approveAs(ids.user, task.id)).rejects.toMatchObject({ code: "23514" });
  });
  test("returning a project requires a reason and restores editing", async () => {
    await submitProject();
    const task = await pendingTask(ids.project);
    await expect(
      asUser(db, ids.user, () =>
        db.query("select act_on_approval_task($1, 'revision_required', '')", [task.id]),
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await asUser(db, ids.user, () =>
      db.query("select act_on_approval_task($1, 'revision_required', 'Please revise')", [task.id]),
    );
    const edited = await asUser(db, ids.staff, () =>
      db.query(
        "update projects set title_th = 'Revised proposal' where id = $1 returning title_th",
        [ids.project],
      ),
    );
    expect(edited.rows).toEqual([{ title_th: "Revised proposal" }]);
  });
  test("budget submission and task creation roll back together on failure", async () => {
    await db.exec(`create function private.test_fail_task() returns trigger language plpgsql as $$ begin raise exception 'Injected task failure'; end; $$;
      create trigger test_fail_task before insert on approval_tasks for each row execute function private.test_fail_task();`);
    await expect(
      asUser(db, ids.staff, () =>
        db.query("select submit_budget_request_for_approval($1)", [ids.budget]),
      ),
    ).rejects.toThrow("Injected task failure");
    expect(
      (
        await db.query("select status, submitted_at from budget_requests where id = $1", [
          ids.budget,
        ])
      ).rows,
    ).toEqual([{ status: "draft", submitted_at: null }]);
    expect((await db.query("select id from approval_tasks")).rows).toHaveLength(0);
  });
  test("budget submission creates one task and rejects double submission", async () => {
    await asUser(db, ids.staff, () =>
      db.query("select submit_budget_request_for_approval($1)", [ids.budget]),
    );
    expect((await pendingTask(ids.budget)).required_role).toBe("user");
    await expect(
      asUser(db, ids.staff, () =>
        db.query("select submit_budget_request_for_approval($1)", [ids.budget]),
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
  test("overspending rolls back the insert and preserves the project total", async () => {
    const spend = (amount: number) =>
      asUser(db, ids.staff, () =>
        db.query(
          "insert into disbursements (project_id, organization_id, fiscal_year_id, quarter, amount, disbursed_on, created_by) values ($1,$2,$3,1,$4,'2026-10-05',$5)",
          [ids.project, ids.org, ids.year, amount, ids.staff],
        ),
      );
    await spend(700);
    await expect(spend(301)).rejects.toMatchObject({ code: "23514" });
    expect(
      (
        await db.query("select disbursed_amount::text as amount from projects where id = $1", [
          ids.project,
        ])
      ).rows,
    ).toEqual([{ amount: "700.00" }]);
    expect((await db.query("select id from disbursements")).rows).toHaveLength(1);
    await spend(300);
    expect(
      (
        await db.query("select disbursed_amount::text as amount from projects where id = $1", [
          ids.project,
        ])
      ).rows,
    ).toEqual([{ amount: "1000.00" }]);
  });
  test("optimistic version check rejects a stale second save", async () => {
    const save = () =>
      asUser(db, ids.staff, () =>
        db.query(
          "update projects set title_th = 'New title' where id = $1 and version = 1 returning version",
          [ids.project],
        ),
      );
    expect((await save()).rows).toEqual([{ version: 2 }]);
    expect((await save()).rows).toHaveLength(0);
  });
  test("admin can update access atomically but cannot disable themselves", async () => {
    await asUser(db, ids.admin, () =>
      db.query(
        "select admin_update_user_access($1, 'Updated staff', true, array['staff'], array[$2::uuid])",
        [ids.staff, ids.org],
      ),
    );
    expect(
      (await db.query("select full_name from profiles where id=$1", [ids.staff])).rows,
    ).toEqual([{ full_name: "Updated staff" }]);
    await expect(
      asUser(db, ids.admin, () =>
        db.query(
          "select admin_update_user_access($1, 'Admin', false, array['staff'], array[$2::uuid])",
          [ids.admin, ids.org],
        ),
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
