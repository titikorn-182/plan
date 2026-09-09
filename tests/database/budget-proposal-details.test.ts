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

describe("budget proposal details storage", () => {
  test("gives legacy records an empty object and stores structured details", async () => {
    const original = await db.query(
      "select proposal_details from public.budget_requests where id = $1",
      [ids.budget],
    );
    expect(original.rows).toEqual([{ proposal_details: {} }]);

    const details = { missionName: "พันธกิจด้านบริการวิชาการ", sdgs: [] };
    const saved = await asUser(db, ids.staff, () =>
      db.query(
        "update public.budget_requests set proposal_details = $1::jsonb where id = $2 returning proposal_details",
        [JSON.stringify(details), ids.budget],
      ),
    );
    expect(saved.rows).toEqual([{ proposal_details: details }]);
  });

  test.each([null, [], "invalid"])("rejects non-object details: %j", async (invalid) => {
    await expect(
      asUser(db, ids.staff, () =>
        db.query("update public.budget_requests set proposal_details = $1::jsonb where id = $2", [
          JSON.stringify(invalid),
          ids.budget,
        ]),
      ),
    ).rejects.toMatchObject({ code: expect.stringMatching(/23502|23514/) });
  });
});
