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
const archiveSql = `update projects set archived_at=now() where id=$1 and version=$2
  and status='proposed' and disbursed_amount=0 and archived_at is null returning id`;

describe("project archive uses existing RLS and recoverable storage", () => {
  it("hides the proposal from the register, keeps audit history and allows restore", async () => {
    expect(
      (await asUser(db, ids.admin, () => db.query(archiveSql, [ids.project, 1]))).rows,
    ).toHaveLength(1);
    expect(
      (
        await asUser(db, ids.admin, () =>
          db.query("select id from project_register where id=$1", [ids.project]),
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query("select id from audit_events where entity_id=$1 and action='update'", [
          ids.project,
        ])
      ).rows.length,
    ).toBeGreaterThan(0);
    await asUser(db, ids.admin, () =>
      db.query("select admin_restore_record('project',$1)", [ids.project]),
    );
    expect(
      (
        await asUser(db, ids.admin, () =>
          db.query("select id from project_register where id=$1", [ids.project]),
        )
      ).rows,
    ).toHaveLength(1);
  });
  it("RLS blocks deletion when an approval task is pending", async () => {
    await db.query(
      "insert into approval_tasks (organization_id,entity_type,entity_id,status) values ($1,'project',$2,'pending')",
      [ids.org, ids.project],
    );
    expect(
      (await asUser(db, ids.admin, () => db.query(archiveSql, [ids.project, 1]))).rows,
    ).toHaveLength(0);
  });
  it("rejects stale versions", async () => {
    await db.query("update projects set title_th='changed' where id=$1", [ids.project]);
    expect(
      (await asUser(db, ids.admin, () => db.query(archiveSql, [ids.project, 1]))).rows,
    ).toHaveLength(0);
  });
  it.each(["active", "on_hold", "completed", "cancelled"])("does not delete %s", async (status) => {
    const row = await db.query<{ version: number }>(
      "update projects set status=$2::project_status where id=$1 returning version",
      [ids.project, status],
    );
    expect(
      (await asUser(db, ids.admin, () => db.query(archiveSql, [ids.project, row.rows[0].version])))
        .rows,
    ).toHaveLength(0);
  });
});
