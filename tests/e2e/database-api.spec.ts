import { expect, test } from "@playwright/test";
import { signedInLocalClient } from "./local-api";

for (const [role, expected] of [
  ["admin", ["TEST-P1", "TEST-P2", "TEST-P3"]],
  ["user", ["TEST-P1", "TEST-P2"]],
  ["executive", ["TEST-P1", "TEST-P2"]],
  ["staff", ["TEST-P1"]],
  ["outside", ["TEST-P3"]],
] as const) {
  test(`Supabase Auth + PostgREST enforces ${role} project scope`, async () => {
    const client = await signedInLocalClient(role);
    try {
      const { data, error } = await client
        .from("project_register")
        .select("code")
        .in("code", ["TEST-P1", "TEST-P2", "TEST-P3"])
        .order("code");
      expect(error).toBeNull();
      expect(data?.map((row) => row.code)).toEqual(expected);
    } finally {
      await client.auth.signOut();
    }
  });
}

test("concurrent disbursements cannot together exceed the approved budget", async () => {
  // A real multi-connection PostgreSQL test; PGlite's single-connection tests
  // intentionally do not claim to test concurrent locking behavior.
  const first = await signedInLocalClient("staff");
  const second = await signedInLocalClient("staff");
  const projectId = "50000000-0000-4000-8000-000000000001";
  const input = {
    project_id: projectId,
    organization_id: "20000000-0000-4000-8000-000000000001",
    fiscal_year_id: "30000000-0000-4000-8000-000000000001",
    quarter: 1,
    amount: 700,
    disbursed_on: "2026-10-05",
    created_by: "10000000-0000-4000-8000-000000000004",
  };
  try {
    const before = await first
      .from("projects")
      .select("disbursed_amount")
      .eq("id", projectId)
      .single();
    expect(before.error).toBeNull();
    expect(before.data?.disbursed_amount).toBe(0);
    const results = await Promise.all([
      first.from("disbursements").insert({ ...input, reference_no: "RACE-A" }),
      second.from("disbursements").insert({ ...input, reference_no: "RACE-B" }),
    ]);
    expect(results.filter((result) => !result.error)).toHaveLength(1);
    expect(results.find((result) => result.error)?.error?.code).toBe("23514");
    const after = await first
      .from("projects")
      .select("disbursed_amount")
      .eq("id", projectId)
      .single();
    expect(after.error).toBeNull();
    expect(after.data?.disbursed_amount).toBe(700);
  } finally {
    await Promise.all([first.auth.signOut(), second.auth.signOut()]);
  }
});
