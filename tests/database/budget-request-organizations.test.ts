import { readFile } from "node:fs/promises";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { BUDGET_REQUEST_ORGANIZATIONS } from "@/features/budget-requests/organization-options";
import { createTestDatabase } from "./harness";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDatabase();
});

afterAll(async () => {
  await db?.close();
});

async function getConfiguredOrganizations() {
  const codes = BUDGET_REQUEST_ORGANIZATIONS.map(({ code }) => code);
  return db.query<{ code: string; name_th: string; is_active: boolean }>(
    "select code,name_th,is_active from organizations where code = any($1::text[])",
    [codes],
  );
}

describe("budget request organization migration", () => {
  test("creates all 15 active organizations from the supplied list", async () => {
    const organizations = await getConfiguredOrganizations();
    expect(organizations.rows).toHaveLength(BUDGET_REQUEST_ORGANIZATIONS.length);
    expect(organizations.rows.every(({ is_active }) => is_active)).toBe(true);
    expect(new Set(organizations.rows.map(({ name_th }) => name_th))).toEqual(
      new Set(BUDGET_REQUEST_ORGANIZATIONS.map(({ name }) => name)),
    );
  });

  test("can run repeatedly without creating duplicate organizations", async () => {
    const migration = await readFile(
      "supabase/migrations/202609080001_budget_request_organizations.sql",
      "utf8",
    );
    await db.exec(migration);
    expect((await getConfiguredOrganizations()).rows).toHaveLength(
      BUDGET_REQUEST_ORGANIZATIONS.length,
    );
  });
});
