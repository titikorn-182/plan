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

`project-save.spec.ts` also covers returned validation errors, thrown transport errors, retry,
native reset prevention, the saved-record link, and read-only state after successful submission.
Those tests bypass browser required-field checks to isolate action-result handling; they do not
prove database persistence. Fiscal-year GUID validation and the complete RPC payload are tested
in `tests/integration/project-budget-source-validation.test.ts`. The disposable-database workflow
test in `tests/e2e/project-workflow.spec.ts` opens the saved draft, reloads it, compares all proposal
details, then submits it. That workflow requires the local Supabase/Docker test environment.
