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

async function approve() {
  await db.query(
    "update budget_requests set status='approved', submitted_at=now(),locked_at=now() where id=$1",
    [ids.budget],
  );
}
async function amend(actor: string, amount: number, version = 2, reason = "ปรับตามมติที่ประชุม") {
  return asUser(db, actor, () =>
    db.query(
      `select public.amend_approved_budget_request(
    id,$2,'แก้ไขรายละเอียดที่อนุมัติ',owner_name,project_type,category,rationale,proposal_details,$3,$4) as result
    from budget_requests where id=$1`,
      [ids.budget, version, amount, reason],
    ),
  );
}

describe("budget request role and approved amendment policy", () => {
  it.each(["draft", "revision_required"])(
    "staff edits their own %s but admin cannot",
    async (status) => {
      await db.query("update budget_requests set status=$2::document_status where id=$1", [
        ids.budget,
        status,
      ]);
      await expect(
        asUser(db, ids.admin, () =>
          db.query("update budget_requests set title_th='admin edit' where id=$1", [ids.budget]),
        ),
      ).rejects.toThrow(/admin may edit approved/);
      const saved = await asUser(db, ids.staff, () =>
        db.query(
          "update budget_requests set title_th='staff edit',status='draft' where id=$1 returning id",
          [ids.budget],
        ),
      );
      expect(saved.rows).toHaveLength(1);
    },
  );
  it.each([
    "submitted",
    "under_review",
    "pending_approval",
    "approved",
    "rejected",
    "withdrawn",
    "cancelled",
  ])("staff cannot edit %s", async (status) => {
    await db.query("update budget_requests set status=$2::document_status where id=$1", [
      ids.budget,
      status,
    ]);
    try {
      const result = await asUser(db, ids.staff, () =>
        db.query("update budget_requests set title_th='forbidden' where id=$1 returning id", [
          ids.budget,
        ]),
      );
      expect(result.rows).toHaveLength(0);
    } catch (error) {
      expect(String(error)).toMatch(/denied|policy|transition/);
    }
    expect(
      (await db.query("select title_th from budget_requests where id=$1", [ids.budget])).rows[0],
    ).not.toEqual({ title_th: "forbidden" });
  });
  it.each([0, 700.25, 1500.5])(
    "admin can amend to %s without changing requested amount, status, tasks or projects",
    async (amount) => {
      await approve();
      const before = (
        await db.query(
          "select requested_amount,status,submitted_at,locked_at from budget_requests where id=$1",
          [ids.budget],
        )
      ).rows;
      const projects = (await db.query("select * from projects order by id")).rows;
      const tasks = (await db.query("select * from approval_tasks order by id")).rows;
      await amend(ids.admin, amount);
      expect(
        (
          await db.query(
            "select requested_amount,status,submitted_at,locked_at from budget_requests where id=$1",
            [ids.budget],
          )
        ).rows,
      ).toEqual(before);
      expect((await db.query("select * from projects order by id")).rows).toEqual(projects);
      expect((await db.query("select * from approval_tasks order by id")).rows).toEqual(tasks);
      const row = (
        await db.query<{ approved_amount: string; version: number }>(
          "select approved_amount,version from budget_requests where id=$1",
          [ids.budget],
        )
      ).rows[0];
      expect(Number(row.approved_amount)).toBe(amount);
      expect(row.version).toBe(3);
      const audit = await db.query(
        "select id from audit_events where entity_id=$1 and action='update'",
        [ids.budget],
      );
      expect(audit.rows.length).toBeGreaterThan(0);
      const amendmentAudit = await db.query<{
        actor_id: string;
        reason: string;
        new_amount: number;
        old_amount: number | null;
      }>(
        "select actor_id,reason,new_data->'approved_amount' as new_amount,old_data->'approved_amount' as old_amount from audit_events where entity_id=$1 and actor_id=$2 order by id desc limit 1",
        [ids.budget, ids.admin],
      );
      expect(amendmentAudit.rows[0]).toEqual({
        actor_id: ids.admin,
        reason: "ปรับตามมติที่ประชุม",
        new_amount: amount,
        old_amount: null,
      });
    },
  );
  it("rejects a stale version and blank reason atomically", async () => {
    await approve();
    await expect(amend(ids.admin, 1200, 1)).rejects.toThrow(/changed/);
    await expect(amend(ids.admin, 1200, 2, " ")).rejects.toThrow(/reason required/);
    expect(
      (
        await db.query("select approved_amount,version from budget_requests where id=$1", [
          ids.budget,
        ])
      ).rows,
    ).toEqual([{ approved_amount: null, version: 2 }]);
  });
  it.each([-1, 0.001, 1000000000000])("rejects invalid amount %s", async (amount) => {
    await approve();
    await expect(amend(ids.admin, amount)).rejects.toThrow(/invalid approved amount/);
  });
  it.each([ids.staff, ids.user, ids.executive])(
    "rejects the approved RPC for non-admin %s",
    async (actor) => {
      await approve();
      await expect(amend(actor, 1200)).rejects.toThrow(/admin required/);
    },
  );
  it("protects original approved expenses against direct API updates", async () => {
    await approve();
    await expect(
      asUser(db, ids.admin, () =>
        db.query(
          "update budget_requests set requested_amount=1500, amendment_reason='reason' where id=$1",
          [ids.budget],
        ),
      ),
    ).rejects.toThrow(/immutable/);
    await expect(
      asUser(db, ids.admin, () =>
        db.query("update budget_requests set approved_amount=1500 where id=$1", [ids.budget]),
      ),
    ).rejects.toThrow(/reason required/);
  });
  it("does not allow staff to set an approved amount on a draft", async () => {
    await expect(
      asUser(db, ids.staff, () =>
        db.query("update budget_requests set approved_amount=1500 where id=$1", [ids.budget]),
      ),
    ).rejects.toThrow(/only admin/);
  });
});
