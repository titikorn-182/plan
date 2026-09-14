import type { FiscalYearMasterData, PlanStructureOption } from "@/features/shared/master-data";
import type { ProjectProposalDetails } from "@/features/projects/proposal-details";

export type ProjectPlanStructureLevel = "output" | "operationalPlan" | "activity";
export type ProjectPlanStructureValue = "code" | "name";

export function getProjectPlanStructureOptions(
  details: ProjectProposalDetails,
  level: ProjectPlanStructureLevel,
  catalog: FiscalYearMasterData,
): readonly PlanStructureOption[] {
  const outputOptions = catalog.planStructures.filter((option) => option.level === "output");
  const operationalPlanOptions = catalog.planStructures.filter(
    (option) => option.level === "operational_plan",
  );
  const activityOptions = catalog.planStructures.filter((option) => option.level === "activity");
  if (level === "output") return outputOptions;
  if (level === "operationalPlan") {
    return details.outputCode
      ? operationalPlanOptions.filter((option) => option.parentCode === details.outputCode)
      : operationalPlanOptions;
  }
  if (details.operationalPlanCode) {
    return activityOptions.filter((option) => option.parentCode === details.operationalPlanCode);
  }
  return details.outputCode
    ? activityOptions.filter((option) => option.code.startsWith(details.outputCode))
    : activityOptions;
}

export function applyProjectPlanStructureSelection(
  details: ProjectProposalDetails,
  level: ProjectPlanStructureLevel,
  valueType: ProjectPlanStructureValue,
  value: string,
  catalog: FiscalYearMasterData,
): ProjectProposalDetails {
  const outputOptions = catalog.planStructures.filter((option) => option.level === "output");
  const operationalPlanOptions = catalog.planStructures.filter(
    (option) => option.level === "operational_plan",
  );
  const activityOptions = catalog.planStructures.filter((option) => option.level === "activity");
  const source =
    level === "output"
      ? outputOptions
      : level === "operationalPlan"
        ? operationalPlanOptions
        : activityOptions;
  const selected = source.find((option) => option[valueType] === value);

  if (!selected) {
    if (level === "output") {
      return {
        ...details,
        outputCode: "",
        outputName: "",
        operationalPlanCode: "",
        operationalPlanName: "",
        activityCode: "",
        projectActivityName: "",
      };
    }
    if (level === "operationalPlan") {
      return {
        ...details,
        operationalPlanCode: "",
        operationalPlanName: "",
        activityCode: "",
        projectActivityName: "",
      };
    }
    return { ...details, activityCode: "", projectActivityName: "" };
  }

  if (level === "output") {
    const keepsOperationalPlan = details.operationalPlanCode.startsWith(selected.code);
    const keepsActivity = details.activityCode.startsWith(selected.code);
    return {
      ...details,
      outputCode: selected.code,
      outputName: selected.name,
      operationalPlanCode: keepsOperationalPlan ? details.operationalPlanCode : "",
      operationalPlanName: keepsOperationalPlan ? details.operationalPlanName : "",
      activityCode: keepsActivity ? details.activityCode : "",
      projectActivityName: keepsActivity ? details.projectActivityName : "",
    };
  }

  if (level === "operationalPlan") {
    const output = outputOptions.find((option) => option.code === selected.parentCode);
    const keepsActivity = details.activityCode.startsWith(selected.code);
    return {
      ...details,
      outputCode: output?.code ?? "",
      outputName: output?.name ?? "",
      operationalPlanCode: selected.code,
      operationalPlanName: selected.name,
      activityCode: keepsActivity ? details.activityCode : "",
      projectActivityName: keepsActivity ? details.projectActivityName : "",
    };
  }

  const operationalPlan = operationalPlanOptions.find(
    (option) => option.code === selected.parentCode,
  );
  const output = outputOptions.find((option) => option.code === operationalPlan?.parentCode);
  return {
    ...details,
    outputCode: output?.code ?? "",
    outputName: output?.name ?? "",
    operationalPlanCode: operationalPlan?.code ?? "",
    operationalPlanName: operationalPlan?.name ?? "",
    activityCode: selected.code,
    projectActivityName: selected.name,
  };
}

export function validateProjectPlanStructure(
  details: ProjectProposalDetails,
  catalog: FiscalYearMasterData,
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  const selections = [
    ["output", "outputCode", "outputName"],
    ["operational_plan", "operationalPlanCode", "operationalPlanName"],
    ["activity", "activityCode", "projectActivityName"],
  ] as const;

  const selected = new Map<"output" | "operational_plan" | "activity", PlanStructureOption>();
  for (const [level, codeKey, nameKey] of selections) {
    const code = details[codeKey].trim();
    const name = details[nameKey].trim();
    if (!code && !name) continue;
    const match = catalog.planStructures.find(
      (option) =>
        option.level === level &&
        (!code || option.code === code) &&
        (!name || option.name === name),
    );
    if (!match) {
      errors[`proposalDetails.${codeKey}`] = [
        "โครงสร้างแผนไม่ตรงกับปีงบประมาณที่เลือก กรุณาเลือกจากรายการใหม่",
      ];
    } else {
      selected.set(level, match);
    }
  }
  const output = selected.get("output");
  const operationalPlan = selected.get("operational_plan");
  const activity = selected.get("activity");
  if (output && operationalPlan && operationalPlan.parentCode !== output.code) {
    errors["proposalDetails.operationalPlanCode"] = [
      "แผนปฏิบัติการไม่อยู่ภายใต้ผลผลิตที่เลือก กรุณาเลือกใหม่",
    ];
  }
  if (operationalPlan && activity && activity.parentCode !== operationalPlan.code) {
    errors["proposalDetails.activityCode"] = [
      "กิจกรรมไม่อยู่ภายใต้แผนปฏิบัติการที่เลือก กรุณาเลือกใหม่",
    ];
  }
  return errors;
}
