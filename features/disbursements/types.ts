import type { Enums } from "@/types/database.generated";
import type { ProjectOption } from "@/features/projects/types";
import type { FiscalYearOption } from "@/features/shared/types";

export type DisbursementStatus = Enums<"disbursement_status">;
export type DisbursementStatusLabel = "ตามแผน" | "เฝ้าระวัง" | "รอเอกสาร" | "เบิกจ่ายล่าช้า";

export const DISBURSEMENT_STATUS_LABELS: Readonly<Record<string, DisbursementStatusLabel>> = {
  recorded: "ตามแผน",
  reconciled: "ตามแผน",
  pending_docs: "รอเอกสาร",
  delayed: "เบิกจ่ายล่าช้า",
};

export type DisbursementRow = {
  uuid: string;
  id: string;
  project: string;
  unit: string;
  approved: number;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  target: number;
  status: DisbursementStatusLabel;
};

export type DisbursementFormOptions = {
  projects: ProjectOption[];
  fiscalYears: FiscalYearOption[];
};
