import type { OperationState } from "@/features/shared/action-state";

declare global {
  interface Window {
    archiveCalls: { id: string; version: number }[];
    revisionCalls: { projectId: string; operation: string; reason: string }[];
  }
}

export async function projectRevisionAction(input: {
  projectId: string;
  operation: string;
  reason: string;
}): Promise<OperationState> {
  window.revisionCalls ??= [];
  window.revisionCalls.push(input);
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (new URLSearchParams(location.search).has("network")) throw new Error("test network failure");
  return {
    success: true,
    message:
      input.operation === "request"
        ? "ส่งคำขอแก้ไขแล้ว รอผู้ดูแลระบบพิจารณา"
        : "ส่งกลับแก้ไขแล้ว เจ้าหน้าที่สามารถแก้ไขและส่งอนุมัติใหม่ได้",
  };
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

export async function archiveProjectAction(input: {
  id: string;
  version: number;
}): Promise<OperationState> {
  const result = await archiveBudgetRequestAction(input);
  return { ...result, message: result.message?.replace("คำขอ BR-TEST-001", "โครงการ PR-TEST-001") };
}
