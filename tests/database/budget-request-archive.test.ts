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

const archiveSql = `update budget_requests set archived_at=now()
  where id=$1 and version=$2 and status in ('draft','cancelled')
  and locked_at is null and archived_at is null returning id,version`;

describe("budget register recoverable deletion", () => {
  it("removes a draft from the register, retains the record and audit trail, and can restore it", async () => {
    const archived = await asUser(db, ids.admin, () => db.query(archiveSql, [ids.budget, 1]));
    expect(archived.rows).toEqual([{ id: ids.budget, version: 2 }]);
    expect(
      (
        await asUser(db, ids.admin, () =>
          db.query("select id from budget_request_register where id=$1", [ids.budget]),
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query("select id from budget_requests where id=$1 and archived_at is not null", [
          ids.budget,
        ])
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query("select id from audit_events where entity_id=$1 and action='update'", [
          ids.budget,
        ])
      ).rows.length,
    ).toBeGreaterThan(0);
    await asUser(db, ids.admin, () =>
      db.query("select admin_restore_record('budget_request',$1)", [ids.budget]),
    );
    expect(
      (
        await asUser(db, ids.admin, () =>
          db.query("select id from budget_request_register where id=$1", [ids.budget]),
        )
      ).rows,
    ).toHaveLength(1);
  });

  it.each(["submitted", "pending_approval", "approved", "revision_required"])(
    "does not archive %s even with the current version",
    async (status) => {
      const changed = await db.query<{ version: number }>(
        "update budget_requests set status=$2::document_status where id=$1 returning version",
        [ids.budget, status],
      );
      expect(
        (
          await asUser(db, ids.admin, () =>
            db.query(archiveSql, [ids.budget, changed.rows[0].version]),
          )
        ).rows,
      ).toHaveLength(0);
    },
  );

  it("rejects stale versions after another edit", async () => {
    await db.query("update budget_requests set title_th='เปลี่ยนชื่อระหว่างเปิดเมนู' where id=$1", [
      ids.budget,
    ]);
    expect(
      (await asUser(db, ids.admin, () => db.query(archiveSql, [ids.budget, 1]))).rows,
    ).toHaveLength(0);
  });

  it("rejects a locked draft", async () => {
    const changed = await db.query<{ version: number }>(
      "update budget_requests set locked_at=now() where id=$1 returning version",
      [ids.budget],
    );
    expect(
      (
        await asUser(db, ids.admin, () =>
          db.query(archiveSql, [ids.budget, changed.rows[0].version]),
        )
      ).rows,
    ).toHaveLength(0);
  });
});
