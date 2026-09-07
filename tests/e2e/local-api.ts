import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.generated";

export const TEST_PASSWORD = "Local-Test-Only-2026!";
export async function signedInLocalClient(role: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (process.env.E2E_MODE !== "workflow" || url !== "http://127.0.0.1:54321" || !key) {
    throw new Error("Full workflow tests require the disposable localhost Supabase stack");
  }
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: `${role}@example.test`,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`Could not sign in disposable ${role} account: ${error.code}`);
  return client;
}
