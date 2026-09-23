# Approved budget browser component tests

Run from the repository root:

```sh
npx playwright test --config tests/ui-approved-budget/playwright.config.ts
```

These desktop and mobile tests mount the real `ProjectForm`, source selector, and hook with the
application CSS. Only the server actions and Next navigation link are replaced at the module
boundary. Fixtures are synthetic and action calls are kept in browser memory; the server does
not load `.env` files or contact Supabase. Browser requests to external hosts are rejected.

The harness uses the Vite dependency already supplied by Vitest and the installed Playwright
Chromium browser. Failure screenshots and traces are saved under `test-results/ui-approved-budget`.
Review screenshots are saved under `.impeccable/review/approved-budget-*`: the desktop/mobile
viewport captures include the fixed action bar; the separately named basics and confirmation
element captures temporarily hide that bar to show the complete section.
This verifies client behavior independently of the database-backed workflow tests; server action
authorization and database constraints remain covered by their existing integration tests.
