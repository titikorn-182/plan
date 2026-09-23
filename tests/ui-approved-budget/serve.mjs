import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixture = (filename) => fileURLToPath(new URL(filename, import.meta.url));
export default async function setup() {
  const server = await createServer({
    configFile: false,
    envDir: false,
    root,
    optimizeDeps: {
      entries: [fixture("fixture.tsx")],
      include: ["react", "react-dom/client", "react/jsx-runtime"],
    },
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: [
        { find: "@/features/projects/actions", replacement: fixture("mock-actions.ts") },
        { find: "next/link", replacement: fixture("mock-link.tsx") },
        { find: "@", replacement: root },
      ],
    },
    server: { host: "127.0.0.1", port: 3217, strictPort: true },
    plugins: [
      {
        name: "isolated-project-form-fixture",
        configureServer(devServer) {
          devServer.middlewares.use((request, response, next) => {
            if (request.url?.split("?")[0] !== "/") return next();
            response.setHeader("Content-Type", "text/html; charset=utf-8");
            response.end(`<!doctype html><html lang="th"><head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Approved budget component test</title>
            <script type="module" src="/@vite/client"></script>
            </head><body><div id="root"></div>
            <script type="module" src="/tests/ui-approved-budget/fixture.tsx"></script>
            </body></html>`);
          });
        },
      },
    ],
  });
  await server.listen();
  return () => server.close();
}
