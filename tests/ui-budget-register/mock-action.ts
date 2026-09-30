import type { OperationState } from "@/features/shared/action-state";

declare global {
  interface Window {
    archiveCalls: { id: string; version: number }[];
  }
}

export async function archiveBudgetRequestAction(input: {
  id: string;
  version: number;
}): Promise<OperationState> {
  window.archiveCalls ??= [];
  window.archiveCalls.push(input);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const params = new URLSearchParams(window.location.search);
  if (params.has("network")) throw new Error("fixture network failure");
  if (params.has("error"))
    return { success: false, message: "รายการถูกเปลี่ยนสถานะแล้ว กรุณาเปิดทะเบียนใหม่" };
  return { success: true, message: "ย้ายคำขอ BR-TEST-001 ไปถังขยะแล้ว ผู้ดูแลระบบสามารถกู้คืนได้" };
}
