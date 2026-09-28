import { saveProjectAction } from "@/features/projects/actions";
import type { OperationState } from "@/features/shared/action-state";

export type ProjectSaveState = OperationState & { submitted?: boolean };

/** Keep transport failures inside the form instead of unmounting entered data. */
export async function saveProjectForm(
  previous: ProjectSaveState,
  formData: FormData,
): Promise<ProjectSaveState> {
  try {
    const result = await saveProjectAction(previous, formData);
    return {
      ...result,
      submitted: result.success ? formData.get("intent") === "submit" : previous.submitted,
    };
  } catch {
    // A lost response does not prove the transaction failed. Do not auto-retry.
    return {
      id: previous.id,
      version: previous.version,
      submitted: previous.submitted,
      success: false,
      message:
        "ยังยืนยันผลการบันทึกไม่ได้ ข้อมูลที่กรอกยังอยู่ในหน้านี้ กรุณาตรวจสอบการเชื่อมต่อและทะเบียนโครงการก่อนบันทึกซ้ำ",
    };
  }
}
