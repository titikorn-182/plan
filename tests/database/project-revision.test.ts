import type { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
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
  await db.query("update projects set status='active' where id=$1", [ids.project]);
});
afterEach(async () => {
  await db.exec("rollback");
});
async function version() {
  return (
    await db.query<{ version: number }>("select version from projects where id=$1", [ids.project])
  ).rows[0].version;
}
async function request(actor: string = ids.staff, reason = "ต้องการแก้ไขรายละเอียดกิจกรรม") {
  const current = await version();
  return asUser(
    db,
    actor,
    async () =>
      (
        await db.query<{ id: string }>("select request_project_revision($1,$2,$3) as id", [
          ids.project,
          current,
          reason,
        ])
      ).rows[0].id,
  );
}
async function decide(requestId: string, sendBack = true, actor: string = ids.admin) {
  const current = await version();
  return asUser(db, actor, () =>
    db.query("select decide_project_revision($1,$2,$3,$4,$5)", [
      ids.project,
      requestId,
      current,
      sendBack,
      "ตรวจสอบแล้วตามเหตุผลที่เจ้าหน้าที่แจ้ง",
    ]),
  );
}
async function addQuarterlyReport() {
  return db.query(
    "insert into quarterly_reports(project_id,fiscal_year_id,organization_id,quarter,due_at) values ($1,$2,$3,1,now())",
    [ids.project, ids.year, ids.org],
  );
}

describe("approved project revision workflow", () => {
  it("records an owner request without unlocking the approved project; notifies admins", async () => {
    const before = await version();
    const id = await request();
    expect(
      (await db.query<{ status: string }>("select status from projects where id=$1", [ids.project]))
        .rows[0].status,
    ).toBe("active");
    expect(await version()).toBe(before);
    const rows = (
      await asUser(db, ids.admin, () =>
        db.query("select * from get_project_revision_requests($1)", [[ids.project]]),
      )
    ).rows;
    expect(rows).toMatchObject([{ request_id: id, status: "pending" }]);
    expect(rows[0]).not.toHaveProperty("approved_snapshot");
    expect(
      (
        await db.query("select id from notifications where recipient_id=$1 and entity_id=$2", [
          ids.admin,
          ids.project,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await asUser(db, ids.staff, () =>
          db.query("update projects set title_th='must remain locked' where id=$1 returning id", [
            ids.project,
          ]),
        )
      ).rows,
    ).toHaveLength(0);
  });
  it.each([ids.otherStaff, ids.outside, ids.user, ids.executive, ids.inactive, ids.admin])(
    "rejects requests from non-owner/non-staff %s",
    async (actor) => {
      await expect(request(actor)).rejects.toThrow();
    },
  );
  it.each(["", "    ", "abc", "ก".repeat(1001)])(
    "requires a bounded meaningful reason",
    async (reason) => {
      await expect(request(ids.staff, reason)).rejects.toThrow();
    },
  );
  it("rejects duplicate requests and restricts summary visibility", async () => {
    await request();
    await expect(request()).rejects.toThrow(/already pending/);
    for (const actor of [ids.otherStaff, ids.outside, ids.user, ids.executive, ids.inactive]) {
      expect(
        (
          await asUser(db, actor, () =>
            db.query("select * from get_project_revision_requests($1)", [[ids.project]]),
          )
        ).rows,
      ).toHaveLength(0);
    }
    await expect(
      asUser(db, ids.staff, () => db.query("select * from private.project_revision_requests")),
    ).rejects.toThrow(/permission denied/);
  });
  it("admin returns an existing request; owner edits and submits through the normal approval workflow again", async () => {
    await db.query(
      "insert into approval_tasks(organization_id,entity_type,entity_id,required_role,status,comment) values ($1,'project',$2,'executive','approved','original approval')",
      [ids.org, ids.project],
    );
    const requestId = await request();
    for (const actor of [ids.staff, ids.user, ids.executive, ids.inactive])
      await expect(decide(requestId, true, actor)).rejects.toThrow();
    await decide(requestId);
    expect(
      (
        await db.query("select status,owner_id,approved_budget from projects where id=$1", [
          ids.project,
        ])
      ).rows,
    ).toMatchObject([{ status: "proposed", owner_id: ids.staff, approved_budget: "1000.00" }]);
    expect(
      (
        await db.query(
          "select approved_snapshot->>'status' as status from private.project_revision_requests where id=$1",
          [requestId],
        )
      ).rows,
    ).toEqual([{ status: "active" }]);
    expect(
      (
        await asUser(db, ids.otherStaff, () =>
          db.query("update projects set title_th='wrong owner' where id=$1 returning id", [
            ids.project,
          ]),
        )
      ).rows,
    ).toHaveLength(0);
    await asUser(db, ids.staff, () =>
      db.query("update projects set title_th='Revised title' where id=$1", [ids.project]),
    );
    const task = (
      await asUser(db, ids.staff, () =>
        db.query<{ id: string }>(
          "select submit_entity_for_approval('project',$1,'resubmit revision') as id",
          [ids.project],
        ),
      )
    ).rows[0].id;
    expect(
      (
        await asUser(db, ids.staff, () =>
          db.query("update projects set title_th='locked again' where id=$1 returning id", [
            ids.project,
          ]),
        )
      ).rows,
    ).toHaveLength(0);
    await asUser(db, ids.user, () =>
      db.query("select act_on_approval_task($1,'approved',null)", [task]),
    );
    const next = (
      await db.query<{ id: string }>(
        "select id from approval_tasks where entity_id=$1 and status='pending'",
        [ids.project],
      )
    ).rows[0].id;
    await asUser(db, ids.executive, () =>
      db.query("select act_on_approval_task($1,'approved',null)", [next]),
    );
    expect(
      (await db.query("select status,title_th from projects where id=$1", [ids.project])).rows,
    ).toEqual([{ status: "active", title_th: "Revised title" }]);
    expect(
      (
        await db.query("select id from approval_tasks where entity_id=$1 and status='approved'", [
          ids.project,
        ])
      ).rows,
    ).toHaveLength(3);
    expect(
      (
        await db.query(
          "select id from audit_events where entity_type='project_revision_request' and entity_id=$1",
          [requestId],
        )
      ).rows,
    ).toHaveLength(2);
    await expect(decide(requestId)).rejects.toThrow(/changed/);
  });
  it("declines without changing the project and allows a new request while retaining history", async () => {
    const id = await request();
    const before = await version();
    await decide(id, false);
    expect(await version()).toBe(before);
    const next = await request();
    expect(next).not.toBe(id);
    expect(
      (
        await asUser(db, ids.staff, () =>
          db.query("select * from get_project_revision_requests($1)", [[ids.project]]),
        )
      ).rows,
    ).toMatchObject([{ request_id: next, status: "pending" }]);
  });
  it("fails stale versions and nonexistent requests", async () => {
    const id = await request();
    await expect(
      asUser(db, ids.admin, () =>
        db.query("select decide_project_revision($1,$2,1,true,'reason for revision')", [
          ids.project,
          id,
        ]),
      ),
    ).rejects.toThrow(/changed/);
    await expect(decide(ids.budget)).rejects.toThrow(/changed/);
  });
  it.each(["proposed", "completed", "on_hold", "cancelled"])(
    "does not request revision in %s",
    async (status) => {
      await db.query("update projects set status=$2 where id=$1", [ids.project, status]);
      await expect(request()).rejects.toThrow(/eligible/);
    },
  );
  it("rechecks archive state and pending approvals when admin returns", async () => {
    const id = await request();
    await db.query("update projects set archived_at=now() where id=$1", [ids.project]);
    await expect(decide(id)).rejects.toThrow(/eligible/);
  });
  it("blocks projects with reports while preserving the pending request", async () => {
    const id = await request();
    await addQuarterlyReport();
    await expect(decide(id)).rejects.toThrow(/references/);
    expect(
      (await db.query("select status from private.project_revision_requests where id=$1", [id]))
        .rows,
    ).toEqual([{ status: "pending" }]);
  });
  it("blocks spent budget", async () => {
    const id = await request();
    await db.query("update projects set disbursed_amount=100 where id=$1", [ids.project]);
    await expect(decide(id)).rejects.toThrow(/references/);
  });
  it("prevents new reports during revision and permits them after reapproval", async () => {
    const id = await request();
    await decide(id);
    await expect(asUser(db, ids.admin, addQuarterlyReport)).rejects.toThrow(/reapproval/);
    await db.query("update projects set status='active' where id=$1", [ids.project]);
    await addQuarterlyReport();
  });
  it("migration can be applied again without destroying workflow history", async () => {
    const id = await request();
    const migration = await readFile(
      "supabase/migrations/202609300002_project_revision_requests.sql",
      "utf8",
    );
    await db.exec(migration.replace(/^begin;\s*/u, "").replace(/commit;\s*$/u, ""));
    expect(
      (await db.query("select id from private.project_revision_requests where id=$1", [id])).rows,
    ).toHaveLength(1);
  });
});
