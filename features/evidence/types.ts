import type { SelectOption } from "@/features/shared/types";
import {
  WORKFLOW_ENTITY_TYPES,
  isWorkflowEntityType,
  type WorkflowEntityType,
} from "@/features/shared/workflow-entity-types";

export const EVIDENCE_ENTITY_TYPES = WORKFLOW_ENTITY_TYPES;
export type EvidenceEntityType = WorkflowEntityType;

export function isEvidenceEntityType(value: unknown): value is EvidenceEntityType {
  return isWorkflowEntityType(value);
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
