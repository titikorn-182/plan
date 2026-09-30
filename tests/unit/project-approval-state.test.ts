import { describe, expect, it } from "vitest";
import {
  parseProjectApprovalState,
  projectApprovalPresentation,
} from "@/features/projects/approval-state";

describe("project approval presentation", () => {
  it.each([null, undefined, "normal", "active", "toString", "__proto__"])(
    "does not invent approval from %s",
    (value) => {
      expect(parseProjectApprovalState(value)).toBe("unknown");
    },
  );
  it.each(["unit_review", "executive_review", "approved", "revision_required"])(
    "accepts explicit summary %s",
    (value) => {
      expect(parseProjectApprovalState(value)).toBe(value);
    },
  );
  it("keeps missing metadata visibly uncertain", () => {
    expect(projectApprovalPresentation({}).label).toBe("ตรวจสอบสถานะ");
  });
  it("explains how pending owners can request a return without premature approval", () => {
    expect(projectApprovalPresentation({ approvalState: "unit_review" }).help).toContain(
      "ติดต่อผู้ตรวจเพื่อส่งกลับแก้ไข",
    );
  });
});
