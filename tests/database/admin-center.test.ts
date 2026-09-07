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

describe("administrator center", () => {
  test("only an administrator can update system settings", async () => {
    const blocked = await asUser(db, ids.staff, () =>
      db.query("update system_settings set default_quarter=3 returning default_quarter"),
    );
    expect(blocked.rows).toHaveLength(0);

    const updated = await asUser(db, ids.admin, () =>
      db.query<{ default_quarter: number }>(
        "update system_settings set default_quarter=3,updated_by=$1 returning default_quarter",
        [ids.admin],
      ),
    );
    expect(updated.rows).toEqual([{ default_quarter: 3 }]);
  });

  test("an administrator can restore an archived project with an audit record", async () => {
    await asUser(db, ids.admin, () =>
      db.query("update projects set archived_at=now() where id=$1", [ids.project]),
    );
    await expect(
      asUser(db, ids.staff, () =>
        db.query("select admin_restore_record('project',$1)", [ids.project]),
      ),
    ).rejects.toMatchObject({ code: "42501" });

    const restored = await asUser(db, ids.admin, () =>
      db.query<{ admin_restore_record: boolean }>("select admin_restore_record('project',$1)", [
        ids.project,
      ]),
    );
    expect(restored.rows).toEqual([{ admin_restore_record: true }]);
    expect(
      (await db.query("select archived_at from projects where id=$1", [ids.project])).rows,
    ).toEqual([{ archived_at: null }]);
    expect(
      (
        await db.query("select action from audit_events where entity_id=$1 and action='restore'", [
          ids.project,
        ])
      ).rows,
    ).toHaveLength(1);
  });

  test("the approved university email is assigned the administrator role", async () => {
    const profileId = "10000000-0000-4000-8000-000000000099";
    await db.query(
      "insert into auth.users (id,email,raw_user_meta_data) values ($1,'titikornrasmi.s@ubu.ac.th','{\"full_name\":\"Admin UBU\"}'::jsonb)",
      [profileId],
    );
    expect(
      (await db.query("select role from user_roles where profile_id=$1", [profileId])).rows,
    ).toEqual([{ role: "admin" }]);
  });

  test("changing an existing email does not silently restore removed administrator access", async () => {
    const profileId = "10000000-0000-4000-8000-000000000098";
    await db.query(
      "insert into auth.users (id,email,raw_user_meta_data) values ($1,'titikornrasmi.s@ubu.ac.th','{}'::jsonb)",
      [profileId],
    );
    await db.query("delete from user_roles where profile_id=$1", [profileId]);
    await db.query("update profiles set is_active=false,email='disabled@ubu.ac.th' where id=$1", [
      profileId,
    ]);
    await db.query("update profiles set email='titikornrasmi.s@ubu.ac.th' where id=$1", [
      profileId,
    ]);
    expect(
      (await db.query("select role from user_roles where profile_id=$1", [profileId])).rows,
    ).toHaveLength(0);
    expect(
      (await db.query("select is_active from profiles where id=$1", [profileId])).rows,
    ).toEqual([{ is_active: false }]);
  });

  test("organization references cannot create a hierarchy cycle", async () => {
    const childId = "20000000-0000-4000-8000-000000000099";
    await asUser(db, ids.admin, () =>
      db.query(
        "insert into organizations (id,code,name_th,organization_type,parent_id) values ($1,'CHILD','Child','department',$2)",
        [childId, ids.org],
      ),
    );
    await expect(
      asUser(db, ids.admin, () =>
        db.query("update organizations set parent_id=$1 where id=$2", [childId, ids.org]),
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  test("data quality counts all active users in the database", async () => {
    const profileId = "10000000-0000-4000-8000-000000000097";
    await db.query(
      "insert into auth.users (id,email,raw_user_meta_data) values ($1,'quality-check@example.test','{}'::jsonb)",
      [profileId],
    );
    await expect(
      asUser(db, ids.staff, () => db.query("select * from admin_user_access_quality()")),
    ).rejects.toMatchObject({ code: "42501" });
    const quality = await asUser(db, ids.admin, () =>
      db.query<{ users_without_roles: number; users_without_scopes: number }>(
        "select users_without_roles,users_without_scopes from admin_user_access_quality()",
      ),
    );
    expect(Number(quality.rows[0].users_without_roles)).toBeGreaterThanOrEqual(1);
    expect(Number(quality.rows[0].users_without_scopes)).toBeGreaterThanOrEqual(1);
  });
});
