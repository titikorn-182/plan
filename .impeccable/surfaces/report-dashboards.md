---
version: 1
slug: "report-dashboards"
primary_target: "components/modules/report-dashboard.tsx"
related_targets: ["app/(workspace)/reports/page.tsx", "components/modules/report-dashboard-links.tsx"]
---

MODE: Operate

## Direction contract

THESIS: Four analytical views extend the reports hub while preserving its export and scheduling implementation.
OWN-WORLD: Existing Sarabun, orange, white, square borders and readable Thai labels.
STORY: Choose report, confirm fiscal period, filter records, compare chart totals with the same detail rows.
FIRST VIEWPORT: Period and title above report navigation; search and organization/framework selection above a compact totals strip and paired horizontal bar charts.
FORM: Code-first local extension explicitly requested by the user; no concept seed applies. Filter changes synchronously update summaries and details. No decorative animation.
FINISH: Verify aggregation, missing data, all four report views, mobile overflow, and preservation of the original reports hub. No new raster assets.
