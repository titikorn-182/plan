import { readFile } from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { asUser, createTestDatabase, ids } from "./harness";

const rpcSignatures = [
  "public.save_budget_request_transaction(uuid,integer,uuid,uuid,uuid,text,text,text,text,text,numeric,jsonb,jsonb,boolean,text)",
  "public.save_project_transaction(uuid,integer,uuid,uuid,uuid,text,text,text,text,numeric,numeric,date,date,jsonb,boolean,text)",
];

let db: PGlite;
let migration: string;
beforeAll(async () => {
  db = await createTestDatabase();
  // The test owns its rollback transaction; retain the exact migration body.
  migration = (
    await readFile("supabase/migrations/202609230002_non_retryable_business_conflicts.sql", "utf8")
  )
    .replace(/^begin;\s*/, "")
    .replace(/\s*commit;\s*$/, "");
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

async function saveBudget(version: number, userId: string = ids.staff) {
  return asUser(db, userId, () =>
    db.query(
      `select public.save_budget_request_transaction(
        $1, $2, $3, $4, $5, 'Test staff', 'Changed budget',
        'Test', 'Test', 'A complete test rationale for the budget',
        1000, null, '{}'::jsonb, true, 'Submit after save'
      )`,
      [ids.budget, version, ids.year, "40000000-0000-4000-8000-000000000001", ids.org],
    ),
  );
}

async function saveProject(version: number, userId: string = ids.staff) {
  return asUser(db, userId, () =>
    db.query(
      `select public.save_project_transaction(
        $1, $2, $3, $4, null, 'Test staff', 'Test coordinator',
        'Changed project', 'Test', 1000, 25,
        '2026-10-01', '2027-09-30', '{}'::jsonb, true, 'Submit after save'
      )`,
      [ids.project, version, ids.org, ids.year],
    ),
  );
}

async function businessSnapshot() {
  return (
    await db.query(`select
      (select to_jsonb(b) from public.budget_requests b where id = '${ids.budget}') as budget,
      (select to_jsonb(p) from public.projects p where id = '${ids.project}') as project,
      (select count(*) from public.approval_tasks) as tasks,
      (select count(*) from public.audit_events) as audit_events,
      (select count(*) from public.notifications) as notifications`)
  ).rows;
}

describe("business conflicts do not request transaction retries", () => {
  test("no application function explicitly raises the retryable serialization code", async () => {
    const { rows } = await db.query(`select function.oid::regprocedure::text as signature
      from pg_proc function
      join pg_namespace schema on schema.oid = function.pronamespace
      where schema.nspname in ('public', 'private')
        and function.prokind = 'f'
        and function.prosrc ~* $pattern$(errcode[[:space:]]*=[[:space:]]*|sqlstate[[:space:]]*)'40001'$pattern$`);
    expect(rows).toEqual([]);
  });

  test.each([
    ["budget", saveBudget],
    ["project", saveProject],
  ] as const)(
    "stale %s versions return PT409 without changing data or submitting",
    async (_kind, save) => {
      const before = await businessSnapshot();
      await expect(save(0)).rejects.toMatchObject({ code: "PT409" });
      expect(await businessSnapshot()).toEqual(before);
    },
  );

  test("a noneditable budget returns PT409 and remains approved", async () => {
    await db.query("update public.budget_requests set status = 'approved' where id = $1", [
      ids.budget,
    ]);
    const before = await businessSnapshot();
    await expect(saveBudget(2)).rejects.toMatchObject({ code: "PT409" });
    expect(await businessSnapshot()).toEqual(before);
  });

  test("a project with a pending approval returns PT409 without creating another task", async () => {
    await asUser(db, ids.staff, () =>
      db.query("select public.submit_entity_for_approval('project', $1)", [ids.project]),
    );
    const before = await businessSnapshot();
    await expect(saveProject(1)).rejects.toMatchObject({ code: "PT409" });
    expect(await businessSnapshot()).toEqual(before);
  });

  test("the conflict change preserves the owner access guard", async () => {
    const before = await businessSnapshot();
    await expect(saveBudget(1, ids.otherStaff)).rejects.toMatchObject({ code: "PT409" });
    await expect(saveProject(1, ids.otherStaff)).rejects.toMatchObject({ code: "PT409" });
    expect(await businessSnapshot()).toEqual(before);
  });

  test("the migration preserves current function bodies and privileges and is repeatable", async () => {
    const definitions: string[] = [];
    for (const signature of rpcSignatures) {
      const { rows } = await db.query<{ definition: string }>(
        "select pg_get_functiondef($1::regprocedure) as definition",
        [signature],
      );
      const original = rows[0].definition.replace(
        "errcode = 'PT409'",
        "errcode = '40001' /* keep existing deployed customization */",
      );
      expect(original).toContain("errcode = '40001'");
      await db.exec(original);
      definitions.push(original.replace("errcode = '40001'", "errcode = 'PT409'"));
    }
    const privileges = () =>
      db.query(
        `select oid, prosecdef, proconfig, proacl::text
        from pg_proc where oid = any($1::regprocedure[]) order by oid`,
        [rpcSignatures],
      );
    const before = (await privileges()).rows;
    await db.exec(`create function private.unrelated_serialization_failure()
      returns void language plpgsql as $$
      begin raise exception 'not an application business conflict' using errcode = '40001'; end;
      $$;`);

    await db.exec(migration);
    await db.exec(migration);

    expect((await privileges()).rows).toEqual(before);
    for (const [index, signature] of rpcSignatures.entries()) {
      const { rows } = await db.query<{ definition: string }>(
        "select pg_get_functiondef($1::regprocedure) as definition",
        [signature],
      );
      expect(rows[0].definition).toBe(definitions[index]);
    }
    expect(
      (
        await db.query<{ definition: string }>(
          "select pg_get_functiondef('private.unrelated_serialization_failure()'::regprocedure) as definition",
        )
      ).rows[0].definition,
    ).toContain("errcode = '40001'");
  });
});
