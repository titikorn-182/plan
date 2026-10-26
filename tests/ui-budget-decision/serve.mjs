import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixture = (file) => fileURLToPath(new URL(file, import.meta.url));

export default async function setup() {
  let handleRequest;
  const server = await createServer({
    plugins: [
      {
        name: "isolated-budget-decision",
        configureServer(devServer) {
          devServer.middlewares.use((request, response, next) =>
            handleRequest ? handleRequest(request, response, next) : next(),
          );
        },
      },
    ],
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
        { find: "@/features/approvals/actions", replacement: fixture("bridge.ts") },
        { find: "@/lib/supabase/server", replacement: fixture("server-client.ts") },
        { find: "next/cache", replacement: fixture("cache.ts") },
        { find: "next/navigation", replacement: fixture("cache.ts") },
        { find: "server-only", replacement: fixture("empty.ts") },
        { find: "next/link", replacement: fixture("../ui-budget-detail/mock-link.tsx") },
        { find: "@", replacement: root },
      ],
    },
    server: { host: "127.0.0.1", port: 3220, strictPort: true },
  });
  const { createTestDatabase, asUser, ids } = await server.ssrLoadModule(
    "/tests/database/harness.ts",
  );
  const { configure } = await server.ssrLoadModule("/tests/ui-budget-decision/server-client.ts");
  const { actOnApprovalAction } = await server.ssrLoadModule("/features/approvals/actions.ts");
  const db = await createTestDatabase();
  let transaction = false;
  let queue = Promise.resolve();
  const pending = async () =>
    (
      await db.query(
        "select id, required_role from public.approval_tasks where entity_id=$1 and status='pending'",
        [ids.budget],
      )
    ).rows[0];
  const budget = async () =>
    (
      await db.query(
        "select version,status,requested_amount,approved_amount,proposal_details from public.budget_requests where id=$1",
        [ids.budget],
      )
    ).rows[0];
  handleRequest = (request, response, next) => {
    const url = new URL(request.url, "http://127.0.0.1:3220");
    if (url.pathname === "/") {
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(
        '<!doctype html><html lang="th"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Budget decision test</title><script type="module" src="/@vite/client"></script></head><body><div id="root"></div><script type="module" src="/tests/ui-budget-decision/fixture.tsx"></script></body></html>',
      );
      return;
    }
    if (!url.pathname.startsWith("/test-")) return next();
    queue = queue
      .then(async () => {
        let output;
        if (url.pathname === "/test-reset") {
          if (transaction) await db.exec("rollback");
          await db.exec("begin");
          transaction = true;
          await asUser(db, ids.staff, () =>
            db.query("select public.submit_budget_request_for_approval($1)", [ids.budget]),
          );
          const role = url.searchParams.get("role") ?? "executive";
          if (role !== "user") {
            await asUser(db, ids.user, async () =>
              db.query("select public.act_on_approval_task($1,'approved',null,$2)", [
                (await pending()).id,
                (await budget()).version,
              ]),
            );
          }
          const task = await pending();
          const snapshot = await budget();
          configure(db, ids[role] ?? ids.executive);
          output = {
            budgetId: ids.budget,
            version: snapshot.version,
            task: { id: task.id, requiredRole: task.required_role, canAct: role !== "staff" },
          };
          if (url.searchParams.has("stale"))
            await db.query("update public.budget_requests set version=version+1 where id=$1", [
              ids.budget,
            ]);
        } else if (url.pathname === "/test-snapshot") {
          output = await budget();
        } else if (url.pathname === "/test-decision" && request.method === "POST") {
          let body = "";
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 20_000) throw new Error("Test body too large");
          }
          const input = JSON.parse(body);
          const data = new FormData();
          for (const [key, value] of Object.entries(input.entries)) data.set(key, value);
          output = await actOnApprovalAction(input.previous, data);
        } else {
          response.statusCode = 404;
          output = {};
        }
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify(output));
      })
      .catch((error) => {
        console.error(error);
        response.statusCode = 500;
        response.end(JSON.stringify({ message: "Fixture failed" }));
      });
  };
  await server.listen();
  return async () => {
    await queue;
    if (transaction) await db.exec("rollback");
    await db.close();
    await server.close();
  };
}
