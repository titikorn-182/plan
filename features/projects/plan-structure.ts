import {
  BUDGET_REQUEST_ACTIVITY_OPTIONS,
  BUDGET_REQUEST_OPERATIONAL_PLAN_OPTIONS,
  BUDGET_REQUEST_OUTPUT_OPTIONS,
  type BudgetRequestCodedOption,
} from "@/features/shared/plan-structure-options";
import type { ProjectProposalDetails } from "@/features/projects/proposal-details";

export type ProjectPlanStructureLevel = "output" | "operationalPlan" | "activity";
export type ProjectPlanStructureValue = "code" | "name";

export function getProjectPlanStructureOptions(
  details: ProjectProposalDetails,
  level: ProjectPlanStructureLevel,
): readonly BudgetRequestCodedOption[] {
  if (level === "output") return BUDGET_REQUEST_OUTPUT_OPTIONS;
  if (level === "operationalPlan") {
    return details.outputCode
      ? BUDGET_REQUEST_OPERATIONAL_PLAN_OPTIONS.filter((option) =>
          option.code.startsWith(details.outputCode),
        )
      : BUDGET_REQUEST_OPERATIONAL_PLAN_OPTIONS;
  }
  if (details.operationalPlanCode) {
    return BUDGET_REQUEST_ACTIVITY_OPTIONS.filter((option) =>
      option.code.startsWith(details.operationalPlanCode),
    );
  }
  return details.outputCode
    ? BUDGET_REQUEST_ACTIVITY_OPTIONS.filter((option) => option.code.startsWith(details.outputCode))
    : BUDGET_REQUEST_ACTIVITY_OPTIONS;
}

export function applyProjectPlanStructureSelection(
  details: ProjectProposalDetails,
  level: ProjectPlanStructureLevel,
  valueType: ProjectPlanStructureValue,
  value: string,
): ProjectProposalDetails {
  const source =
    level === "output"
      ? BUDGET_REQUEST_OUTPUT_OPTIONS
      : level === "operationalPlan"
        ? BUDGET_REQUEST_OPERATIONAL_PLAN_OPTIONS
        : BUDGET_REQUEST_ACTIVITY_OPTIONS;
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
    const output = BUDGET_REQUEST_OUTPUT_OPTIONS.find((option) =>
      selected.code.startsWith(option.code),
    );
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

  const operationalPlan = BUDGET_REQUEST_OPERATIONAL_PLAN_OPTIONS.find((option) =>
    selected.code.startsWith(option.code),
  );
  const output = BUDGET_REQUEST_OUTPUT_OPTIONS.find((option) =>
    selected.code.startsWith(option.code),
  );
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
