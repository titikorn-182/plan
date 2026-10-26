import type { PGlite } from "@electric-sql/pglite";
import { asUser } from "../database/harness";

let database: PGlite;
let actor: string;
export function configure(db: PGlite, userId: string) {
  database = db;
  actor = userId;
}
export async function createClient() {
  let taskId: string;
  const client = {
    auth: { getClaims: async () => ({ data: { claims: { sub: actor } } }) },
    from: (table: string) => {
      if (table !== "approval_tasks") throw new Error("Unexpected test table");
      return client;
    },
    select: () => client,
    eq: (field: string, id: string) => {
      if (field !== "id") throw new Error("Unexpected filter");
      taskId = id;
      return client;
    },
    maybeSingle: async () => ({
      data:
        (
          await asUser(database, actor, () =>
            database.query("select entity_type,entity_id from public.approval_tasks where id=$1", [
              taskId,
            ]),
          )
        ).rows[0] ?? null,
      error: null,
    }),
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name !== "act_on_approval_task") throw new Error("Unexpected test RPC");
      try {
        await asUser(database, actor, () =>
          database.query("select public.act_on_approval_task($1,$2,$3,$4,$5::numeric)", [
            args.p_task_id,
            args.p_decision,
            args.p_comment ?? null,
            args.p_expected_budget_version ?? null,
            args.p_approved_amount ?? null,
          ]),
        );
        return { data: true, error: null };
      } catch (error) {
        const failure = error as { code: string; message: string };
        return { data: null, error: { code: failure.code, message: failure.message } };
      }
    },
  };
  return client;
}
