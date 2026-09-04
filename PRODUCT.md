# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Next.js 16 using the App Router
- TypeScript
- Tailwind CSS
- Supabase provides authentication, Postgres persistence, organization-scoped RLS, audit data, and server-rendered module queries
- Deployment target is undecided

## Users

- **Admin:** central planning/budget administrators who configure fiscal cycles, master data, users, permissions, workflows, KPI frameworks, and can inspect every organizational scope.
- **User:** unit planning/budget coordinators who prepare, consolidate, submit, and follow up records for assigned organizational units.
- **Executive:** leaders who review and approve assigned records and use cross-unit dashboards to make budget, project, and quality decisions.
- **Staff:** project owners, team members, or data owners who work only with records they own or have been assigned.

The exact boundary between User and Staff, approval authority by executive level, and institution-wide organization scope remain open decisions listed in `PRD.md`.

## Product Purpose

Create one traceable workspace for the annual planning and management cycle: budget requests, project proposals, approvals, project delivery, quarterly performance and disbursement reporting, and KPI monitoring for EdPEx and AUN-QA.

Success means people enter core information once, always know the current status and next owner, submit complete reports on time, and can reconcile executive summaries with their underlying records and evidence.

## Positioning

The product connects work that is usually fragmented across forms and spreadsheets into one continuous chain:

`budget request → approved budget → project → delivery evidence → disbursement → quality KPI`

Every summary is intended to be explainable and drillable to its source record, approval trail, and evidence rather than acting as a disconnected reporting dashboard.

## Operating Context

- Thai higher-education planning, budgeting, project-management, and quality-assurance workflows.
- Annual fiscal cycles with configurable submission windows and quarterly reporting periods.
- Multi-level organizational structures such as institution, faculty, office, department, and programme.
- Long forms, staged reviews, returned revisions, attachments, evidence, and printable/exportable reports are normal parts of the work.
- Executives primarily scan exceptions, risk, overdue work, budget variance, and KPI gaps; coordinators and staff primarily complete assigned tasks.
- Thai is the primary interface language. Dates default to Buddhist Era presentation and Asia/Bangkok time. Financial figures default to THB.

## Capabilities and Constraints

- Manage annual budget requests and detailed project proposals.
- Support configurable review, revision, approval, rejection, lock, and audit flows.
- Track projects, milestones, progress, outputs, outcomes, issues, risks, and evidence.
- Track requested, approved, adjusted, committed when enabled, disbursed, and remaining budgets by quarter.
- Track versioned EdPEx, AUN-QA, and internal KPI frameworks without rewriting historical results.
- Provide personal, unit, and executive dashboards with role- and scope-aware drill-down.
- Support reports, exports, notifications, comments, attachments, version history, and auditability.
- MVP is responsive web; desktop is primary for long-form entry while tablet and mobile prioritize review, approval, tasks, and concise updates.
- The current implementation includes Supabase Auth, schema migrations, role and organization-scope RLS, seeded demonstration records, live reads for all registers, and create/submit persistence for budget requests.
- Storage upload, detailed budget-line editing, approval actions in the UI, import/export, master-data editing, SSO, and authoritative financial integration remain future implementation work.

## Brand Commitments

- Orange and white are binding brand colors supplied by the user.
- The product should feel appropriate for a modern university administrative system: clear, credible, and task-oriented.
- No official product name, logo, seal, font, or institutional brand guide has been supplied. Do not fabricate them.

## Evidence on Hand

- `PRD.md` is the current product requirements authority and includes scope, workflows, permissions, data concepts, business rules, acceptance criteria, phased delivery, risks, and open questions.
- The PRD cites official EdPEx and AUN-QA publication pages to support versioned framework handling.
- A Supabase project endpoint and public client key are configured locally; database migrations still require an authorized SQL Editor or CLI deployment before live application queries succeed.
- Seed names, financial values, projects, units, and KPI results are representative demonstration data, not organizational claims.

## Product Principles

1. Enter once, reuse throughout the lifecycle.
2. Make status, ownership, deadlines, and the next action unmistakable.
3. Make every summary explainable through source records and evidence.
4. Enforce least privilege across role, organization, assignment, status, and active period.
5. Preserve historical truth through versioned frameworks, snapshots, corrections, and audit trails.

## Accessibility & Inclusion

- Target WCAG 2.2 AA for primary workflows.
- Core actions must be keyboard accessible with visible focus.
- Status cannot be communicated by color alone.
- Thai copy and long institutional terms must remain readable at 200% zoom and on narrow screens.
- Charts require textual labels and an accessible tabular or downloadable alternative.
