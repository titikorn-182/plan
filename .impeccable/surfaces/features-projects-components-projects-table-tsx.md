---
version: 1
slug: "features-projects-components-projects-table-tsx"
primary_target: "features/projects/components/projects-table.tsx"
related_targets: ["features/projects/components/projects-view.tsx", "features/projects/components/project-row-actions.tsx", "features/projects/components/project-delete-dialog.tsx"]
---

MODE: Operate. Extend the existing project register; preserve filters, selection, inspector and PDF links.

## Direction contract

THESIS: Put safe record actions beside project health, without confusing health with approval status.
OWN-WORLD: Inherit the orange/white ruled register, square controls and Sarabun typography.
STORY: Open จัดการ, edit an eligible proposal, or confirm a recoverable admin-only deletion with visible failure feedback.
FIRST VIEWPORT: Add จัดการ immediately after สุขภาพโครงการ and before สิ้นสุด; inline disclosure stays inside the horizontally scrollable table. Keep the existing inspector.
FORM: Narrow code-led extension; no concept seed required. Escape closes the disclosure; the confirmation dialog initially focuses Cancel and restores focus on close.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implemented behavior

- The `จัดการ` column follows `สุขภาพโครงการ` and precedes `สิ้นสุด`. Each row uses an inline disclosure with `แก้ไข` and `ลบ`, preserving the existing row selection, inspector, filters, pagination, and PDF link. Action clicks do not select the row.
- Edit is available for a proposal in the proposed state, without a pending approval, when the viewer has an eligible role and ownership/scope. Ineligible actions remain disabled with explanatory Thai copy; project health is not the approval state.
- Delete is a recoverable archive available only to Admin for proposed projects without pending approvals, disbursements, or linked reports. The confirmation identifies the project and explains restoration through the administration page. The server rechecks eligibility and version before applying the archive.
- Escape closes the disclosure and focuses its summary. The modal initially focuses `ยกเลิก` and restores the invoking control when it remains connected. Escape and Cancel close the modal while idle. Pending submission disables both buttons and prevents modal cancellation or duplicate submission.
- Failures remain visible inside the dialog as alerts. An uncertain response asks the viewer to reopen the register and check the result before trying again; there is no automatic retry. Confirmed success is announced through the register's polite status region, including when no rows remain.
- Controls retain square edges, visible keyboard focus, and a 44px minimum action height. Disabled delete text stays neutral on white, including hover. The table keeps its 980px minimum width in a labelled, keyboard-focusable local scroll region on mobile; the dialog wraps long titles and scrolls within the viewport.

## Finish record — 2026-09-30

Independent finish review verdict: **ship**, with no material findings in the four fresh screenshots:

- `.impeccable/review/projects-desktop.png`
- `.impeccable/review/projects-mobile.png`
- `.impeccable/review/projects-dialog-desktop.png`
- `.impeccable/review/projects-dialog-mobile.png`

These captures are labelled synthetic fixtures rendering the real components in isolation. They verify the scoped register/disclosure and confirmation layouts; they do not establish verification of the full authenticated workspace or production data. The gray-on-color detector warning was reviewed as a false positive: the disabled delete control's white hover background overrides the enabled red hover treatment.

Reported validation passed: six browser cases, 109 focused tests, TypeScript, lint, and the production build. The build required restoration of the exact locked local `rimraf` dependency; the lockfile was unchanged.

`DESIGN.md` and `.impeccable/design.json` were reviewed. This extension reuses their incumbent typography, ruled surfaces, geometry, focus and feedback patterns; no new global token or system-wide pattern was needed. This brief owns the project-specific behavior and review evidence. No raster assets ship with the feature; the four images above are review evidence only.
