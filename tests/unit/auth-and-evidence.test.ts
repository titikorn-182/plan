import { describe, expect, it } from "vitest";
import { safeNextPath, updatePasswordSchema } from "@/lib/auth/schemas";
import {
  createEvidenceStoragePath,
  EVIDENCE_MAX_FILE_SIZE_BYTES,
  EVIDENCE_MIME_TYPES,
  isExpectedEvidenceStoragePath,
  validateEvidenceFile,
} from "@/features/evidence/upload-config";

describe("authentication input", () => {
  it.each([
    undefined,
    null,
    "",
    "https://example.test",
    "//example.test",
    "/\\example.test",
    "/\t/example.test",
    "/\n/example.test",
  ])("rejects unsafe redirect %s", (path) => {
    expect(safeNextPath(path)).toBe("/");
  });
  it("preserves internal paths and their queries", () => {
    expect(safeNextPath("/projects?page=2")).toBe("/projects?page=2");
    expect(safeNextPath(undefined, "/projects")).toBe("/projects");
  });
  it("requires matching passwords of at least 8 characters", () => {
    expect(
      updatePasswordSchema.safeParse({ password: "12345678", confirmPassword: "12345678" }).success,
    ).toBe(true);
    expect(
      updatePasswordSchema.safeParse({ password: "1234567", confirmPassword: "1234567" }).success,
    ).toBe(false);
    expect(
      updatePasswordSchema.safeParse({ password: "12345678", confirmPassword: "87654321" }).success,
    ).toBe(false);
  });
});

describe("evidence uploads", () => {
  it.each(EVIDENCE_MIME_TYPES)("accepts allowed MIME type %s", (type) => {
    expect(validateEvidenceFile(new File(["test"], "test-file", { type }))).toBeNull();
  });
  it("rejects empty, unsupported, and oversized uploads", () => {
    expect(
      validateEvidenceFile(new File([], "empty.pdf", { type: "application/pdf" })),
    ).not.toBeNull();
    expect(
      validateEvidenceFile(new File(["test"], "script.html", { type: "text/html" })),
    ).not.toBeNull();
    const bytes = new Uint8Array(EVIDENCE_MAX_FILE_SIZE_BYTES);
    expect(
      validateEvidenceFile(new File([bytes], "max.pdf", { type: "application/pdf" })),
    ).toBeNull();
    expect(
      validateEvidenceFile(new File([bytes, "x"], "oversized.pdf", { type: "application/pdf" })),
    ).not.toBeNull();
  });
  it("binds the object path to the uploader, entity, organization, and MIME type", () => {
    const input = {
      organizationId: "org",
      entityType: "project",
      entityId: "project",
      userId: "staff",
      mimeType: "application/pdf",
    } as const;
    const path = createEvidenceStoragePath(input);
    expect(isExpectedEvidenceStoragePath(path, input)).toBe(true);
    expect(isExpectedEvidenceStoragePath(path, { ...input, userId: "other" })).toBe(false);
    expect(isExpectedEvidenceStoragePath(path, { ...input, organizationId: "outside" })).toBe(
      false,
    );
    expect(isExpectedEvidenceStoragePath(path, { ...input, entityId: "other" })).toBe(false);
    expect(isExpectedEvidenceStoragePath(path, { ...input, mimeType: "image/png" })).toBe(false);
    expect(isExpectedEvidenceStoragePath(`${path}/../evil.pdf`, input)).toBe(false);
  });
});
