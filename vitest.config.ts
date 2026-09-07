import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    allowOnly: !process.env.CI,
    environment: "node",
    include: ["tests/{unit,integration,database}/**/*.test.ts"],
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 15_000,
    restoreMocks: true,
  },
});
