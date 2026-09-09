import type { Enums } from "@/types/database.generated";
import type { BudgetExpenseBreakdown } from "@/features/budget-requests/expense-categories";

export type DocumentStatus = Enums<"document_status">;
export type BudgetStatus =
  "ฉบับร่าง" | "รอตรวจสอบ" | "รออนุมัติ" | "อนุมัติแล้ว" | "ส่งกลับแก้ไข" | "ยกเลิก";

export const BUDGET_STATUS_LABELS: Readonly<Record<string, BudgetStatus>> = {
  draft: "ฉบับร่าง",
  submitted: "รอตรวจสอบ",
  under_review: "รอตรวจสอบ",
  pending_approval: "รออนุมัติ",
  revision_required: "ส่งกลับแก้ไข",
  approved: "อนุมัติแล้ว",
  rejected: "ส่งกลับแก้ไข",
  withdrawn: "ยกเลิก",
  cancelled: "ยกเลิก",
};

export type BudgetRequest = {
  uuid: string;
  id: string;
  title: string;
  unit: string;
  category: string;
  amount: number;
  status: BudgetStatus;
  updated: string;
  editable: boolean;
};

export type BudgetFormOptions = {
  organizations: { id: string; name: string }[];
  fiscalYears: BudgetFiscalYearOption[];
  record: BudgetFormRecord | null;
};

export type BudgetFiscalYearOption = {
  id: string;
  label: string;
  budgetCycleId: string;
};

export type BudgetFormRecord = {
  id: string;
  code: string;
  version: number;
  title: string;
  organizationId: string;
  fiscalYearId: string;
  budgetCycleId: string;
  projectType: string;
  ownerName: string;
  rationale: string;
  amount: number;
  expenseBreakdown: BudgetExpenseBreakdown | null;
  status: DocumentStatus;
};
