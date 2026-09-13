import type { SelectOption } from "@/features/shared/types";

export const EVIDENCE_ENTITY_TYPES = [
  "budget_request",
  "project",
  "quarterly_report",
  "project_completion_report",
  "kpi_result",
] as const;
export type EvidenceEntityType = (typeof EVIDENCE_ENTITY_TYPES)[number];

export function isEvidenceEntityType(value: unknown): value is EvidenceEntityType {
  return (
    typeof value === "string" && EVIDENCE_ENTITY_TYPES.some((entityType) => entityType === value)
  );
}

export type EvidenceEntityOption = SelectOption & {
  entityType: EvidenceEntityType;
  organizationId: string;
};

export type EvidenceRow = {
  id: string;
  businessId: string;
  title: string;
  unit: string;
  entityType: EvidenceEntityType;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  verified: boolean;
  uploadedAt: string;
};
