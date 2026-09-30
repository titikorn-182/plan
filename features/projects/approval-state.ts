import type { ProjectRow } from "./types";

type ApprovalPresentation = {
  label: string;
  tone: "orange" | "red" | "green" | "gray" | "blue";
  help: string;
};

export const PROJECT_APPROVAL_STATES = {
  awaiting_submission: {
    label: "รอส่งอนุมัติ",
    tone: "gray",
    help: "ยังไม่มีงานอนุมัติที่รอพิจารณา เจ้าของรายการสามารถตรวจข้อมูลและส่งอนุมัติได้ตามสิทธิ์",
  },
  unit_review: {
    label: "รอตรวจระดับหน่วยงาน",
    tone: "orange",
    help: "ข้อเสนอโครงการยังรอผู้ตรวจระดับหน่วยงาน หากต้องแก้ไขตอนนี้ ให้ติดต่อผู้ตรวจเพื่อส่งกลับแก้ไข",
  },
  executive_review: {
    label: "รอผู้บริหารอนุมัติ",
    tone: "orange",
    help: "ข้อเสนอโครงการยังรอผู้บริหารอนุมัติ หากต้องแก้ไขตอนนี้ ให้ติดต่อผู้พิจารณาเพื่อส่งกลับแก้ไข",
  },
  pending: {
    label: "อยู่ระหว่างอนุมัติ",
    tone: "orange",
    help: "ยังมีงานอนุมัติรอพิจารณา กรุณาติดต่อผู้พิจารณาหากต้องการให้ส่งกลับแก้ไข",
  },
  approved: {
    label: "อนุมัติแล้ว",
    tone: "green",
    help: "ข้อเสนอโครงการอนุมัติแล้ว เจ้าหน้าที่เจ้าของรายการขอแก้ไขพร้อมเหตุผลเพื่อให้ผู้ดูแลระบบพิจารณาได้",
  },
  revision_required: {
    label: "ส่งกลับแก้ไข",
    tone: "orange",
    help: "เจ้าหน้าที่เจ้าของรายการสามารถแก้ไขและส่งอนุมัติใหม่ได้ตามสิทธิ์",
  },
  rejected: {
    label: "ไม่อนุมัติ",
    tone: "red",
    help: "ข้อเสนอโครงการไม่ได้รับอนุมัติ กรุณาตรวจผลการพิจารณาก่อนแก้ไขและส่งใหม่",
  },
  on_hold: {
    label: "พักโครงการ",
    tone: "gray",
    help: "โครงการอยู่ระหว่างพักดำเนินการ กรุณาติดต่อผู้ดูแลระบบ",
  },
  completed: {
    label: "ปิดโครงการแล้ว",
    tone: "blue",
    help: "โครงการปิดแล้ว ไม่อยู่ในเงื่อนไขขอแก้ไขหลังอนุมัติ",
  },
  cancelled: {
    label: "ยกเลิกโครงการ",
    tone: "gray",
    help: "โครงการถูกยกเลิก ไม่อยู่ในเงื่อนไขขอแก้ไขหลังอนุมัติ",
  },
  unknown: {
    label: "ตรวจสอบสถานะ",
    tone: "gray",
    help: "ยังยืนยันขั้นตอนอนุมัติไม่ได้ กรุณาเปิดทะเบียนใหม่หรือติดต่อผู้ดูแลระบบ",
  },
} as const satisfies Record<string, ApprovalPresentation>;

export type ProjectApprovalState = keyof typeof PROJECT_APPROVAL_STATES;

export function parseProjectApprovalState(value: unknown): ProjectApprovalState {
  return typeof value === "string" && Object.hasOwn(PROJECT_APPROVAL_STATES, value)
    ? (value as ProjectApprovalState)
    : "unknown";
}

export function projectApprovalPresentation(project: Pick<ProjectRow, "approvalState">) {
  return PROJECT_APPROVAL_STATES[project.approvalState ?? "unknown"];
}

export function projectRevisionUnavailableReason(project: ProjectRow): string {
  if (project.approvalState === "approved") {
    return "ขอแก้ไขได้เฉพาะเจ้าหน้าที่เจ้าของรายการ ผู้ดูแลระบบส่งกลับได้เมื่อเจ้าหน้าที่ส่งคำขอพร้อมเหตุผลแล้ว";
  }
  return projectApprovalPresentation(project).help;
}
