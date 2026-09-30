---
version: 1
slug: "features-projects-components-projects-table-tsx"
primary_target: "features/projects/components/projects-table.tsx"
related_targets: ["features/projects/components/projects-view.tsx", "features/projects/components/project-row-actions.tsx", "features/projects/components/project-delete-dialog.tsx", "features/projects/components/project-revision-dialog.tsx", "features/projects/revision-action.ts", "supabase/migrations/202609300002_project_revision_requests.sql"]
---

MODE: Operate. Extend the existing project register; preserve filters, selection, inspector and PDF links.

## Direction contract

THESIS: Put safe record actions beside project health, without confusing health with approval status.
OWN-WORLD: Inherit the orange/white ruled register, square controls and Sarabun typography.
STORY: Open จัดการ, edit an eligible proposal, or confirm a recoverable admin-only deletion with visible failure feedback.
FIRST VIEWPORT: Add จัดการ immediately after สุขภาพโครงการ and before สิ้นสุด; inline disclosure stays inside the horizontally scrollable table. Keep the existing inspector.
FORM: Narrow code-led extension; no concept seed required. Escape closes the disclosure; the confirmation dialog initially focuses Cancel and restores focus on close.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Revision workflow extension — 2026-09-30

User-confirmed flow: the staff owner requests amendment in the app with a reason; Admin considers that request and may return the approved project for editing. Keep the same project identity and prior approval history. Pending requests do not unlock content. A returned proposal follows the existing review and approval path again. The extension is implemented and independently reviewed; its acceptance evidence below is separate from the earlier edit/delete record.

### Implemented revision behavior

- An eligible Staff owner can open `ขอแก้ไขหลังอนุมัติ` for their active, unarchived project with no pending approval or revision request. Requesting requires a reason of 5–1,000 characters and leaves the approved project locked for editing while Admin considers the request.
- Admin opens `ส่งกลับแก้ไข` for a pending request and supplies a 5–1,000 character decision reason to either return or decline. Returning changes the same project to `proposed` with health `watch`; the owner then uses the existing edit and approval submission path. Declining records the reason and leaves the project state unchanged. Project identity and previous approval history remain intact.
- The register shows `ขอแก้ไข · รอผู้ดูแลระบบพิจารณา` while pending and `รอบแก้ไขหลังอนุมัติ` on returned proposals. The dialog displays the latest request and decision reasons, with `ดูผลคำขอแก้ไข` for a result that has no available action. Latest-request summaries are restricted to Admin or the requesting Staff member who can still access the project. Approved snapshots remain private and are not returned to the client.
- Request and decision RPCs authenticate roles, lock and recheck records, validate versions, reject duplicate pending requests and preserve audit evidence. Admins receive a request notification; the requester receives the decision notification. Successful actions revalidate the affected register, edit, approval, notification and dashboard routes.
- The native modal initially focuses Cancel/Close and restores the invoking control when still connected. Escape closes it only while idle. Pending submission disables the reason field and actions, blocks cancellation and prevents duplicate submission. Validation and server failures remain visible as alerts; uncertain responses instruct the user to reopen the register and check the outcome before retrying. Confirmed outcomes use the register's polite status region.
- The dialog inherits white ruled surfaces, square controls, Sarabun and operation orange. Actions keep a 44px minimum height and visible focus. Long Thai titles and reasons wrap; the modal scrolls within 90% of viewport height and its action row wraps on mobile. Existing register filters, selection, inspector, pagination, PDF links and local table scrolling remain available.

### Pending policy choice

The user has not yet decided how revisions should interact with existing financial or report records. The current conservative implementation blocks an Admin return when the project has a nonzero disbursed amount, disbursement records, quarterly reports or completion reports. It also prevents new financial/report links while a returned project remains proposed awaiting reapproval. This is an implemented provisional restriction, not a confirmed institutional requirement; keep it visible as a pending user policy decision.

### Revision acceptance and finish record

Independent finish review disposition: **ship**, with no material findings. Four fresh captures use labelled synthetic fixtures rendering the real components in isolation:

- `.impeccable/review/project-revision-staff-desktop.png`
- `.impeccable/review/project-revision-staff-mobile.png`
- `.impeccable/review/project-revision-admin-desktop.png`
- `.impeccable/review/project-revision-admin-mobile.png`

These captures establish the scoped Staff/Admin register and dialog layouts on desktop and mobile. They do not establish a full authenticated workspace or production-data review. They are review evidence only; no raster assets ship with this extension.

Reported verification passed: 36 focused database/action tests; 691 tests across 66 files in the broader suite, excluding unrelated existing work-in-progress budget-approval/query-performance tests; 10 desktop/mobile browser cases; TypeScript; targeted ESLint and Prettier checks; and `git diff --check`. The production build completed with exit code 0, successful TypeScript validation and all 28 static pages generated. No code changed after the finish review.

Implementation authority: `project-revision-dialog.tsx`, `project-row-actions.tsx`, `projects-table.tsx`, `projects-view.tsx`, `features/projects/revision-action.ts` and `supabase/migrations/202609300002_project_revision_requests.sql`. The migration is not applied to production; no production writes, push or deployment occurred. The finish disposition applies to the reviewed local implementation, not a completed rollout or a resolution of the pending policy choice.

`DESIGN.md` remains unchanged because the workflow extends existing typography, colors, modal geometry, focus and feedback patterns without introducing a global design-system change. This surface brief owns the workflow-specific acceptance record.

## Earlier edit/delete scope — implemented behavior

- The `จัดการ` column follows `สุขภาพโครงการ` and precedes `สิ้นสุด`. Each row uses an inline disclosure with `แก้ไข` and `ลบ`, preserving the existing row selection, inspector, filters, pagination, and PDF link. Action clicks do not select the row.
- Edit is available for a proposal in the proposed state, without a pending approval, when the viewer has an eligible role and ownership/scope. Ineligible actions remain disabled with explanatory Thai copy; project health is not the approval state.
- Delete is a recoverable archive available only to Admin for proposed projects without pending approvals, disbursements, or linked reports. The confirmation identifies the project and explains restoration through the administration page. The server rechecks eligibility and version before applying the archive.
- Escape closes the disclosure and focuses its summary. The modal initially focuses `ยกเลิก` and restores the invoking control when it remains connected. Escape and Cancel close the modal while idle. Pending submission disables both buttons and prevents modal cancellation or duplicate submission.
- Failures remain visible inside the dialog as alerts. An uncertain response asks the viewer to reopen the register and check the result before trying again; there is no automatic retry. Confirmed success is announced through the register's polite status region, including when no rows remain.
- Controls retain square edges, visible keyboard focus, and a 44px minimum action height. Disabled delete text stays neutral on white, including hover. The table keeps its 980px minimum width in a labelled, keyboard-focusable local scroll region on mobile; the dialog wraps long titles and scrolls within the viewport.

## Earlier edit/delete scope — finish record, 2026-09-30

Independent finish review verdict: **ship**, with no material findings in the four fresh screenshots:

- `.impeccable/review/projects-desktop.png`
- `.impeccable/review/projects-mobile.png`
- `.impeccable/review/projects-dialog-desktop.png`
- `.impeccable/review/projects-dialog-mobile.png`

These captures are labelled synthetic fixtures rendering the real components in isolation. They verify the scoped register/disclosure and confirmation layouts; they do not establish verification of the full authenticated workspace or production data. The gray-on-color detector warning was reviewed as a false positive: the disabled delete control's white hover background overrides the enabled red hover treatment.

Reported validation passed: six browser cases, 109 focused tests, TypeScript, lint, and the production build. The build required restoration of the exact locked local `rimraf` dependency; the lockfile was unchanged.

`DESIGN.md` and `.impeccable/design.json` were reviewed. This extension reuses their incumbent typography, ruled surfaces, geometry, focus and feedback patterns; no new global token or system-wide pattern was needed. This brief owns the project-specific behavior and review evidence. No raster assets ship with the feature; the four images above are review evidence only.
