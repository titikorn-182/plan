---
version: 1
slug: "app-workspace-budget-requests-detail-page-tsx"
primary_target: "app/(workspace)/budget-requests/[id]/page.tsx"
related_targets: ["features/budget-requests/components/budget-request-detail.tsx", "features/budget-requests/components/budget-request-detail-expenses.tsx", "features/budget-requests/detail-query.ts", "features/budget-requests/detail-types.ts"]
---

MODE: Read

THESIS: Open the exact annual budget request from its workflow card, read the saved information without editing it, and return to the approval inbox. Preserve the existing orange-and-white ruled register, Thai typography, square geometry, and responsive field layout.

ENTRY: `/budget-requests/[id]` uses the request UUID, never the workflow task UUID. Submitted register rows also link directly to the detail page; drafts keep their existing edit link. `/new` and `/edit` retain their original routes and titles.

CONTENT: Show request code, status, title, fiscal year, owning organization and dates; reuse the workbook section labels and order. Display saved expense-item metadata, requested total, rationale, objectives, expected benefits, target group, period, SDGs and responsible people. Older category breakdowns and budget lines remain readable without inventing units or an approved amount.

SAFETY: All reads use the caller's authenticated Supabase/RLS client. No mutations, editable-status gate, current-year filter, open-cycle requirement, master-data dependency, service-role access or new database migration. Missing and inaccessible records share a generic recovery message; invalid detail data and failed reads remain explicit. Current data is never replaced with examples.

RESPONSIVE: Wrap complete Thai text and expense metadata; use two-column fields where space permits and a single column on phones. Keep currency amounts legible with tabular numerals and preserve accessible navigation back to Workflow. No editable controls appear in the detail region.

VERIFICATION: Production build, TypeScript, scoped lint, 513 unit/integration/database tests and an 8-case desktop/mobile component harness passed. The actual detail components were visually inspected at 1440px and 390px using synthetic fixtures. Full authenticated workflow regression coverage is added to the existing E2E suite; running that suite requires the disposable Supabase test environment. This change has not been deployed.
