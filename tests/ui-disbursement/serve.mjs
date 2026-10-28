import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../../", import.meta.url));
const fixture = (file) => fileURLToPath(new URL(file, import.meta.url));
const year = "20000000-0000-0000-0000-000000000001";

export default async function setup() {
  let handleRequest;
  const server = await createServer({
    plugins: [
      {
        name: "isolated-disbursement",
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
        { find: "@/features/disbursements/actions", replacement: fixture("bridge.ts") },
        { find: "@/lib/supabase/server", replacement: fixture("server-client.ts") },
        { find: "next/cache", replacement: fixture("../ui-budget-decision/cache.ts") },
        { find: "server-only", replacement: fixture("../ui-budget-decision/empty.ts") },
        { find: "next/link", replacement: fixture("../ui-budget-detail/mock-link.tsx") },
        { find: "@", replacement: root },
      ],
    },
    server: { host: "127.0.0.1", port: 3221, strictPort: true },
  });
  const { createTestDatabase, asUser, ids } = await server.ssrLoadModule(
    "/tests/database/harness.ts",
  );
  const { configure } = await server.ssrLoadModule("/tests/ui-disbursement/server-client.ts");
  const { saveDisbursementAction } = await server.ssrLoadModule(
    "/features/disbursements/actions.ts",
  );
  const db = await createTestDatabase();
  let transaction = false;
  let queue = Promise.resolve();
  handleRequest = (request, response, next) => {
    const url = new URL(request.url, "http://127.0.0.1:3221");
    if (url.pathname === "/") {
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(
        '<!doctype html><html lang="th"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Disbursement test</title><script type="module" src="/@vite/client"></script></head><body><div id="root"></div><script type="module" src="/tests/ui-disbursement/fixture.tsx"></script></body></html>',
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
          await db.query(
            "insert into public.fiscal_years (id,buddhist_year,label,starts_on,ends_on) values ($1,2575,'ปีทดสอบ 2575','2031-10-01','2032-09-30')",
            [year],
          );
          await db.query(
            "update public.projects set fiscal_year_id=$1, approved_budget=100000, starts_on='2031-10-01', ends_on='2032-09-30' where id=$2",
            [year, ids.project],
          );
          if (url.searchParams.has("staleBudget"))
            await asUser(db, ids.staff, () =>
              db.query(
                "insert into public.disbursements (project_id,organization_id,fiscal_year_id,quarter,amount,disbursed_on,created_by) values ($1,$2,$3,1,90000,'2031-10-01',$4)",
                [ids.project, ids.org, year, ids.staff],
              ),
            );
          configure(db, url.searchParams.has("expired") ? null : ids.staff);
          output = {
            projects: [
              {
                id: ids.project,
                label: "TEST-P1 · โครงการบริการวิชาการแบบให้เปล่า (ข้อมูลทดสอบ)",
                organizationId: ids.org,
                fiscalYearId: url.searchParams.has("invalidYear") ? "invalid" : year,
                approvedBudget: 100000,
                disbursedAmount: 0,
              },
            ],
            fiscalYears: [{ id: year, label: "ปีทดสอบ 2575", buddhistYear: 2575 }],
          };
        } else if (url.pathname === "/test-snapshot") {
          output = {
            rows: (
              await db.query(
                "select amount,quarter,disbursed_on::text,reference_no,status,fiscal_year_id from public.disbursements where project_id=$1 order by amount",
                [ids.project],
              )
            ).rows,
            project: (
              await db.query("select disbursed_amount from public.projects where id=$1", [
                ids.project,
              ])
            ).rows[0],
          };
        } else if (url.pathname === "/test-save" && request.method === "POST") {
          let body = "";
          for await (const chunk of request) {
            body += chunk;
            if (body.length > 20000) throw new Error("Test body too large");
          }
          const input = JSON.parse(body);
          const data = new FormData();
          for (const [key, value] of Object.entries(input.entries)) data.set(key, value);
          output = await saveDisbursementAction(input.previous, data);
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
