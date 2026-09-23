import type { OperationState } from "@/features/shared/action-state";
import type { ApprovedBudgetProjectSourceResult } from "@/features/projects/approved-budget-source";
import { sourceA, sourceB } from "./fixtures";

export const actionControl = {
  loads: [] as string[],
  saves: [] as Record<string, FormDataEntryValue>[],
  failNext: false,
  throwNext: false,
  holdNext: false,
  release: null as (() => void) | null,
};

declare global {
  interface Window {
    approvedBudgetTest: typeof actionControl;
  }
}

window.approvedBudgetTest = actionControl;

export async function loadApprovedBudgetProjectSourceAction(
  budgetRequestId: string,
): Promise<ApprovedBudgetProjectSourceResult> {
  actionControl.loads.push(budgetRequestId);
  if (actionControl.holdNext) {
    actionControl.holdNext = false;
    await new Promise<void>((resolve) => {
      actionControl.release = resolve;
    });
  }
  if (actionControl.throwNext) {
    actionControl.throwNext = false;
    throw new Error("Simulated offline failure");
  }
  if (actionControl.failNext) {
    actionControl.failNext = false;
    return { success: false, error: "ไม่สามารถโหลดคำของบตัวอย่างได้ กรุณาลองใหม่" };
  }
  const source = [sourceA, sourceB].find((item) => item.budgetRequestId === budgetRequestId);
  return source
    ? { success: true, data: structuredClone(source) }
    : { success: false, error: "ไม่พบคำของบตัวอย่าง" };
}

export async function saveProjectAction(
  previous: OperationState,
  formData: FormData,
): Promise<OperationState> {
  actionControl.saves.push(Object.fromEntries(formData));
  return { ...previous, success: true, message: "บันทึกข้อมูลในชุดทดสอบแล้ว" };
}
