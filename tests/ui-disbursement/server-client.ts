import type { PGlite } from "@electric-sql/pglite";
import { asUser } from "../database/harness";

let database: PGlite;
let actor: string | null;
export function configure(db: PGlite, userId: string | null) {
  database = db;
  actor = userId;
}
export async function createClient() {
  let table: string;
  let id: string;
  let payload: Record<string, unknown> | undefined;
  const client = {
    auth: { getClaims: async () => ({ data: { claims: { sub: actor } } }) },
    from: (name: string) => {
      if (!["projects", "disbursements"].includes(name)) throw new Error("Unexpected table");
      table = name;
      payload = undefined;
      return client;
    },
    select: () => client,
    eq: (field: string, value: string) => {
      if (field !== "id") throw new Error("Unexpected filter");
      id = value;
      return client;
    },
    insert: (values: Record<string, unknown>) => {
      payload = values;
      return client;
    },
    single: async () => {
      try {
        if (!actor) throw new Error("Expected signed-in test actor");
        const result = await asUser(database, actor, () => {
          if (table === "projects")
            return database.query(
              "select organization_id,fiscal_year_id,approved_budget,disbursed_amount from public.projects where id=$1",
              [id],
            );
          if (!payload) throw new Error("Expected insert payload");
          return database.query(
            `insert into public.disbursements
              (project_id,organization_id,fiscal_year_id,quarter,amount,disbursed_on,reference_no,status,created_by,updated_by)
              values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id,version`,
            [
              payload.project_id,
              payload.organization_id,
              payload.fiscal_year_id,
              payload.quarter,
              payload.amount,
              payload.disbursed_on,
              payload.reference_no,
              payload.status,
              payload.created_by,
              payload.updated_by,
            ],
          );
        });
        return { data: result.rows[0] ?? null, error: null };
      } catch (error) {
        const failure = error as { code?: string; message: string };
        return { data: null, error: { code: failure.code, message: failure.message } };
      }
    },
  };
  return client;
}
