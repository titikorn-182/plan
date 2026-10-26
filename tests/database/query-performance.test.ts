import type { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { asUser, createTestDatabase, ids } from "./harness";

interface PlanNode {
  "Index Name"?: string;
  "Shared Hit Blocks": number;
  "Shared Read Blocks": number;
  Plans?: PlanNode[];
}

let db: PGlite;
const syntheticProjects = 1_200;

beforeAll(async () => {
  db = await createTestDatabase();
  // Bounded data in the disposable database only. Distinct updated_at values
  // make the page comparison deterministic without changing production sorting.
  await db.query(
    `insert into public.projects (
      code, title_th, fiscal_year_id, organization_id, owner_id,
      owner_name, coordinator_name, project_type, updated_at
    )
    select 'PERF-P' || n, 'Performance fixture ' || n, $1, $2, $3,
      'Test staff', 'Test coordinator', 'Test', now() + n * interval '1 second'
    from generate_series(1, $4::integer) n`,
    [ids.year, ids.org, ids.staff, syntheticProjects],
  );
  await db.query(
    `insert into public.approval_tasks (organization_id, entity_type, entity_id, status)
    select $1, 'project', gen_random_uuid(),
      case when n % 10 = 0 then 'pending' else 'approved' end
    from generate_series(1, 6000) n`,
    [ids.org],
  );
  await db.exec("analyze public.projects; analyze public.approval_tasks;");
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

async function explain(sql: string, params: string[] = []) {
  const result = await db.query<{ "QUERY PLAN": { Plan: PlanNode }[] }>(
    `explain (analyze, buffers, format json) ${sql}`,
    params,
  );
  return result.rows[0]["QUERY PLAN"][0].Plan;
}

function indexNames(plan: PlanNode): string[] {
  return [
    ...(plan["Index Name"] ? [plan["Index Name"]] : []),
    ...(plan.Plans ?? []).flatMap(indexNames),
  ];
}

function sharedBlocks(plan: PlanNode) {
  return plan["Shared Hit Blocks"] + plan["Shared Read Blocks"];
}

async function withoutHotPathIndexes<T>(run: () => Promise<T>) {
  await db.exec(`savepoint without_hot_path_indexes;
    drop index public.approval_tasks_pending_entity_idx;
    drop index public.projects_active_year_updated_idx;`);
  try {
    return await run();
  } finally {
    await db.exec("rollback to savepoint without_hot_path_indexes");
    await db.exec("release savepoint without_hot_path_indexes");
  }
}

describe("bounded query plan regressions", () => {
  test("pending-task lookup stops scanning other entities' pending tasks", async () => {
    // Include history for the target. An absent target is already cheap through
    // the project-history index, so comparing two empty lookups proves nothing.
    await db.query(
      `insert into public.approval_tasks (organization_id, entity_type, entity_id, status)
       select $1, 'project', $2, 'approved' from generate_series(1, 2000)`,
      [ids.org, ids.project],
    );
    await db.query(
      `insert into public.approval_tasks (organization_id, entity_type, entity_id, status)
       values ($1, 'project', $2, 'pending')`,
      [ids.org, ids.project],
    );
    await db.exec("analyze public.approval_tasks");
    const query = `select 1 from public.approval_tasks
      where entity_type = 'project' and entity_id = $1 and status = 'pending'`;
    // The helper is SECURITY DEFINER, so inspect its inner query with the same
    // table-owner visibility rather than measuring unrelated task RLS costs.
    const baseline = await withoutHotPathIndexes(() => explain(query, [ids.project]));
    const indexed = await explain(query, [ids.project]);

    expect(indexNames(indexed)).toContain("approval_tasks_pending_entity_idx");
    expect(sharedBlocks(indexed)).toBeLessThan(sharedBlocks(baseline));
  });

  test("fiscal-year pagination reads fewer blocks and returns the same projects", async () => {
    const query = `select id, has_pending_approval from public.project_register
      where fiscal_year_id = $1 order by updated_at desc limit 25`;
    const inspect = () =>
      asUser(db, ids.admin, async () => ({
        plan: await explain(query, [ids.year]),
        rows: (await db.query(query, [ids.year])).rows,
      }));
    const baseline = await withoutHotPathIndexes(inspect);
    const indexed = await inspect();

    expect(indexNames(indexed.plan)).toContain("projects_active_year_updated_idx");
    expect(sharedBlocks(indexed.plan)).toBeLessThan(sharedBlocks(baseline.plan));
    expect(indexed.rows).toHaveLength(25);
    expect(indexed.rows).toEqual(baseline.rows);
  });

  test.each([
    ["admin", ids.admin, syntheticProjects + 3],
    ["user", ids.user, syntheticProjects + 2],
    ["executive", ids.executive, syntheticProjects + 2],
    ["staff", ids.staff, syntheticProjects + 1],
    ["other staff", ids.otherStaff, 1],
    ["outside staff", ids.outside, 1],
    ["inactive account", ids.inactive, 0],
  ])("indexes preserve all project visibility for %s", async (_role, userId, count) => {
    const visibleProjects = () =>
      asUser(
        db,
        userId as string,
        async () => (await db.query("select id from public.project_register order by id")).rows,
      );
    const baseline = await withoutHotPathIndexes(visibleProjects);
    const indexed = await visibleProjects();

    expect(indexed).toHaveLength(count as number);
    expect(indexed).toEqual(baseline);
  });

  test("pending-task state remains correct when a task leaves the partial index", async () => {
    const task = await db.query<{ id: string }>(
      `insert into public.approval_tasks (organization_id, entity_type, entity_id)
      values ($1, 'project', $2) returning id`,
      [ids.org, ids.project],
    );
    const pending = () =>
      asUser(
        db,
        ids.staff,
        async () =>
          (
            await db.query<{ has_pending_approval: boolean }>(
              "select has_pending_approval from public.project_register where id = $1",
              [ids.project],
            )
          ).rows[0].has_pending_approval,
      );

    expect(await pending()).toBe(true);
    await db.query("update public.approval_tasks set status = 'approved' where id = $1", [
      task.rows[0].id,
    ]);
    expect(await pending()).toBe(false);
  });
});
