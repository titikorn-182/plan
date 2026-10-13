import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectProposalPdfData } from "@/features/projects/project-proposal-pdf-query";
import { createEmptyProjectProposalDetails } from "@/features/projects/proposal-details";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";

vi.mock("@/lib/observability/server-logger", () => ({
  reportServerError: () => "test",
  publicFailureMessage: () => "Query failed",
}));

function fixture() {
  return {
    code: "PR-TEST",
    organization_id: "org",
    fiscal_year_id: "year",
    budget_request_id: "budget",
    title_th: "โครงการทดสอบ",
    project_type: "บริการวิชาการ",
    owner_name: "หัวหน้า",
    coordinator_name: "ผู้ประสานงาน",
    approved_budget: 232200,
    disbursement_target: 100,
    starts_on: "2026-10-01",
    ends_on: "2027-09-30",
    status: "active",
    proposal_details: createEmptyProjectProposalDetails(),
  };
}

type Reply = { data: unknown; error: { message: string } | null };
let replies: Record<string, Reply>;
const queries = new Map<string, ReturnType<typeof query>>();
function query(reply: Reply) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(reply),
  };
}
const from = vi.fn((table: string) => {
  if (!replies[table]) throw new Error(`Unexpected broad lookup: ${table}`);
  const builder = query(replies[table]);
  queries.set(table, builder);
  return builder;
});
const client = { from } as unknown as Parameters<typeof getProjectProposalPdfData>[0];

beforeEach(() => {
  from.mockClear();
  queries.clear();
  replies = {
    projects: { data: fixture(), error: null },
    organizations: { data: { name_th: "หน่วยงานทดสอบ" }, error: null },
    fiscal_years: { data: { label: "ปีงบประมาณ 2570" }, error: null },
    budget_requests: {
      data: { code: "BR-TEST", title_th: "คำของบ", sub_activity_name: " กิจกรรมย่อย " },
      error: null,
    },
  };
});

describe("targeted proposal PDF query", () => {
  it("loads one project and only its three references, preserving document fields", async () => {
    const response = await getProjectProposalPdfData(client, "project-id");
    expect(response.error).toBeNull();
    expect(response.data).toEqual({
      code: "PR-TEST",
      title: "โครงการทดสอบ",
      organizationName: "หน่วยงานทดสอบ",
      fiscalYearLabel: "ปีงบประมาณ 2570",
      budgetRequestLabel: "BR-TEST · กิจกรรมย่อย",
      projectType: "บริการวิชาการ",
      ownerName: "หัวหน้า",
      coordinatorName: "ผู้ประสานงาน",
      approvedBudget: 232200,
      disbursementTarget: 100,
      startsOn: "2026-10-01",
      endsOn: "2027-09-30",
      status: "active",
      proposalDetails: fixture().proposal_details,
    });
    expect(from.mock.calls.map(([table]) => table)).toEqual([
      "projects",
      "organizations",
      "fiscal_years",
      "budget_requests",
    ]);
    for (const [table, id] of [
      ["projects", "project-id"],
      ["organizations", "org"],
      ["fiscal_years", "year"],
      ["budget_requests", "budget"],
    ])
      expect(queries.get(table)?.eq).toHaveBeenCalledWith("id", id);
    expect(queries.get("projects")?.is).toHaveBeenCalledWith("archived_at", null);
    expect(queries.get("organizations")?.eq).toHaveBeenCalledWith("is_active", true);
    expect(queries.get("fiscal_years")?.in).toHaveBeenCalledWith("status", ["open", "closed"]);
    expect(queries.get("budget_requests")?.eq).toHaveBeenCalledWith("status", "approved");
    expect(queries.get("budget_requests")?.is).toHaveBeenCalledWith("archived_at", null);
    expect(queries.get("budget_requests")?.not).toHaveBeenCalledWith(
      "id",
      "in",
      RETIRED_DEMO_FILTERS.budgetRequests,
    );
  });

  it("does not query references for missing, archived or RLS-hidden projects", async () => {
    replies.projects.data = null;
    expect((await getProjectProposalPdfData(client, "hidden")).data).toBeNull();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("does not load unrelated budgets when the project has no budget reference", async () => {
    replies.projects.data = { ...fixture(), budget_request_id: null };
    expect((await getProjectProposalPdfData(client, "project")).data?.budgetRequestLabel).toBe(
      "ไม่ได้อ้างอิงคำของบ",
    );
    expect(from).toHaveBeenCalledTimes(3);
  });

  it("preserves placeholders for references hidden by RLS or reference filters", async () => {
    replies.organizations.data = replies.fiscal_years.data = replies.budget_requests.data = null;
    expect((await getProjectProposalPdfData(client, "project")).data).toMatchObject({
      organizationName: "-",
      fiscalYearLabel: "-",
      budgetRequestLabel: "-",
    });
  });

  it("falls back to the budget title when the sub-activity name is blank", async () => {
    replies.budget_requests.data = { code: "BR-TEST", title_th: "คำของบ", sub_activity_name: " " };
    expect((await getProjectProposalPdfData(client, "project")).data?.budgetRequestLabel).toBe(
      "BR-TEST · คำของบ",
    );
  });

  it("rejects malformed proposal data before querying references", async () => {
    replies.projects.data = { ...fixture(), proposal_details: { expenseItems: "invalid" } };
    expect((await getProjectProposalPdfData(client, "project")).data).toBeNull();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it.each(["projects", "organizations", "fiscal_years", "budget_requests"])(
    "fails closed on a %s query error",
    async (table) => {
      replies[table].error = { message: "unavailable" };
      const response = await getProjectProposalPdfData(client, "project");
      expect(response.data).toBeNull();
      expect(response.error).toBeTruthy();
    },
  );
});
