import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveProjectAction } from "@/features/projects/actions";
import { saveProjectForm } from "@/features/projects/save-project-form";

vi.mock("@/features/projects/actions", () => ({ saveProjectAction: vi.fn() }));
const save = vi.mocked(saveProjectAction);
beforeEach(() => vi.resetAllMocks());

describe("project save result handling", () => {
  it.each(["save", "submit"])(
    "records successful %s intent and returned identity",
    async (intent) => {
      const data = new FormData();
      data.set("intent", intent);
      save.mockResolvedValue({ success: true, id: "saved-id", version: 3 });
      expect(await saveProjectForm({}, data)).toEqual({
        success: true,
        id: "saved-id",
        version: 3,
        submitted: intent === "submit",
      });
      expect(save).toHaveBeenCalledExactlyOnceWith({}, data);
    },
  );

  it("retains server field errors without marking a failed submission as submitted", async () => {
    const data = new FormData();
    data.set("intent", "submit");
    save.mockResolvedValue({ success: false, errors: { fiscalYearId: ["เลือกปี"] } });
    expect(await saveProjectForm({}, data)).toMatchObject({
      success: false,
      errors: { fiscalYearId: ["เลือกปี"] },
    });
  });

  it("preserves existing identity on a lost response and never retries automatically", async () => {
    save.mockRejectedValue(new Error("private diagnostic details"));
    const result = await saveProjectForm({ id: "existing-id", version: 4 }, new FormData());
    expect(result).toMatchObject({ success: false, id: "existing-id", version: 4 });
    expect(result.message).toContain("ยังยืนยันผลการบันทึกไม่ได้");
    expect(result.message).not.toContain("private diagnostic details");
    expect(save).toHaveBeenCalledTimes(1);
  });
});
