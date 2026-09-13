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

describe("project proposal details storage", () => {
  test("gives legacy projects an empty object and stores structured details", async () => {
    const original = await db.query("select proposal_details from public.projects where id = $1", [
      ids.project,
    ]);
    expect(original.rows).toEqual([{ proposal_details: {} }]);

    const details = { rationale: "เหตุผลของโครงการ", strategies: ["กลยุทธ์ที่ 1"] };
    const saved = await asUser(db, ids.staff, () =>
      db.query(
        "update public.projects set proposal_details = $1::jsonb where id = $2 returning proposal_details",
        [JSON.stringify(details), ids.project],
      ),
    );
    expect(saved.rows).toEqual([{ proposal_details: details }]);
  });

  test.each([null, [], "invalid"])("rejects non-object details: %j", async (invalid) => {
    await expect(
      asUser(db, ids.staff, () =>
        db.query("update public.projects set proposal_details = $1::jsonb where id = $2", [
          JSON.stringify(invalid),
          ids.project,
        ]),
      ),
    ).rejects.toMatchObject({ code: expect.stringMatching(/23502|23514/) });
  });
});
