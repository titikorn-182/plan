import type { FiscalYearMasterData, PlanStructureOption } from "@/features/shared/master-data";

export interface PlanStructureValues {
  outputCode: string;
  outputName: string;
  operationalPlanCode: string;
  operationalPlanName: string;
  activityCode: string;
  projectActivityName: string;
}

export type PlanStructureLevel = "output" | "operationalPlan" | "activity";
export type PlanStructureValue = "code" | "name";

export function getPlanStructureSelectionOptions(
  details: PlanStructureValues,
  level: PlanStructureLevel,
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

export function applyPlanStructureSelection<T extends PlanStructureValues>(
  details: T,
  level: PlanStructureLevel,
  valueType: PlanStructureValue,
  value: string,
  catalog: FiscalYearMasterData,
): T {
  const outputOptions = catalog.planStructures.filter((option) => option.level === "output");
  const operationalPlanOptions = catalog.planStructures.filter(
    (option) => option.level === "operational_plan",
  );
  const source = getPlanStructureSelectionOptions(details, level, catalog);
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

export function validatePlanStructure(
  details: PlanStructureValues,
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
    const candidates = catalog.planStructures.filter(
      (option) =>
        option.level === level &&
        (!code || option.code === code) &&
        (!name || option.name === name),
    );
    const parentCode =
      level === "operational_plan"
        ? details.outputCode.trim()
        : level === "activity"
          ? details.operationalPlanCode.trim()
          : "";
    // Names can repeat across branches. Prefer the candidate under the explicit
    // parent, just as the database's EXISTS predicate does for partial drafts.
    // Keep a global candidate when none is under that parent so the error below
    // identifies a hierarchy mismatch rather than an invalid code/name pair.
    const match =
      (parentCode ? candidates.find((option) => option.parentCode === parentCode) : undefined) ??
      candidates[0];
    if (!match) {
      const message =
        code && name
          ? "รหัสและชื่อโครงสร้างแผนไม่ตรงกัน กรุณาเลือกใหม่ให้เป็นรายการเดียวกัน"
          : "โครงสร้างแผนไม่ตรงกับปีงบประมาณที่เลือก กรุณาเลือกจากรายการใหม่";
      if (code) errors[`proposalDetails.${codeKey}`] = [message];
      if (name) errors[`proposalDetails.${nameKey}`] = [message];
    } else {
      selected.set(level, match);
    }
  }
  const operationalPlan = selected.get("operational_plan");
  const activity = selected.get("activity");
  const outputCode = details.outputCode.trim();
  const operationalPlanCode = details.operationalPlanCode.trim();
  if (outputCode && operationalPlan && operationalPlan.parentCode !== outputCode) {
    errors["proposalDetails.operationalPlanCode"] = [
      "แผนปฏิบัติการไม่อยู่ภายใต้ผลผลิตที่เลือก กรุณาเลือกใหม่",
    ];
  }
  if (operationalPlanCode && activity && activity.parentCode !== operationalPlanCode) {
    errors["proposalDetails.activityCode"] = [
      "กิจกรรมไม่อยู่ภายใต้แผนปฏิบัติการที่เลือก กรุณาเลือกใหม่",
    ];
  }
  return errors;
}
