import { defineConfig, devices } from "@playwright/test";

if (!process.env.E2E_MODE || process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321") {
  throw new Error("Use npm run test:e2e or npm run test:e2e:workflow to isolate test credentials");
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: process.env.E2E_MODE === "workflow" ? /.*\.spec\.ts/ : /.*\.smoke\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3206",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3206",
    url: "http://127.0.0.1:3206/login",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
