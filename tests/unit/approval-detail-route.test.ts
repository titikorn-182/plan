import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BudgetRequestDetailPage from "@/app/(workspace)/budget-requests/[id]/page";
import { getWorkspaceTitle } from "@/components/layout/navigation";
import { ApprovalsView } from "@/features/approvals/components/approvals-view";
import type { WorkflowTask } from "@/features/approvals/types";
import { getBudgetRequestDetail } from "@/features/budget-requests/detail-query";
import type { BudgetRequestDetail } from "@/features/budget-requests/detail-types";
import { createEmptyBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import type { DocumentStatus } from "@/features/budget-requests/types";

vi.mock("@/features/budget-requests/detail-query", () => ({
  getBudgetRequestDetail: vi.fn(),
}));
vi.mock("@/features/approvals/actions", () => ({ actOnApprovalAction: vi.fn() }));

const budgetId = "6b3272c9-a347-4acd-98a3-62226b31f687";
const taskId = "68d73c16-43d5-4cb8-85c0-0a97d1246a77";
const record: BudgetRequestDetail = {
  id: budgetId,
  code: "BR7042668913",
  version: 3,
  title: "โครงการส่งเสริมและสนับสนุนกิจกรรมเสริมหลักสูตร",
  organizationId: "64ee6e2b-ff45-47bd-9004-067450f01f51",
  organizationName: "คณะรัฐศาสตร์",
  fiscalYearId: "dfb0b66e-57a3-40e5-99e3-a26743a43b87",
  fiscalYearLabel: "ปีงบประมาณ 2570",
  budgetCycleId: "89bc13e8-a2d4-471d-b780-3178559408cc",
  projectType: "โครงการประจำตามภารกิจ",
  ownerName: "หัวหน้าโครงการทดสอบ",
  rationale: "พัฒนาทักษะนักศึกษา",
  amount: 1250,
  expenseBreakdown: null,
  proposalDetails: {
    ...createEmptyBudgetProposalDetails(),
    organizationName: "สำนักงานเลขานุการ-งานพัฒนานักศึกษาและศิษย์เก่า",
    subActivityName: "กิจกรรมพัฒนาทักษะการทำงานร่วมกัน",
    objectives: "นักศึกษาทำงานร่วมกันได้",
    expenseItems: [
      {
        expenditureBudget: "งบดำเนินงาน",
        expenseCategory: "ค่าตอบแทน",
        expenseSubcategory: "ค่าตอบแทนวิทยากร",
        description: "วิทยากรส่งเสริมทักษะ",
        amount: 1250,
      },
    ],
  },
  status: "submitted",
  updatedAt: "23 ก.ย. 2569",
  submittedAt: "23 ก.ย. 2569",
  expenseLines: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getBudgetRequestDetail).mockResolvedValue({ data: record, error: null });
});

describe("workflow budget detail route", () => {
  it.each([
    ["/budget-requests", "คำของบประมาณประจำปี"],
    ["/budget-requests/new", "สร้างคำของบประมาณ"],
    [`/budget-requests/${budgetId}`, "รายละเอียดคำของบประมาณ"],
    [`/budget-requests/${budgetId}/edit`, "แก้ไขคำของบประมาณ"],
  ])("uses the correct workspace heading for %s", (pathname, title) => {
    expect(getWorkspaceTitle(pathname)).toBe(title);
  });

  it.each<DocumentStatus>(["submitted", "under_review", "pending_approval", "approved"])(
    "opens %s requests read-only without requiring an editable form",
    async (status) => {
      vi.mocked(getBudgetRequestDetail).mockResolvedValue({
        data: { ...record, status },
        error: null,
      });
      const html = renderToStaticMarkup(
        await BudgetRequestDetailPage({ params: Promise.resolve({ id: budgetId }) }),
      );
      expect(getBudgetRequestDetail).toHaveBeenCalledExactlyOnceWith(budgetId);
      for (const value of [
        record.code,
        record.title,
        record.fiscalYearLabel,
        record.rationale,
        record.proposalDetails.subActivityName,
        "1,250.00",
      ]) {
        expect(html).toContain(value);
      }
      expect(html).toContain('aria-label="รายละเอียดคำของบประมาณ"');
      expect(html).toContain('href="/approvals"');
      expect(html).toContain("กลับไป Workflow อนุมัติ");
      expect(html).not.toMatch(/<(?:form|input|select|textarea)\b/);
      expect(html).not.toContain(`/budget-requests/${budgetId}/edit`);
    },
  );

  it("shows a recoverable generic unavailable state instead of exposing a missing record", async () => {
    vi.mocked(getBudgetRequestDetail).mockResolvedValue({ data: null, error: null });
    const html = renderToStaticMarkup(
      await BudgetRequestDetailPage({ params: Promise.resolve({ id: budgetId }) }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("ไม่สามารถเปิดรายละเอียดคำของบประมาณได้");
    expect(html).toContain('href="/approvals"');
    expect(html).not.toContain(record.code);
    expect(html).not.toContain(record.title);
  });

  it("does not render partial data when the query reports an error", async () => {
    vi.mocked(getBudgetRequestDetail).mockResolvedValue({
      data: record,
      error: "ไม่สามารถอ่านข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
    });
    const html = renderToStaticMarkup(
      await BudgetRequestDetailPage({ params: Promise.resolve({ id: budgetId }) }),
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('href="/approvals"');
    expect(html).not.toContain(record.code);
    expect(html).not.toContain(record.title);
    expect(html).not.toMatch(/<(?:form|input|select|textarea)\b/);
  });
});

describe("workflow supporting information links", () => {
  it.each(["pending", "approved"] as const)(
    "links a %s budget task to the request UUID, not its task UUID or the register",
    (status) => {
      const task: WorkflowTask = {
        id: taskId,
        entityType: "budget_request",
        entityId: budgetId,
        businessId: record.code,
        title: record.title,
        unit: record.organizationName,
        requiredRole: "user",
        status,
        dueAt: "30 ก.ย. 2569",
        createdAt: "23 ก.ย. 2569",
        canAct: false,
        overdue: false,
      };
      const html = renderToStaticMarkup(
        createElement(ApprovalsView, {
          tasks: [task],
          pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
          view: status === "pending" ? "pending" : "history",
        }),
      );
      expect(html).toContain(`href="/budget-requests/${budgetId}"`);
      expect(html).not.toContain(`href="/approvals/${taskId}"`);
      expect(html).not.toContain(`href="/budget-requests/${taskId}"`);
      expect(html).not.toContain(`href="/budget-requests/${budgetId}/edit"`);
      expect(html).not.toContain('href="/budget-requests"');
    },
  );
});
