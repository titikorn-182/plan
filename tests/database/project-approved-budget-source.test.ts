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

async function approveSource() {
  await db.query(
    "update public.budget_requests set status = 'approved', locked_at = now() where id = $1",
    [ids.budget],
  );
}

async function saveWithSource(
  options: {
    budgetId?: string | null;
    userId?: string;
    organizationId?: string;
    fiscalYearId?: string;
    projectId?: string;
    version?: number;
  } = {},
) {
  return asUser(db, options.userId ?? ids.staff, () =>
    db.query<{ saved: { id: string; version: number } }>(
      `select public.save_project_transaction(
      $1, $2, $3, $4, $5, 'Test staff', 'Test coordinator',
      'Project from approved budget', 'Test', 1000, 25,
      '2026-10-01', '2027-09-30', '{}'::jsonb, false
    ) as saved`,
      [
        options.projectId ?? null,
        options.version ?? 1,
        options.organizationId ?? ids.org,
        options.fiscalYearId ?? ids.year,
        options.budgetId === undefined ? ids.budget : options.budgetId,
      ],
    ),
  );
}

describe("project approved budget source integrity", () => {
  test("allows a staff member to link an accessible approved locked source", async () => {
    await approveSource();
    const result = await saveWithSource();
    expect(result.rows[0].saved.id).toBeTruthy();
    const { rows } = await db.query("select budget_request_id from public.projects where id = $1", [
      result.rows[0].saved.id,
    ]);
    expect(rows[0]).toEqual({ budget_request_id: ids.budget });
  });

  test.each([
    "draft",
    "submitted",
    "under_review",
    "pending_approval",
    "rejected",
    "revision_required",
    "cancelled",
  ])("rejects a %s source via direct save RPC", async (status) => {
    await db.query("update public.budget_requests set status = $1 where id = $2", [
      status,
      ids.budget,
    ]);
    await expect(saveWithSource()).rejects.toMatchObject({ code: "PT409" });
  });

  test("rejects an archived source even when approved", async () => {
    await approveSource();
    await db.query("update public.budget_requests set archived_at = now() where id = $1", [
      ids.budget,
    ]);
    await expect(saveWithSource()).rejects.toMatchObject({ code: "PT409" });
  });

  test("rejects a source from another organization", async () => {
    await approveSource();
    await expect(
      saveWithSource({ organizationId: "20000000-0000-4000-8000-000000000002" }),
    ).rejects.toMatchObject({ code: "PT409" });
  });

  test("rejects a source from another fiscal year", async () => {
    await approveSource();
    await expect(
      saveWithSource({ fiscalYearId: "30000000-0000-4000-8000-000000000002" }),
    ).rejects.toMatchObject({ code: "PT409" });
  });

  test.each([ids.outside, ids.inactive])(
    "does not let %s bypass source visibility via RPC",
    async (userId) => {
      await approveSource();
      await expect(saveWithSource({ userId })).rejects.toMatchObject({ code: "PT409" });
    },
  );

  test("preserves unlinked legacy proposals", async () => {
    expect((await saveWithSource({ budgetId: null })).rows[0].saved.id).toBeTruthy();
  });

  test("allows editing an unchanged historical link after its source is archived", async () => {
    await approveSource();
    const first = (await saveWithSource()).rows[0].saved;
    await db.query("update public.budget_requests set archived_at = now() where id = $1", [
      ids.budget,
    ]);
    const second = (await saveWithSource({ projectId: first.id, version: first.version })).rows[0]
      .saved;
    expect(second.version).toBe(first.version + 1);
  });

  test("rechecks an existing project's changed reference fields", async () => {
    await approveSource();
    await expect(
      saveWithSource({
        projectId: ids.project,
        fiscalYearId: "30000000-0000-4000-8000-000000000002",
      }),
    ).rejects.toMatchObject({ code: "PT409" });
  });

  test("uses a shared row lock and does not grant direct helper execution", async () => {
    const { rows } = await db.query<{ definition: string; can_execute: boolean }>(`select
      pg_get_functiondef('private.validate_project_approved_budget_source()'::regprocedure) as definition,
      has_function_privilege('authenticated', 'private.validate_project_approved_budget_source()', 'execute') as can_execute`);
    expect(rows[0].definition).toContain("FOR SHARE".toLowerCase());
    expect(rows[0].definition).not.toContain("40001");
    expect(rows[0].can_execute).toBe(false);
  });
});
