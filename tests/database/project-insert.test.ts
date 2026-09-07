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

const newProjectId = "50000000-0000-4000-8000-000000000004";
function insertProject(caller: string, input: { owner?: string; createdBy?: string } = {}) {
  return asUser(db, caller, () =>
    db.query<{ id: string; code: string; version: number }>(
      `insert into projects (id,code,title_th,fiscal_year_id,organization_id,owner_id,
      coordinator_id,owner_name,coordinator_name,project_type,approved_budget,
      starts_on,ends_on,created_by)
     values ($1,'TEST-NEW','New project proposal',$2,$3,$4,$4,'Test owner',
      'Test coordinator','Test project',1000,'2026-10-01','2027-09-30',$5)
     returning id,code,version`,
      [newProjectId, ids.year, ids.org, input.owner ?? caller, input.createdBy ?? caller],
    ),
  );
}
function readProject(caller: string, id = newProjectId) {
  return asUser(db, caller, () => db.query("select id from project_register where id=$1", [id]));
}

describe("project INSERT RETURNING regression", () => {
  test.each([
    ["staff", ids.staff],
    ["user", ids.user],
    ["admin", ids.admin],
  ] as const)(
    "%s creates a proposal and immediately receives its ID/code/version",
    async (_role, caller) => {
      expect((await insertProject(caller)).rows).toEqual([
        { id: newProjectId, code: "TEST-NEW", version: 1 },
      ]);
      expect((await readProject(caller)).rows).toEqual([{ id: newProjectId }]);
    },
  );

  test.each([ids.user, ids.admin])(
    "authorized manager %s can assign another owner on creation",
    async (caller) => {
      expect((await insertProject(caller, { owner: ids.staff })).rows).toHaveLength(1);
      expect((await readProject(ids.staff)).rows).toHaveLength(1);
      expect((await readProject(ids.otherStaff)).rows).toHaveLength(0);
    },
  );

  test.each([
    ["executive cannot create", ids.executive, {}],
    ["outside staff cannot create in this unit", ids.outside, {}],
    ["inactive account cannot create", ids.inactive, {}],
    ["staff cannot forge an owner", ids.staff, { owner: ids.otherStaff }],
    ["staff cannot forge created_by", ids.staff, { createdBy: ids.otherStaff }],
  ] as const)("%s", async (_reason, caller, input) => {
    await expect(insertProject(caller, input)).rejects.toMatchObject({ code: "42501" });
    expect(
      (await db.query("select id from projects where id=$1", [newProjectId])).rows,
    ).toHaveLength(0);
  });

  test("expired role or expired organization scope cannot insert", async () => {
    await db.query(
      "update user_roles set active_until=now()-interval '1 second' where profile_id=$1",
      [ids.staff],
    );
    await expect(insertProject(ids.staff)).rejects.toMatchObject({ code: "42501" });
    await db.query("update user_roles set active_until=null where profile_id=$1", [ids.staff]);
    await db.query(
      "update user_organization_scopes set active_until=now()-interval '1 second' where profile_id=$1",
      [ids.staff],
    );
    await expect(insertProject(ids.staff)).rejects.toMatchObject({ code: "42501" });
  });

  test("a new proposal is not visible to unrelated staff, other units, or inactive users", async () => {
    await insertProject(ids.staff);
    for (const caller of [ids.otherStaff, ids.outside, ids.inactive]) {
      expect((await readProject(caller)).rows).toHaveLength(0);
    }
  });
});

describe("existing project access remains unchanged", () => {
  test("a coordinator can still read without becoming the owner", async () => {
    await db.query("update projects set coordinator_id=$1 where id=$2", [
      ids.otherStaff,
      ids.project,
    ]);
    expect((await readProject(ids.otherStaff, ids.project)).rows).toHaveLength(1);
  });
  test("assigned project members retain access, and lose it when membership is removed", async () => {
    await db.query(
      "insert into project_members (project_id,profile_id,member_role) values ($1,$2,'member')",
      [ids.project, ids.otherStaff],
    );
    expect((await readProject(ids.otherStaff, ids.project)).rows).toHaveLength(1);
    await db.query("delete from project_members where project_id=$1 and profile_id=$2", [
      ids.project,
      ids.otherStaff,
    ]);
    expect((await readProject(ids.otherStaff, ids.project)).rows).toHaveLength(0);
  });
  test("inactive owners and coordinators do not gain access through direct row checks", async () => {
    await db.query("update projects set owner_id=$1,coordinator_id=$1 where id=$2", [
      ids.inactive,
      ids.project,
    ]);
    expect((await readProject(ids.inactive, ids.project)).rows).toHaveLength(0);
  });
  test("RLS stays enabled on the projects table", async () => {
    expect(
      (await db.query("select relrowsecurity from pg_class where oid='public.projects'::regclass"))
        .rows,
    ).toEqual([{ relrowsecurity: true }]);
  });
});
