# Budget request detail component checks

Run `npx playwright test --config tests/ui-budget-detail/playwright.config.ts`.

This isolated Vite harness renders the production read-only detail component with synthetic
fixtures and the production stylesheet. It does not load `.env`, connect to Supabase, invoke
server actions, or modify application data. The browser rejects all non-localhost requests.
It complements route/query permission tests; it does not test the authenticated Next.js shell.

Desktop (1440 × 1000) and mobile (390 × 844) checks cover detail content, preserved expense
metadata, read-only controls, navigation targets, escaped HTML, long content containment,
legacy expense lines, and missing expense details. Screenshots are written to the ignored
`.impeccable/review/` directory for visual inspection.
