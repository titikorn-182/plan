---
version: 1
slug: "app-workspace-evidence-budget-adjustment-page-tsx"
primary_target: "app/(workspace)/evidence/budget-adjustment/page.tsx"
related_targets: ["features/budget-adjustments/components/budget-adjustment-form.tsx","components/layout/evidence-navigation.tsx"]
---

MODE: Operate. Extend the existing evidence menu and form system; source: user-supplied budget adjustment memorandum for FY 2570. Offline approval only, no workflow or budget mutations.

## Direction contract
THESIS: Prepare an auditable before/after budget memorandum, not a new approval dashboard.
OWN-WORLD: Inherit Sarabun, square white fields, orange actions and ruled sections; PDF uses restrained black type and pale table headers.
STORY: Open evidence submenu, enter memorandum details, compare expense rows, check totals and signatories, download for external signing.
FIRST VIEWPORT: Back link, offline-use notice, memorandum fields; persistent download action. Paired before/after entries stack on mobile. Signature interaction is live before/after totals, with no entrance animation.
FORM: Template-led local extension; no seed required for a precisely specified form. Code-led incumbent composition.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implemented behavior

- The evidence navigation expands to the evidence register and budget-adjustment form, with integration in both application shells and WorkspaceMenu. The selected child uses the most-specific route; the compact navigation exposes a submenu above the bottom bar.
- Users manually enter the memorandum and paired project/expense details. No project autofetch, saved server draft, workflow submission, or budget database mutation is performed. Values remain in component memory, and edited forms warn on page unload and ordinary link navigation.
- The comparison accepts 1–30 before/after pairs, with zero allowed on the absent side of an added or removed expense. Totals and the difference use integer satang arithmetic. Six signer names and positions are editable; actual signatures and signing dates remain blank in the PDF.
- Required-field failures link messages to their controls and focus the first invalid field. PDF generation disables repeated submission, announces outcomes, and retains entered values after errors. The fixed download bar follows the inherited 206/72/0 workspace offsets and sits above mobile navigation; paired fields stack on narrow screens.
- The PDF endpoint authenticates the user and checks an active profile/role, validates JSON with the shared Zod schema, and limits the request body to 200,000 bytes including streamed requests. Responses are private, non-cacheable PDF downloads using the existing FPDI-compatible serialization approach.

## Visual authority and documentation scope

This is a template-led extension of the incumbent Sarabun, orange-and-white operational form system. Existing DESIGN.md and its sidecar remain the global authority; no new visual world or global token revision is introduced. The detector's four advisory findings concern inherited stone borders, section heading size, and compact mobile navigation labels. They do not authorize unrelated design drift repair.

The legacy DOC supplied the extracted text and form structure. Its original visual layout could not be rendered, so exact source-layout fidelity is unverified. The generated two-page synthetic example is `output/pdf/budget-adjustment-sample.pdf`; it is a review fixture, not a real approval record. No raster asset ships with this feature.

## Finish evidence

- Fresh finish review verdict: **SHIP**, with no material fixes requested.
- Current form component and CSS were checked in an isolated browser harness at 1440×1000 and 390×844. Validation focus, retained values after failure, and a mocked PDF download passed, with no browser errors or horizontal mobile overflow reported. This does not constitute a full authenticated production-shell review.
- Browser captures: `.impeccable/review/budget-adjustment/desktop.png`, `mobile.png`, `desktop-top.png`, and `mobile-top.png`. The generated PDF was visually checked in `final-pdf-1.png` and `final-pdf-2.png` in the same review directory.
- Implementation verification reported 41 unit/API/navigation tests and 6 existing PDF regression tests passing, plus the production build, scoped ESLint, and TypeScript checks. No deployment was performed.

## PDF reference refinement — 2026-10-03

The user subsequently supplied the A4 PDF template, now visually inspected at `tmp/pdfs/budget-adjustment-reference/source-1.png`. The download uses the existing UBU emblem at upper left, TH Sarabun New (bundled unchanged with its GPL/font-embedding notice), aligned memorandum fields, adjacent four-column before/after groups, and a bordered two-column/three-row signature grid. The reference uses TH Sarabun PSK; TH Sarabun New is the available closely related face, not an assertion of identical typography. Signing-date lines and the former running footer are omitted to follow the new reference; continuation pages alone carry page numbers.

Compact populated input fits one A4 page; long input continues with repeated comparison headers and preserves full values and signature blocks. Totals/difference remain an intentional functional addition. Current sample: `output/pdf/budget-adjustment-university-template.pdf`; verified render: `tmp/pdfs/budget-adjustment-reference/final-1.png`. Earlier two-page sample/captures above describe the superseded PDF layout, not the current output. Offline-only behavior and in-memory UI remain unchanged.
