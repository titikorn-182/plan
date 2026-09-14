import { describe, expect, it } from "vitest";
import { isRoleAssignmentActive } from "@/lib/auth/role-validity";

const now = new Date("2026-09-14T12:00:00.000Z");

describe("role assignment validity", () => {
  it("accepts a role whose validity window includes the current time", () => {
    expect(
      isRoleAssignmentActive(
        {
          role: "staff",
          active_from: "2026-09-01T00:00:00.000Z",
          active_until: "2026-10-01T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("rejects a role that has not started yet", () => {
    expect(
      isRoleAssignmentActive(
        {
          role: "admin",
          active_from: "2026-09-15T00:00:00.000Z",
          active_until: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it("rejects a role at or after its expiry time", () => {
    expect(
      isRoleAssignmentActive(
        {
          role: "executive",
          active_from: "2026-01-01T00:00:00.000Z",
          active_until: "2026-09-14T12:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("rejects malformed validity timestamps", () => {
    expect(
      isRoleAssignmentActive(
        { role: "user", active_from: "invalid-date", active_until: null },
        now,
      ),
    ).toBe(false);
  });
});
