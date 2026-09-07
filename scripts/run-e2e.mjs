import { spawn, spawnSync } from "node:child_process";

const mode = process.argv[2] ?? "smoke";
if (!["smoke", "workflow"].includes(mode)) throw new Error("Choose smoke or workflow");
const localApi = "http://127.0.0.1:54321";
let anonKey = "local-smoke-test-placeholder-not-a-real-key";

if (mode === "workflow") {
  const status = spawnSync(
    process.execPath,
    ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"],
    { encoding: "utf8" },
  );
  if (status.status !== 0)
    throw new Error("Start the disposable Supabase stack first: npx supabase start");
  const config = JSON.parse(status.stdout);
  const api = config.API_URL ?? config["api.url"] ?? config.api?.url;
  anonKey = config.ANON_KEY ?? config["auth.anon_key"] ?? config.auth?.anon_key;
  if (
    ![localApi, "http://localhost:54321"].includes(api) ||
    typeof anonKey !== "string" ||
    !anonKey
  ) {
    throw new Error(
      "Refusing E2E: expected a localhost Supabase API and local anon key from CLI status",
    );
  }
}

// Override every application Supabase setting BEFORE build (NEXT_PUBLIC_* is
// embedded in browser JS). Never load hosted credentials into the test runner.
const env = {
  ...process.env,
  E2E_MODE: mode,
  NEXT_PUBLIC_SUPABASE_URL: localApi,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: "",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3206",
  NEXT_TELEMETRY_DISABLED: "1",
};
function run(entry, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], {
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Test command exited with code ${code}`)),
    );
  });
}
await run("node_modules/next/dist/bin/next", ["build"]);
await run("node_modules/@playwright/test/cli.js", ["test", ...process.argv.slice(3)]);
