import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixture = (name) => fileURLToPath(new URL(name, import.meta.url));
export default async function setup() {
  const server = await createServer({
    configFile: false,
    envDir: false,
    cacheDir: "node_modules/.vite-budget-register",
    root,
    optimizeDeps: {
      entries: [fixture("fixture.tsx")],
      include: ["react", "react-dom/client", "react/jsx-runtime"],
    },
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: [
        { find: "@/features/projects/revision-action", replacement: fixture("mock-action.ts") },
        { find: "@/features/projects/archive-action", replacement: fixture("mock-action.ts") },
        { find: "@/features/budget-requests/actions", replacement: fixture("mock-save.ts") },
        { find: "@/features/budget-requests/batch-actions", replacement: fixture("mock-save.ts") },
        {
          find: "@/features/budget-requests/archive-action",
          replacement: fixture("mock-action.ts"),
        },
        { find: "next/link", replacement: fixture("../ui-approved-budget/mock-link.tsx") },
        { find: "@", replacement: root },
      ],
    },
    server: { host: "127.0.0.1", port: 3218, strictPort: true },
    plugins: [
      {
        name: "isolated-budget-register",
        configureServer(devServer) {
          devServer.middlewares.use((request, response, next) => {
            if (request.url?.split("?")[0] !== "/") return next();
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            response.end(
              `<!doctype html><html lang="th"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Budget register test fixture</title><script type="module" src="/@vite/client"></script></head><body><div id="root"></div><script type="module" src="/tests/ui-budget-register/fixture.tsx"></script></body></html>`,
            );
          });
        },
      },
    ],
  });
  await server.listen();
  return () => server.close();
}
