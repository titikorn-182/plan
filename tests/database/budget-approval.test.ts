import type { PGlite } from "@electric-sql/pglite";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { MONEY_LIMITS } from "@/lib/config/limits";
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

type Decision = "approved" | "revision_required" | "rejected";
type BudgetSnapshot = {
  id: string;
  status: string;
  version: number;
  requested_amount: string;
  approved_amount: string | null;
  proposal_details: unknown;
  is_locked: boolean;
};
type PendingTask = { id: string; required_role: string; assignee_id: string | null };

async function readBudget(): Promise<BudgetSnapshot> {
  const { rows } = await db.query<BudgetSnapshot>(
    `select id, status, version, requested_amount::text, approved_amount::text,
      proposal_details, locked_at is not null as is_locked
    from public.budget_requests where id = $1`,
    [ids.budget],
  );
  expect(rows).toHaveLength(1);
  return rows[0];
}

async function pendingTask(entityId: string = ids.budget): Promise<PendingTask> {
  const { rows } = await db.query<PendingTask>(
    `select id, required_role, assignee_id from public.approval_tasks
      where entity_id = $1 and status = 'pending'`,
    [entityId],
  );
  expect(rows).toHaveLength(1);
  return rows[0];
}

async function actOnBudget(
  actor: string,
  task: PendingTask,
  version: number | null,
  amount: string | number | null = null,
  decision: Decision = "approved",
  comment: string | null = null,
) {
  return asUser(db, actor, () =>
    db.query<{ result: boolean }>(
      "select public.act_on_approval_task($1, $2, $3, $4, $5::numeric) as result",
      [task.id, decision, comment, version, amount],
    ),
  );
}

async function submitBudget() {
  await asUser(db, ids.staff, () =>
    db.query("select public.submit_budget_request_for_approval($1)", [ids.budget]),
  );
  const task = await pendingTask();
  expect(task.required_role).toBe("user");
  return task;
}

async function readyForFinalApproval() {
  const reviewTask = await submitBudget();
  await actOnBudget(ids.user, reviewTask, (await readBudget()).version);
  const task = await pendingTask();
  expect(task.required_role).toBe("executive");
  expect((await readBudget()).status).toBe("pending_approval");
  return task;
}

async function workflowCounts() {
  const { rows } = await db.query<{
    tasks: number;
    comments: number;
    notifications: number;
    audit_events: number;
  }>(`select
    (select count(*)::integer from public.approval_tasks) as tasks,
    (select count(*)::integer from public.comments) as comments,
    (select count(*)::integer from public.notifications) as notifications,
    (select count(*)::integer from public.audit_events) as audit_events`);
  return rows[0];
}

describe("budget approval amounts and atomic workflow", () => {
  test.each([
    ["executive decrease", ids.executive, "750.25"],
    ["executive increase", ids.executive, "1250.50"],
    ["admin decrease", ids.admin, "500.00"],
    ["admin increase", ids.admin, "1500.00"],
    ["zero allocation", ids.executive, "0.00"],
    ["maximum allocation", ids.admin, `${MONEY_LIMITS.maximumBaht}.00`],
  ])("%s preserves the original request and proposal", async (_label, actor, amount) => {
    const details = {
      objectives: "รายละเอียดต้นฉบับต้องไม่ถูกแทนที่ด้วยวงเงินอนุมัติ",
      sdgs: ["SDG 4 การศึกษาที่มีคุณภาพ"],
      expenseItems: [{ description: "รายการค่าใช้จ่ายต้นฉบับ", amount: 1000 }],
    };
    await asUser(db, ids.staff, () =>
      db.query("update public.budget_requests set proposal_details = $1::jsonb where id = $2", [
        JSON.stringify(details),
        ids.budget,
      ]),
    );
    const task = await readyForFinalApproval();
    const before = await readBudget();
    const reason = "ปรับวงเงินตามความเหมาะสมและผลการพิจารณา";

    expect(
      (await actOnBudget(actor, task, before.version, amount, "approved", reason)).rows,
    ).toEqual([{ result: true }]);
    expect(await readBudget()).toEqual({
      ...before,
      status: "approved",
      version: before.version + 1,
      approved_amount: amount,
      is_locked: true,
    });
    expect(
      (await db.query("select status, comment from public.approval_tasks where id = $1", [task.id]))
        .rows,
    ).toEqual([{ status: "approved", comment: reason }]);
    expect(
      (
        await db.query("select body, created_by from public.comments where entity_id = $1", [
          ids.budget,
        ])
      ).rows,
    ).toContainEqual({ body: reason, created_by: actor });
    expect(
      (
        await db.query(
          `select actor_id, old_data->>'requested_amount' as old_requested,
            new_data->>'requested_amount' as new_requested,
            old_data->>'approved_amount' as old_approved,
            new_data->>'approved_amount' as new_approved
          from public.audit_events
          where entity_type = 'budget_request' and entity_id = $1
            and action = 'update' and new_data->>'status' = 'approved'`,
          [ids.budget],
        )
      ).rows,
    ).toEqual([
      {
        actor_id: actor,
        old_requested: "1000.00",
        new_requested: "1000.00",
        old_approved: null,
        new_approved: amount,
      },
    ]);
  });

  test("approval without adjustment copies the requested total without requiring a reason", async () => {
    const task = await readyForFinalApproval();
    const before = await readBudget();
    await actOnBudget(ids.executive, task, before.version);
    expect(await readBudget()).toEqual({
      ...before,
      status: "approved",
      version: before.version + 1,
      approved_amount: "1000.00",
      is_locked: true,
    });
  });

  test.each<Decision>(["approved", "revision_required", "rejected"])(
    "%s budget decisions reject missing expected versions without side effects",
    async (decision) => {
      const task = await readyForFinalApproval();
      const before = await readBudget();
      const counts = await workflowCounts();
      await expect(
        actOnBudget(ids.executive, task, null, null, decision, "เหตุผลประกอบการตัดสินใจ"),
      ).rejects.toMatchObject({ code: "PT409" });
      expect(await readBudget()).toEqual(before);
      expect(await pendingTask()).toEqual(task);
      expect(await workflowCounts()).toEqual(counts);
    },
  );

  test("stale versions and replay cannot overwrite an allocation or create duplicate history", async () => {
    const task = await readyForFinalApproval();
    const before = await readBudget();
    const counts = await workflowCounts();
    await expect(
      actOnBudget(ids.executive, task, before.version - 1, 750, "approved", "ปรับลดวงเงิน"),
    ).rejects.toMatchObject({ code: "PT409" });
    expect(await readBudget()).toEqual(before);
    expect(await workflowCounts()).toEqual(counts);

    await actOnBudget(ids.executive, task, before.version, 750, "approved", "ปรับลดวงเงิน");
    const approved = await readBudget();
    const approvedCounts = await workflowCounts();
    await expect(
      actOnBudget(ids.admin, task, approved.version, 1500, "approved", "พยายามอนุมัติซ้ำ"),
    ).rejects.toMatchObject({ code: "23514" });
    expect(await readBudget()).toEqual(approved);
    expect(await workflowCounts()).toEqual(approvedCounts);
  });

  test.each(["-0.01", `${MONEY_LIMITS.maximumBaht + 1}`, "0.001", "NaN", "Infinity", "-Infinity"])(
    "rejects invalid approved amount %s without altering the pending task",
    async (amount) => {
      const task = await readyForFinalApproval();
      const before = await readBudget();
      const counts = await workflowCounts();
      await expect(
        actOnBudget(
          ids.executive,
          task,
          before.version,
          amount,
          "approved",
          "เหตุผลในการปรับวงเงิน",
        ),
      ).rejects.toMatchObject({ code: "23514" });
      expect(await readBudget()).toEqual(before);
      expect(await pendingTask()).toEqual(task);
      expect(await workflowCounts()).toEqual(counts);
    },
  );

  test.each([null, "", "    ", "abcd"])(
    "adjusted totals require a meaningful reason: %j",
    async (comment) => {
      const task = await readyForFinalApproval();
      const before = await readBudget();
      await expect(
        actOnBudget(ids.executive, task, before.version, 1250, "approved", comment),
      ).rejects.toMatchObject({ code: "23514" });
      expect(await readBudget()).toEqual(before);
      expect(await pendingTask()).toEqual(task);
    },
  );

  test.each<Decision>(["revision_required", "rejected"])(
    "%s cannot also allocate money",
    async (decision) => {
      const task = await readyForFinalApproval();
      const before = await readBudget();
      await expect(
        actOnBudget(ids.executive, task, before.version, 500, decision, "เหตุผลประกอบการพิจารณา"),
      ).rejects.toMatchObject({ code: "23514" });
      expect(await readBudget()).toEqual(before);
      expect(await pendingTask()).toEqual(task);
    },
  );

  test("audit failure rolls back the allocation, task decision, comment and notification together", async () => {
    const task = await readyForFinalApproval();
    const before = await readBudget();
    const counts = await workflowCounts();
    await db.exec(`create function private.test_fail_budget_amount_audit() returns trigger
      language plpgsql as $$ begin
        if new.entity_type = 'budget_request' and new.new_data->>'approved_amount' is not null then
          raise exception 'Injected budget approval audit failure';
        end if;
        return new;
      end; $$;
      create trigger test_fail_budget_amount_audit before insert on public.audit_events
        for each row execute function private.test_fail_budget_amount_audit();`);

    await expect(
      actOnBudget(ids.executive, task, before.version, 1250, "approved", "ปรับเพิ่มวงเงินทดสอบ"),
    ).rejects.toThrow("Injected budget approval audit failure");
    expect(await readBudget()).toEqual(before);
    expect(await pendingTask()).toEqual(task);
    expect(await workflowCounts()).toEqual(counts);
  });
});

describe("budget approval authorization", () => {
  test("a misconfigured task without a review role cannot allocate money", async () => {
    const task = await readyForFinalApproval();
    await db.query("update public.approval_tasks set required_role=null where id=$1", [task.id]);
    const before = await readBudget();
    await expect(actOnBudget(ids.admin, task, before.version)).rejects.toMatchObject({
      code: "23514",
    });
    expect(await readBudget()).toEqual(before);
  });
  test("old budget calls cannot bypass the reviewed-version check", async () => {
    const task = await readyForFinalApproval();
    const before = await readBudget();
    await expect(
      asUser(db, ids.executive, () =>
        db.query("select public.act_on_approval_task($1, 'approved', null)", [task.id]),
      ),
    ).rejects.toMatchObject({ code: "PT409" });
    expect(await readBudget()).toEqual(before);
  });

  test.each(["approved_amount = 750", "status = 'approved'"])(
    "direct executive update cannot bypass the decision transaction: %s",
    async (assignment) => {
      await readyForFinalApproval();
      const before = await readBudget();
      const counts = await workflowCounts();
      await expect(
        asUser(db, ids.executive, () =>
          db.query(`update public.budget_requests set ${assignment} where id=$1 returning id`, [
            ids.budget,
          ]),
        ),
      ).rejects.toMatchObject({ code: "42501" });
      expect(await readBudget()).toEqual(before);
      expect(await workflowCounts()).toEqual(counts);
    },
  );

  test("an archived budget cannot be approved through an old pending task", async () => {
    const task = await readyForFinalApproval();
    await db.query("update public.budget_requests set archived_at=now() where id=$1", [ids.budget]);
    const before = await readBudget();
    await expect(actOnBudget(ids.executive, task, before.version)).rejects.toMatchObject({
      code: "23514",
    });
    expect(await readBudget()).toEqual(before);
  });

  test.each<Decision>(["revision_required", "rejected"])(
    "%s records a decision without allocating a budget",
    async (decision) => {
      const task = await readyForFinalApproval();
      const before = await readBudget();
      await actOnBudget(
        ids.executive,
        task,
        before.version,
        null,
        decision,
        "ส่งกลับพร้อมข้อเสนอแนะ",
      );
      expect(await readBudget()).toMatchObject({
        status: decision,
        approved_amount: null,
        requested_amount: "1000.00",
      });
      expect(
        (await db.query("select status from public.approval_tasks where id=$1", [task.id])).rows,
      ).toEqual([{ status: decision }]);
    },
  );

  test.each([
    ["reviewer", ids.user],
    ["request owner", ids.staff],
    ["other staff", ids.otherStaff],
    ["outside staff", ids.outside],
    ["inactive account", ids.inactive],
  ])("%s cannot allocate money at the executive stage", async (_label, actor) => {
    const task = await readyForFinalApproval();
    const before = await readBudget();
    await expect(
      actOnBudget(actor, task, before.version, 750, "approved", "ปรับลดวงเงิน"),
    ).rejects.toMatchObject({ code: "42501" });
    expect(await readBudget()).toEqual(before);
    expect(await pendingTask()).toEqual(task);
  });

  test.each([ids.user, ids.admin])(
    "review-stage approval cannot allocate money even for %s",
    async (actor) => {
      const task = await submitBudget();
      const before = await readBudget();
      await expect(
        actOnBudget(actor, task, before.version, 750, "approved", "ปรับลดก่อนถึงขั้นอนุมัติ"),
      ).rejects.toMatchObject({ code: "23514" });
      expect(await readBudget()).toEqual(before);
      expect(await pendingTask()).toEqual(task);
    },
  );

  test("an executive outside the request organization cannot decide its assigned task", async () => {
    const task = await readyForFinalApproval();
    const before = await readBudget();
    await db.query("delete from public.user_organization_scopes where profile_id = $1", [
      ids.executive,
    ]);
    await expect(
      actOnBudget(ids.executive, task, before.version, 750, "approved", "ปรับลดวงเงิน"),
    ).rejects.toMatchObject({ code: "42501" });
    expect(await readBudget()).toEqual(before);
  });

  test("an executive cannot act on another assignee's task", async () => {
    const task = await readyForFinalApproval();
    const before = await readBudget();
    await db.query("update public.approval_tasks set assignee_id = $1 where id = $2", [
      ids.otherStaff,
      task.id,
    ]);
    await expect(
      actOnBudget(ids.executive, task, before.version, 750, "approved", "ปรับลดวงเงิน"),
    ).rejects.toMatchObject({ code: "42501" });
    expect(await readBudget()).toEqual(before);
  });

  test.each([ids.staff, ids.user, ids.executive, ids.admin])(
    "approved_amount cannot be written directly by authenticated actor %s",
    async (actor) => {
      const before = await readBudget();
      const update = asUser(db, actor, () =>
        db.query(
          "update public.budget_requests set approved_amount = 1500 where id = $1 returning id",
          [ids.budget],
        ),
      );
      if (actor === ids.executive) {
        // RLS hides draft rows from the executive's UPDATE policy.
        expect((await update).rows).toEqual([]);
      } else {
        await expect(update).rejects.toMatchObject({ code: "42501" });
      }
      await expect(
        asUser(db, actor, () =>
          db.query(
            `insert into public.budget_requests (
              fiscal_year_id, budget_cycle_id, organization_id, owner_id, owner_name,
              coordinator_name, title_th, category, project_type, rationale,
              requested_amount, approved_amount, created_by
            ) values ($1, $2, $3, $4, 'Test owner', 'Test owner', 'Direct allocation attempt',
              'ดำเนินงาน', 'โครงการทดสอบ', '', 1000, 1500, $4)`,
            [ids.year, "40000000-0000-4000-8000-000000000001", ids.org, actor],
          ),
        ),
      ).rejects.toMatchObject({ code: "42501" });
      expect(await readBudget()).toEqual(before);
      expect((await db.query("select id from public.budget_requests")).rows).toHaveLength(1);
    },
  );

  test("non-budget approval keeps the existing three-argument RPC workflow", async () => {
    await asUser(db, ids.staff, () =>
      db.query("select public.submit_entity_for_approval('project', $1)", [ids.project]),
    );
    const review = await pendingTask(ids.project);
    await asUser(db, ids.user, () =>
      db.query("select public.act_on_approval_task($1, 'approved', null)", [review.id]),
    );
    const approval = await pendingTask(ids.project);
    await asUser(db, ids.executive, () =>
      db.query("select public.act_on_approval_task($1, 'approved', null)", [approval.id]),
    );
    expect(
      (await db.query("select status from public.projects where id = $1", [ids.project])).rows,
    ).toEqual([{ status: "active" }]);
  });
});
