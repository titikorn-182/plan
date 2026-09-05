import { isEvidenceEntityType, type EvidenceEntityType } from "@/features/evidence/types";

export const EVIDENCE_BUCKET = "evidence";
export const EVIDENCE_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
export const EVIDENCE_MAX_FILE_SIZE_LABEL = "20 MB";
export const EVIDENCE_ACCEPT = ".pdf,.jpg,.jpeg,.png,.xlsx,.csv";
export const EVIDENCE_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
] as const;

export type EvidenceMimeType = (typeof EVIDENCE_MIME_TYPES)[number];

const extensionByMimeType: Readonly<Record<EvidenceMimeType, string>> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
};

export function isEvidenceMimeType(value: unknown): value is EvidenceMimeType {
  return EVIDENCE_MIME_TYPES.some((mimeType) => mimeType === value);
}

export function validateEvidenceFile(file: File): string | null {
  if (file.size === 0) return "กรุณาเลือกไฟล์หลักฐาน";
  if (file.size > EVIDENCE_MAX_FILE_SIZE_BYTES) {
    return `ไฟล์ต้องมีขนาดไม่เกิน ${EVIDENCE_MAX_FILE_SIZE_LABEL}`;
  }
  if (!isEvidenceMimeType(file.type)) {
    return "รองรับเฉพาะ PDF, JPG, PNG, XLSX และ CSV";
  }
  return null;
}

export function createEvidenceStoragePath(input: {
  organizationId: string;
  entityType: EvidenceEntityType;
  entityId: string;
  userId: string;
  mimeType: EvidenceMimeType;
}): string {
  const extension = extensionByMimeType[input.mimeType];
  return `${input.organizationId}/${input.entityType}/${input.entityId}/${input.userId}/${crypto.randomUUID()}.${extension}`;
}

export function isExpectedEvidenceStoragePath(
  storagePath: string,
  expected: {
    organizationId: string;
    entityType: EvidenceEntityType;
    entityId: string;
    userId: string;
    mimeType: EvidenceMimeType;
  },
): boolean {
  const parts = storagePath.split("/");
  if (parts.length !== 5) return false;
  const [organizationId, entityType, entityId, userId, objectName] = parts;
  if (!isEvidenceEntityType(entityType)) return false;
  const expectedExtension = extensionByMimeType[expected.mimeType];
  const objectPattern = new RegExp(
    `^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.${expectedExtension}$`,
    "i",
  );

  return (
    organizationId === expected.organizationId &&
    entityType === expected.entityType &&
    entityId === expected.entityId &&
    userId === expected.userId &&
    objectPattern.test(objectName)
  );
}
