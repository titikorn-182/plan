---
version: 1
slug: "features-projects-components-project-form-tsx"
primary_target: "features/projects/components/project-form.tsx"
related_targets: ["features/projects/components/proposal-basics.tsx","features/projects/components/approved-budget-selector.tsx"]
---

# Project proposal approved-budget reuse

Mode: Operate. Extend `/projects/new` for university staff. Preserve the existing Thai form, orange accents, required project-only fields, manual/legacy editing, and all stored budgets. No production writes during development.

## Direction contract

THESIS: Choose an approved activity once and reuse its shared fields without duplicate entry or silent overwrites.

OWN-WORLD: Existing white sections, stone borders, orange actions, native controls and Thai typography.

STORY: Select an accessible approved request, inspect transferred data, complete project-only details, save intentionally.

FIRST VIEWPORT: The existing activity field becomes a full-width dropdown. Reference code, loading/error/empty notices and replacement confirmation sit directly below. Organization/year follow the chosen source.

FORM: Narrow extension of the incumbent form; no concept seed or new visual identity. Signature interaction is a confirmed, atomic prefill that preserves current input on failure.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Implemented behavior

The surface inherits the existing `DESIGN.md` system. White sections, square native controls, Thai typography, stone borders, orange actions, and the form structure remain in place; this extension adds no visual identity or design tokens. `DESIGN.md` and `.impeccable/design.json` are unchanged.

- New proposals start with an approved-activity dropdown showing the activity, request code, and fiscal year. Existing proposals retain manual editing and their stored reference; manual entry remains available for new proposals.
- Selection fetches the accessible approved source on demand and fills shared proposal data together. The linked source controls organization and fiscal year; project-only details still need completion, and the disbursement target is retained.
- Replacing an existing source or entered data requires confirmation. Removing a reference preserves the entered fields. Failed, cancelled, and stale loads preserve current input; loading, empty, error, validation, and success feedback stay beside the selector.
- Prefill does not save or alter the source request. Save and submit remain explicit and are blocked while a source load or replacement confirmation is pending.

## Verification record

Finish verdict: **SHIP** for the approved-budget reuse extension, using a generic-agent finish-review substitute. All eight synthetic component-fixture captures were accepted after one corrective recapture; fidelity, responsive layout, and validation accessibility passed with no material findings.

Final build, TypeScript, and scoped lint checks passed. Verification reported 391 unit/integration/scoped database tests, two accessibility tests, and 22/22 browser checks at desktop 1440×1000 and mobile 390×844. Source authorization and RPC behavior were verified through local PGlite/integration checks.

This evidence covers the component fixture and scoped implementation, not the full production shell or a live-database browser session. No push, deployment, or production migration was performed.
