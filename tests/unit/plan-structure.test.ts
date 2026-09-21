import { describe, expect, it } from "vitest";
import {
  applyPlanStructureSelection,
  validatePlanStructure,
  type PlanStructureValues,
} from "@/features/shared/plan-structure";
import { TEST_MASTER_DATA } from "@/tests/fixtures/master-data";

const empty: PlanStructureValues = {
  outputCode: "",
  outputName: "",
  operationalPlanCode: "",
  operationalPlanName: "",
  activityCode: "",
  projectActivityName: "",
};

describe("shared plan structure selection and validation", () => {
  it("preserves unrelated fields and resolves duplicate names under the chosen parent", () => {
    const catalog = {
      ...TEST_MASTER_DATA,
      planStructures: TEST_MASTER_DATA.planStructures.map((option) =>
        option.level === "activity" ? { ...option, name: "ชื่อกิจกรรมซ้ำ" } : option,
      ),
    };
    const selected = applyPlanStructureSelection(
      { ...empty, outputCode: "1002", operationalPlanCode: "10021023", rationale: "ข้อความเดิม" },
      "activity",
      "name",
      "ชื่อกิจกรรมซ้ำ",
      catalog,
    );
    expect(selected).toMatchObject({
      outputCode: "1002",
      operationalPlanCode: "10021023",
      activityCode: "100210230001",
      projectActivityName: "ชื่อกิจกรรมซ้ำ",
      rationale: "ข้อความเดิม",
    });
    expect(validatePlanStructure(selected, catalog)).toEqual({});
  });
  it.each([
    {},
    { outputCode: "3101" },
    { operationalPlanName: "แผนการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ" },
  ])("allows optional partial plan selections: %j", (values) => {
    expect(validatePlanStructure({ ...empty, ...values }, TEST_MASTER_DATA)).toEqual({});
  });
  it("resolves a duplicate operational-plan name under the explicitly selected output", () => {
    const catalog = {
      ...TEST_MASTER_DATA,
      planStructures: TEST_MASTER_DATA.planStructures.map((option) =>
        option.level === "operational_plan" ? { ...option, name: "ชื่อแผนซ้ำ" } : option,
      ),
    };
    expect(
      validatePlanStructure(
        { ...empty, outputCode: "1002", operationalPlanName: "ชื่อแผนซ้ำ" },
        catalog,
      ),
    ).toEqual({});
  });
  it("resolves a duplicate activity name under the explicitly selected operational plan", () => {
    const catalog = {
      ...TEST_MASTER_DATA,
      planStructures: TEST_MASTER_DATA.planStructures.map((option) =>
        option.level === "activity" ? { ...option, name: "ชื่อกิจกรรมซ้ำ" } : option,
      ),
    };
    expect(
      validatePlanStructure(
        { ...empty, operationalPlanCode: "10021023", projectActivityName: "ชื่อกิจกรรมซ้ำ" },
        catalog,
      ),
    ).toEqual({});
  });
  it("does not infer an ambiguous parent code from a name-only partial draft", () => {
    const catalog = {
      ...TEST_MASTER_DATA,
      planStructures: TEST_MASTER_DATA.planStructures.map((option) =>
        option.level === "operational_plan" ? { ...option, name: "ชื่อแผนซ้ำ" } : option,
      ),
    };
    expect(
      validatePlanStructure(
        { ...empty, operationalPlanName: "ชื่อแผนซ้ำ", activityCode: "100210230001" },
        catalog,
      ),
    ).toEqual({});
  });
  it("identifies both fields in a mismatched code/name pair", () => {
    const errors = validatePlanStructure(
      { ...empty, outputCode: "3101", outputName: "ผู้สำเร็จการศึกษาด้านสังคมศาสตร์" },
      TEST_MASTER_DATA,
    );
    expect(Object.keys(errors)).toEqual([
      "proposalDetails.outputCode",
      "proposalDetails.outputName",
    ]);
  });
  it("identifies the child field when parent and child belong to different branches", () => {
    const errors = validatePlanStructure(
      {
        ...empty,
        outputCode: "3101",
        operationalPlanCode: "10021023",
        activityCode: "310132000001",
      },
      TEST_MASTER_DATA,
    );
    expect(Object.keys(errors)).toEqual([
      "proposalDetails.operationalPlanCode",
      "proposalDetails.activityCode",
    ]);
  });
});
