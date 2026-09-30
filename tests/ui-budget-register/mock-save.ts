import type { BudgetRequestState } from "@/features/budget-requests/actions";
export async function saveBudgetRequestAction(
  previous: BudgetRequestState,
  data: FormData,
): Promise<BudgetRequestState> {
  if (
    data.get("intent") !== "save" ||
    data.get("fiscalYearId") !== "fiscal-2570" ||
    data.get("amount") !== "10000"
  ) {
    throw new Error("Approved form submitted invalid intent or protected values");
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (new URLSearchParams(location.search).has("save-error"))
    return {
      ...previous,
      success: false,
      message: "ข้อมูลถูกแก้ไขโดยผู้ใช้อื่น กรุณาเปิดรายการใหม่",
    };
  return {
    ...previous,
    version: (previous.version ?? 0) + 1,
    success: true,
    message: "บันทึกการแก้ไขแล้ว โดยคงสถานะอนุมัติแล้ว",
  };
}
export async function saveBudgetRequestBatchAction() {
  throw new Error("Import must not be used while editing");
}
