import type { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

async function summary(actor: string = ids.staff, projectIds: string[] = [ids.project]) {
  return (
    await asUser(db, actor, () =>
      db.query<{ project_id: string; approval_state: string }>(
        "select * from get_project_approval_states($1)",
        [projectIds],
      ),
    )
  ).rows;
}
async function task(role: string | null, status = "pending") {
  await db.query(
    "insert into approval_tasks(entity_type,entity_id,organization_id,required_role,status,created_at,acted_at) values ('project',$1,$2,$3::app_role,$4,clock_timestamp(),case when $4='pending' then null else clock_timestamp() end)",
    [ids.project, ids.org, role, status],
  );
}

describe("project approval summaries", () => {
  it("does not mistake normal health or an approved budget for an approved project", async () => {
    await db.query("update budget_requests set status='approved' where id=$1", [ids.budget]);
    await asUser(db, ids.staff, () =>
      db.query("update projects set budget_request_id=$1,health='normal' where id=$2", [
        ids.budget,
        ids.project,
      ]),
    );
    expect(await summary()).toEqual([
      { project_id: ids.project, approval_state: "awaiting_submission" },
    ]);
  });
  it.each([
    ["user", "unit_review"],
    ["executive", "executive_review"],
    [null, "pending"],
  ])("summarizes pending role %s without granting access to its task", async (role, state) => {
    await task(role);
    expect((await summary())[0].approval_state).toBe(state);
    const hidden = await asUser(db, ids.staff, () =>
      db.query("select * from approval_tasks where entity_id=$1", [ids.project]),
    );
    expect(hidden.rows).toHaveLength(0);
    expect(Object.keys((await summary())[0]).sort()).toEqual(["approval_state", "project_id"]);
  });
  it.each([
    ["active", "approved"],
    ["completed", "completed"],
    ["on_hold", "on_hold"],
    ["cancelled", "cancelled"],
  ])("reports project state %s", async (status, state) => {
    await db.query("update projects set status=$1::project_status where id=$2", [
      status,
      ids.project,
    ]);
    expect((await summary())[0].approval_state).toBe(state);
  });
  it.each([
    ["revision_required", "revision_required"],
    ["rejected", "rejected"],
    ["approved", "unknown"],
  ])("uses latest decision %s when no task is pending", async (decision, state) => {
    await task("user", decision);
    expect((await summary())[0].approval_state).toBe(state);
  });
  it("prioritizes the new pending task over historical returns", async () => {
    await task("user", "revision_required");
    await task("user");
    expect((await summary())[0].approval_state).toBe("unit_review");
  });
  it("does not guess a single stage when multiple tasks are pending", async () => {
    await task("user");
    await task("executive");
    expect((await summary())[0].approval_state).toBe("pending");
  });
  it("uses the returned revision, then newer reapproval decisions", async () => {
    await db.query("update projects set status='active' where id=$1", [ids.project]);
    const current = (
      await db.query<{ version: number }>("select version from projects where id=$1", [ids.project])
    ).rows[0].version;
    const request = await asUser(db, ids.staff, () =>
      db.query<{ id: string }>(
        "select request_project_revision($1,$2,'ต้องการแก้ไขรายละเอียด') as id",
        [ids.project, current],
      ),
    );
    await asUser(db, ids.admin, () =>
      db.query("select decide_project_revision($1,$2,$3,true,'ส่งกลับตามเหตุผลที่แจ้ง')", [
        ids.project,
        request.rows[0].id,
        current,
      ]),
    );
    expect((await summary())[0].approval_state).toBe("revision_required");
    await task("user", "rejected");
    expect((await summary())[0].approval_state).toBe("rejected");
  });
  it.each([ids.otherStaff, ids.outside, ids.inactive])(
    "does not expose summaries to unrelated or inactive user %s",
    async (actor) => {
      expect(await summary(actor)).toHaveLength(0);
    },
  );
  it.each([ids.admin, ids.user, ids.executive])(
    "allows already-authorized reviewer %s",
    async (actor) => {
      expect(await summary(actor)).toHaveLength(1);
    },
  );
  it("omits archived projects and empty requests", async () => {
    expect(await summary(ids.staff, [])).toEqual([]);
    await db.query("update projects set archived_at=now() where id=$1", [ids.project]);
    expect(await summary()).toEqual([]);
  });
  it("caps requested IDs at 100 and denies anonymous execution", async () => {
    const missing = "00000000-0000-4000-8000-000000000000";
    expect(await summary(ids.staff, [...Array<string>(100).fill(missing), ids.project])).toEqual(
      [],
    );
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "select has_function_privilege('anon','public.get_project_approval_states(uuid[])','EXECUTE') as allowed",
        )
      ).rows[0].allowed,
    ).toBe(false);
  });
});
