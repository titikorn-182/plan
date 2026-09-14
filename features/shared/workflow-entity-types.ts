export const WORKFLOW_ENTITY_TYPES = [
  "budget_request",
  "project",
  "quarterly_report",
  "project_completion_report",
  "kpi_result",
] as const;

export type WorkflowEntityType = (typeof WORKFLOW_ENTITY_TYPES)[number];

export function isWorkflowEntityType(value: unknown): value is WorkflowEntityType {
  return (
    typeof value === "string" && WORKFLOW_ENTITY_TYPES.some((entityType) => entityType === value)
  );
}
