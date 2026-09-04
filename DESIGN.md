---
name: "ระบบบริหารแผน — Executive Command Center"
description: "A dense orange-and-white evidence command desk for cross-organization planning, budget, project, disbursement, and KPI decisions."
colors:
  command-orange: "#ee4f16"
  command-orange-deep: "#d83b0b"
  command-orange-vivid: "#f45a24"
  operation-orange: "#cf430c"
  operation-orange-hover: "#ad3507"
  orange-wash: "#fff3ea"
  orange-hover: "#fff8f4"
  surface: "#ffffff"
  canvas: "#f7f7f6"
  ink: "#22201e"
  muted: "#57534e"
  divider: "#dedbd8"
  divider-strong: "#c9c5c1"
  field-border: "#d6d3d1"
  status-ahead: "#0e8a68"
  status-on-track: "#39a65a"
  status-watch: "#e56811"
  status-risk: "#e02d20"
  status-no-data: "#8a8b8d"
typography:
  display:
    fontFamily: "Noto Sans Thai Variable, Leelawadee UI, Tahoma, sans-serif"
    fontSize: "21px"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Noto Sans Thai Variable, Leelawadee UI, Tahoma, sans-serif"
    fontSize: "14px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "normal"
  title:
    fontFamily: "Noto Sans Thai Variable, Leelawadee UI, Tahoma, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "Noto Sans Thai Variable, Leelawadee UI, Tahoma, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Noto Sans Thai Variable, Leelawadee UI, Tahoma, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "normal"
rounded:
  square: "0px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "14px"
  xl: "18px"
components:
  navigation-active:
    backgroundColor: "{colors.command-orange}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "8px 13px"
    height: "42px"
  utility-control:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 9px"
    height: "34px"
  decision-queue-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "12px 10px"
    height: "102px"
  filter-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 10px"
    height: "34px"
  selected-matrix-row:
    backgroundColor: "{colors.orange-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "7px"
    height: "62px"
  operational-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "0 12px"
    height: "44px"
  operational-primary-action:
    backgroundColor: "{colors.operation-orange}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "8px 20px"
    height: "40px"
  operational-primary-action-hover:
    backgroundColor: "{colors.operation-orange-hover}"
    textColor: "{colors.surface}"
    rounded: "{rounded.square}"
  status-ahead-dot:
    backgroundColor: "{colors.status-ahead}"
    rounded: "{rounded.pill}"
    size: "8px"
  status-on-track-dot:
    backgroundColor: "{colors.status-on-track}"
    rounded: "{rounded.pill}"
    size: "8px"
  status-watch-dot:
    backgroundColor: "{colors.status-watch}"
    rounded: "{rounded.pill}"
    size: "8px"
  status-risk-dot:
    backgroundColor: "{colors.status-risk}"
    rounded: "{rounded.pill}"
    size: "8px"
  status-no-data-dot:
    backgroundColor: "{colors.status-no-data}"
    rounded: "{rounded.pill}"
    size: "8px"
---

# Design System: ระบบบริหารแผน — Executive Command Center

## Overview

**Creative North Star: "The Executive Evidence Ledger"**

The system is a live institutional command desk: dense enough to compare every organization, restrained enough to keep exceptions legible, and structured so a decision can always be traced back to projects, KPI results, quarterly reporting, and evidence. The visual language combines vivid institutional orange with white working surfaces, crisp ledger rules, compact Thai typography, and square controls.

Operate mode governs the surface. The first viewport prioritizes work to decide, cross-organization comparison, and an evidence inspector—not a decorative KPI-card mosaic. Orange identifies the product, current location, and next action; semantic colors explain performance states; warm washes carry hover and selection without breaking the ledger.

The same world now carries complete operational work: project create/edit/submit, quarterly reporting, disbursement entry, KPI result submission and verification, evidence upload/review, approvals, notifications, and the Admin access editor. Forms retain the square register structure, pair the main fieldset with a narrow contextual readiness or calculation panel, and keep save/submit decisions anchored at the bottom of the viewport.

Implementation authority is the current code in `components/dashboard`, `components/layout`, `components/modules`, `components/ui/operation-form.tsx`, `app/operations/actions.ts`, `app/globals.css`, and the route pages under `app`. Values and mutations use the authenticated Supabase client, role/organization RLS, version checks, and workflow RPCs; failed reads or writes remain explicit rather than falling back to fabricated records. The current redesign is code/build verified. A new in-app-browser visual capture and reference-fidelity review were not available for this implementation and remain pending; older raster files in `.impeccable/review` are not evidence for the current surface.

**Key Characteristics:**

- A full-text orange-and-white sidebar keeps the institutional module map visible on desktop.
- A thin fiscal/quarter utility bar holds period context, live-data state, notifications, export, print, filters, and sign-out.
- A horizontal decision queue surfaces up to six actionable records before the organization matrix.
- The ruled matrix compares requested and approved budget, delivery, disbursement, KPI performance, evidence, and organization status.
- A tabbed inspector preserves the selected organization while exposing summary, evidence, and linked registers.
- Operational forms pair editable registers with contextual checks and a fixed save/submit action bar.
- Density, one-pixel rules, labels, and tabular numerals carry the hierarchy; decoration does not.

## Colors

Vivid institutional orange is the single brand accent. White and a very light neutral canvas carry the working area; compact state colors are reserved for interpreted performance and always have a nearby textual key or value.

### Primary

- **Command Orange:** fills the brand block and active navigation, marks the matrix’s top rule, active filters and tabs, queue icons, and principal interactive emphasis.
- **Command Orange Deep:** supplies hover text and the stronger end of the interaction range.
- **Command Orange Vivid:** is the narrow structural accent at the start of the comparison matrix.
- **Operation Orange / Operation Orange Hover:** carry solid save, submit, upload, invite, and workflow actions across operational forms.
- **Orange Wash / Orange Hover:** mark selected matrix rows, selected mobile records, and hoverable queue or table surfaces without adding elevation.

### Secondary

- **Audit Teal:** the implemented inspector and pin-confirmation accent comes from the ahead/success family. Keep it evidence-specific; it is not a second brand color.

### Neutral

- **Surface:** the white plane used by the sidebar, utility bar, decision queue, matrix, inspector, and module headers.
- **Canvas:** the quiet cool-white page backdrop behind the command surfaces.
- **Ink / Muted:** primary data and subordinate context. The matrix uses smaller muted copy for units, targets, ratios, and provenance.
- **Divider / Divider Strong:** the one-pixel ledger structure. Dividers—not shadows—separate most regions.

### Semantic status

- **Ahead:** dark teal-green for performance clearly above plan.
- **On Track:** green for values within the accepted band.
- **Watch:** orange for values requiring follow-up.
- **Risk:** red for material under-performance or urgent exceptions.
- **No Data:** neutral gray for work that has not started or cannot yet be evaluated.

**The One Orange Voice Rule.** Orange may identify the institution, current position, or next action, but it must not turn every metric into a brand highlight.

**The Label-Plus-Color Rule.** Status dots are shorthand only. Preserve the Thai legend, explicit variance copy, accessible label, or inspector status text that explains each hue.

## Typography

**Display Font:** Noto Sans Thai Variable (with Leelawadee UI, Tahoma, and sans-serif fallbacks)  
**Body Font:** Noto Sans Thai Variable (with the same fallbacks)  
**Numeric Treatment:** tabular numerals for budgets, percentages, fiscal years, counts, ranks, and evidence totals.

**Character:** One highly functional Thai sans family keeps the system credible and compact across long institutional names and numeric comparison. Hierarchy comes from weight, alignment, and position rather than a second display face.

### Hierarchy

- **Display** (800, 19–21px, tight tracking): product identity and shared module page titles.
- **Headline** (700–800, 12.5–14px): register section titles, form sidebars, and the decision-queue heading.
- **Title** (700–800, 10.5–14px): organization names, inspector identity, form values, and primary record state.
- **Body** (400–650, 12–14px): operational fields, explanations, actions, and notices.
- **Label** (500–800, 7.5–11.5px): dense matrix content, table subheads, status legends, dates, and evidence metadata. The smallest sizes are restricted to comparison surfaces; forms remain at the readable 12–14px scale.

**The One-Family Rule.** Extend the interface through weight, size, and tabular figures; do not add a decorative display face or an English-first UI font.

**The Numbers Are Evidence Rule.** Keep budgets and percentages aligned and formatted consistently so differences can be scanned vertically before the reader opens the inspector.

## Layout

The executive route uses a fixed 190px sidebar and a workspace offset by the same width. A sticky 58px utility bar spans the workspace. The main command area has compact 12–18px page gutters, then a full-width decision queue and a matrix/inspector grid. The open inspector is 286px; the matrix remains the flexible primary region and keeps a 790px minimum table width. Its header is 48px high and data rows are 62px high.

The horizontal decision queue is a six-column strip with a 140px minimum per record and overflow scrolling when necessary. Each item preserves stage, state, organization, amount, and urgency/progress. The matrix footer keeps both the status legend and the evidence-linking rule visible. The evidence inspector follows a fixed internal sequence: header, organization identity and status, tabs, selected content, print/report actions, and signed-in user context.

Other application routes use the same command-center language through `WorkspaceShell`: a 206px full-text desktop sidebar, sticky 58px utility bar, ruled title band, and centered content stage capped at 1560px.

Operational edit routes use a wide register beside a 310–330px contextual panel that becomes sticky on extra-wide screens. The form reserves bottom space for a fixed 64px-minimum action bar. That bar aligns to the current navigation footprint: `left: 206px` on desktop, `left: 72px` at 960px and below, and `left: 0` at 700px and below. The last offset is required because navigation has moved to the fixed bottom bar.

Responsive changes are structural:

- At 1100px and below, the 286px inspector stacks beneath the matrix and the queue becomes a three-column grid.
- At 960px and below, both sidebar variants compress to a 72px icon rail and hide the long navigation labels and sidebar legend.
- At 760px and below on the executive route, navigation becomes a fixed 62px bottom bar, the top bar stacks, the queue remains horizontally scrollable, filters stack, and the matrix becomes a purpose-built mobile record list.
- Shared module routes move to a fixed 62px bottom navigation at 700px and below.
- At 480px and below, utility text labels collapse while the icon buttons retain accessible names.
- Print mode removes navigation, utility, filter, inspector, and footer chrome so the matrix becomes the report surface.

**The Context-Preservation Rule.** When the matrix becomes a mobile list or the inspector stacks, preserve organization identity, status, key performance values, and the evidence-opening action.

**The Anchored Action Rule.** Save, submit, and cancel controls remain fixed to the visible workspace and must follow the 206/72/0 sidebar offsets exactly.

## Elevation & Depth

The system is flat by default. White surfaces, the cool-white canvas, continuous dividers, warm selection fills, and a two-pixel orange matrix rule establish depth. The sticky top bars use a nearly opaque white surface with a restrained blur only to maintain separation over scrolling content. Conventional card shadows are absent.

### Shadow Vocabulary

- **Selected Edge:** an inset 3px command-orange rule binds the selected organization to its matrix row or mobile record.
- **Live Halo:** a compact pale-green halo surrounds the live-data dot.
- **Visible Focus:** a high-contrast three-pixel focus outline sits outside keyboard-focused controls and focusable table regions.

**The Flat Command Desk Rule.** If a one-pixel rule, tonal wash, or positional change can communicate hierarchy, use it before introducing shadow.

## Shapes

The dominant form is rectangular and ledger-like. Navigation rows, queue records, filter fields, matrix cells, inspector panels, tabs, and action buttons are square. Full circles are reserved for status dots, notification counts, the queue count, live-data indicator, and account avatars. Borders are one pixel unless the matrix start rule or selected leading edge needs stronger emphasis.

**The Small-Corner Rule.** Do not introduce large-radius cards or pill buttons. Full rounding is compact state geometry, not a general surface treatment.

## Components

### Navigation

- **Desktop:** the executive route uses a 190px fixed sidebar; shared operational routes use 206px. The orange brand block sits above full-text icon-and-label rows.
- **Active:** command-orange fill, white icon/text, semibold-to-bold label, and a white leading rule.
- **Compact rail:** at 960px the rail becomes 72px and retains recognizable icons plus `aria-current`.
- **Bottom navigation:** at narrow widths the same destinations form a fixed 62px horizontally scrollable bottom bar with labels and a top active rule.
- **Route selection:** choose the longest matching route. `/reports/quarterly` must activate “รายงานรายไตรมาส,” not the shorter `/reports` parent; nested create/edit routes inherit their most-specific register item.

**The Most-Specific Route Rule.** When navigation paths overlap, only the longest matching visible route receives the active treatment and `aria-current="page"`.

### Utility controls

- **Period controls:** square, transparent 34–36px controls separated by a one-pixel rule; they show fiscal year and quarter without competing with the matrix.
- **Live state:** an outlined orange label with a green dot and explicit “ข้อมูลจริง” text.
- **Tools:** compact icon-and-label buttons for notification, export, print, filter, and sign-out. Hover adds a pale orange surface or neutral border; narrow screens may hide visible labels only when accessible names remain.

### Decision queue

- **Style:** six compact white action records with one-pixel internal dividers and orange stage icons.
- **Content:** state, organization, amount, and urgency or progress are mandatory; truncation is limited to the long organization/state lines.
- **State:** hover uses the orange-hover wash. Selecting a record opens the corresponding organization in the inspector.

### Filter field and status filters

- **Field:** square, 34px high, one-pixel neutral border, inline search icon, and clear Thai placeholder.
- **Status controls:** small bordered rectangles; the selected filter uses command-orange fill and white text.
- **Empty result:** keep the reason visible and offer a direct “ล้างตัวกรอง” recovery action.

### Organization matrix

- **Structure:** fixed-layout ruled table with warm header bands, explicit units, totals footer, numeric alignment, and a focusable scroll region.
- **Selected row:** orange wash plus a 3px inset leading rule; the pin action simultaneously becomes white-on-teal and exposes `aria-pressed`.
- **Metrics:** show actual value, status dot, and textual variance or target result. Evidence uses both verified and total counts.
- **Mobile:** replace the table with selectable organization records that retain rank, organization, code, project count, status, delivery, and disbursement.

### Evidence inspector

- **Shape:** a ruled 286px side region on wide screens and a full-width stacked region at 1100px and below.
- **Tabs:** Summary, Evidence with count, and References. The selected tab uses orange text and a two-pixel orange underline with `aria-selected`.
- **Content:** the summary combines quarter progress, target variance, approved amount, disbursement, KPI attainment, verified evidence, and the top three evidence records. The other tabs expose evidence state and links to the underlying budget, project, disbursement, and KPI registers.
- **Actions:** square outlined controls for printing the inspection summary and opening the complete report.

### Status indicators

- **Style:** compact 8px circles in the five semantic colors.
- **Meaning:** always keep the visible legend, metric variance, or inspector status copy in the same interaction context; retain the status dot’s accessible label.

### Operational forms and action bar

- **Fields:** square 44px controls and resizable textareas use white surfaces, one-pixel neutral borders, 14px Thai body text, orange focus borders, and a visible pale-orange focus ring. Disabled read-only workflow states remain visibly distinct.
- **Feedback:** required fields use visible labels; server validation returns inline `FieldError` text linked through `aria-invalid` and `aria-describedby`. Form-level save/submit results use polite live regions, while blocking page failures use alerts.
- **Action bar:** cancel stays outlined; draft/save is neutral; submit is solid operation orange. Pending actions show a spinner and disable repeat submission. Preserve the fixed responsive offsets of 206px, 72px, and 0.
- **Project readiness:** the side panel shows exactly three checks—owner plus coordinator, valid approved budget plus disbursement target, and a valid start/end date range—with a visible `0/3` through `3/3` count and progress track.

### Operational workflow surfaces

- **Quarterly report:** binds project, fiscal year, quarter, due date, cumulative progress, achievement summary, problems, and linked evidence; submitted versions become read-only until returned for revision.
- **Disbursement:** shows approved, disbursed, and remaining amounts beside the entry form and rejects entries above the database-checked remaining budget.
- **KPI result:** keeps framework version, target, direction-aware result ratio, evidence count, explanation, and verification state together; submitted results become read-only.
- **Evidence review:** supports private uploads linked to budget, project, quarterly report, or KPI result; eligible reviewers can verify or return evidence with a required reason.
- **Approvals and notifications:** workflow cards distinguish tasks the viewer can act on from tracking-only items; non-approval decisions require a reason, and notification counts link to a read/unread register.
- **Admin access editor:** the selected-user panel edits display name, multiple roles, organization scopes, and account activation beside the permission matrix and audit list. It is admin-only and prevents self-removal of Admin or self-suspension.

## Do's and Don'ts

### Do:

- **Do** begin executive surfaces with decisions, cross-unit comparison, and evidence inspection instead of detached summary decoration.
- **Do** preserve the organization → project → KPI → quarterly report evidence chain in data, labels, links, and responsive transformations.
- **Do** source dashboard records and aggregates from authenticated Supabase/RLS queries; show an explicit error state when live data cannot be read.
- **Do** use Noto Sans Thai Variable, Buddhist Era fiscal context, THB units, tabular numerals, and readable Thai wrapping.
- **Do** reuse the full-text command sidebar, sticky period bar, decision queue, ruled matrix, status legend, and inspector vocabulary across adjacent executive workflows.
- **Do** retain visible keyboard focus, `aria-current`, `aria-selected`, `aria-pressed`, labelled regions, labelled icon controls, and print behavior.
- **Do** keep server validation beside the affected field and announce form, review, and workflow outcomes through an appropriate live region.
- **Do** preserve the project readiness panel as three explicit checks and the fixed form action-bar offsets as 206/72/0.

### Don't:

- **Don't** replace the primary matrix or record workflow with a generic mosaic of KPI cards or charts detached from source evidence.
- **Don't** add gradients, decorative imagery, fake paper texture, glass cards, dark mode, purple accents, invented seals, or large floating rounded surfaces.
- **Don't** communicate status, selection, urgency, evidence verification, or progress through color alone.
- **Don't** invent sample figures in the interface when an RLS-scoped query is empty or fails.
- **Don't** squeeze the 790px matrix onto a phone; switch to the implemented mobile record list.
- **Don't** use shadows as routine card decoration or full pills as default controls.
- **Don't** mark a shorter parent navigation route active when a longer visible route matches the current pathname.
- **Don't** enable edits after a record enters approval or verification unless the workflow has explicitly returned it for revision.

### Extension checklist

- Put the decision, comparison, source record, or evidence task before aggregate decoration.
- Preserve the 190–206px text sidebar, 58px utility bar, 1100px inspector stack, 960px compact rail, and fixed bottom-navigation behavior where the corresponding shell applies.
- Use named colors, the Noto Sans Thai scale, compact 4/8/12px spacing, crisp ledger rules, and square geometry.
- Verify RLS-scoped empty/error states, keyboard order, focus visibility, Thai wrapping, 200% zoom, and reduced motion.
- Verify inline error linkage, polite outcome announcements, pending/disabled actions, role-gated decisions, and the three-point project readiness calculation.
- Capture fresh desktop and mobile screenshots when the in-app browser becomes available; until then, treat this implementation as code/build verified rather than visually reviewed.
