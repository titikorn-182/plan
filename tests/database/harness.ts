import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

export const ids = {
  admin: "10000000-0000-4000-8000-000000000001",
  user: "10000000-0000-4000-8000-000000000002",
  executive: "10000000-0000-4000-8000-000000000003",
  staff: "10000000-0000-4000-8000-000000000004",
  otherStaff: "10000000-0000-4000-8000-000000000005",
  outside: "10000000-0000-4000-8000-000000000006",
  inactive: "10000000-0000-4000-8000-000000000007",
  org: "20000000-0000-4000-8000-000000000001",
  year: "30000000-0000-4000-8000-000000000001",
  project: "50000000-0000-4000-8000-000000000001",
  budget: "60000000-0000-4000-8000-000000000001",
  kpi: "80000000-0000-4000-8000-000000000001",
} as const;

export async function createTestDatabase() {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(await readFile("tests/database/bootstrap.sql", "utf8"));
  const migrations = (await readdir("supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const migration of migrations) {
    await db.exec(await readFile(`supabase/migrations/${migration}`, "utf8"));
  }
  await db.exec(await readFile("tests/database/fixtures.sql", "utf8"));
  return db;
}

export async function asUser<T>(db: PGlite, id: string, run: () => Promise<T>): Promise<T> {
  await db.exec("savepoint user_operation");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
  await db.exec("set role authenticated");
  try {
    return await run();
  } catch (error) {
    await db.exec("rollback to savepoint user_operation");
    throw error;
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await db.exec("release savepoint user_operation");
  }
}
