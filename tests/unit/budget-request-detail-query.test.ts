import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBudgetRequestDetail } from "@/features/budget-requests/detail-query";
import { createEmptyBudgetExpenseBreakdown } from "@/features/budget-requests/expense-categories";
import { createEmptyBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import { RETIRED_DEMO_FILTERS } from "@/features/shared/retired-demo-data";
import { QUERY_LIMITS } from "@/lib/config/limits";
import type { Tables } from "@/types/database.generated";

type DetailRow = Pick<
  Tables<"budget_requests">,
  | "id"
  | "code"
  | "version"
  | "title_th"
  | "organization_id"
  | "fiscal_year_id"
  | "budget_cycle_id"
  | "project_type"
  | "owner_name"
  | "rationale"
  | "requested_amount"
  | "expense_breakdown"
  | "proposal_details"
  | "status"
  | "updated_at"
  | "submitted_at"
> & {
  organizations: { name_th: string } | null;
  fiscal_years: { label: string } | null;
};
type ExpenseRow = Pick<
  Tables<"budget_lines">,
  "id" | "expense_category" | "description" | "quantity" | "unit_price" | "total"
>;
type QueryError = { code: string; message: string };

const mock = vi.hoisted(() => {
  const request = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn<() => Promise<{ data: DetailRow | null; error: QueryError | null }>>(),
  };
  const lines = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit:
      vi.fn<
        () => Promise<{ data: ExpenseRow[] | null; error: QueryError | null; count: number | null }>
      >(),
  };
  const client = {
    from: vi.fn((table: string) => (table === "budget_lines" ? lines : request)),
    rpc: vi.fn(),
  };
  return { request, lines, client, createClient: vi.fn(async () => client) };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: mock.createClient }));

const requestId = "60000000-0000-4000-8000-000000000001";

function detailRow(): DetailRow {
  return {
    id: requestId,
    code: "BR7042668913",
    version: 3,
    title_th: "โครงการส่งเสริมกิจกรรมเสริมหลักสูตร",
    organization_id: "20000000-0000-4000-8000-000000000001",
    fiscal_year_id: "30000000-0000-0000-0000-000000000001",
    budget_cycle_id: "30000000-0000-4000-8000-000000000002",
    project_type: "โครงการพัฒนานักศึกษา",
    owner_name: "หัวหน้าโครงการ",
    rationale: "หลักการและเหตุผลของคำขอ",
    requested_amount: 1234.5,
    expense_breakdown: null,
    proposal_details: {
      ...createEmptyBudgetProposalDetails(),
      subActivityName: "กิจกรรมต้นฉบับ",
      expenseItems: [
        {
          expenditureBudget: "งบดำเนินงาน",
          expenseCategory: "หมวดค่าใช้สอยเดิม",
          expenseSubcategory: "รายการเดิมที่ปิดใช้งานแล้ว",
          description: "รายละเอียดค่าใช้จ่ายตามคำขอ",
          amount: 1234.5,
        },
      ],
    },
    status: "under_review",
    updated_at: "2026-09-23T06:00:00Z",
    submitted_at: "2026-09-22T06:00:00Z",
    organizations: { name_th: "สำนักงานเลขานุการ" },
    fiscal_years: { label: "ปีงบประมาณ 2569 (ปิดแล้ว)" },
  };
}

function legacyLine(): ExpenseRow {
  return {
    id: "70000000-0000-4000-8000-000000000001",
    expense_category: "ค่าใช้สอย",
    description: "รายการเดิม",
    quantity: 2,
    unit_price: 617.25,
    total: 1234.5,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.request.maybeSingle.mockResolvedValue({ data: detailRow(), error: null });
  mock.lines.limit.mockResolvedValue({ data: [], error: null, count: 0 });
});

describe("read-only budget request detail", () => {
  it("reads one specific unarchived non-demo request using the authenticated client", async () => {
    const response = await getBudgetRequestDetail(requestId);

    expect(response.error).toBeNull();
    expect(mock.createClient).toHaveBeenCalledOnce();
    expect(mock.client.from).toHaveBeenCalledExactlyOnceWith("budget_requests");
    expect(mock.request.eq).toHaveBeenCalledExactlyOnceWith("id", requestId);
    expect(mock.request.is).toHaveBeenCalledExactlyOnceWith("archived_at", null);
    expect(mock.request.not).toHaveBeenCalledExactlyOnceWith(
      "id",
      "in",
      RETIRED_DEMO_FILTERS.budgetRequests,
    );
    expect(mock.request.select).toHaveBeenCalledWith(
      expect.stringContaining("organizations!budget_requests_organization_id_fkey(name_th)"),
    );
    expect(mock.request.select).toHaveBeenCalledWith(
      expect.stringContaining("fiscal_years!budget_requests_fiscal_year_id_fkey(label)"),
    );
    expect(mock.client.rpc).not.toHaveBeenCalled();
    expect(response.data).toMatchObject({
      id: requestId,
      code: "BR7042668913",
      amount: 1234.5,
      organizationName: "สำนักงานเลขานุการ",
      expenseLines: [],
      proposalDetails: { subActivityName: "กิจกรรมต้นฉบับ" },
    });
    expect(response.data).not.toHaveProperty("approvedAmount");
  });

  it("retains a closed historical year and obsolete categories without loading editor master data", async () => {
    const response = await getBudgetRequestDetail(requestId);
    expect(response.data?.fiscalYearLabel).toBe("ปีงบประมาณ 2569 (ปิดแล้ว)");
    expect(response.data?.proposalDetails.expenseItems[0].expenseSubcategory).toBe(
      "รายการเดิมที่ปิดใช้งานแล้ว",
    );
    expect(mock.client.from.mock.calls).toEqual([["budget_requests"]]);
    expect(mock.request.eq.mock.calls).toEqual([["id", requestId]]);
  });

  it.each(["submitted", "under_review", "pending_approval", "approved", "rejected"] as const)(
    "permits reading %s without requiring editable status",
    async (status) => {
      mock.request.maybeSingle.mockResolvedValue({ data: { ...detailRow(), status }, error: null });
      expect((await getBudgetRequestDetail(requestId)).data?.status).toBe(status);
    },
  );

  it("supports PostgreSQL GUIDs without RFC version bits", async () => {
    const legacyId = "60000000-0000-0000-0000-000000000099";
    mock.request.maybeSingle.mockResolvedValue({
      data: { ...detailRow(), id: legacyId },
      error: null,
    });
    expect((await getBudgetRequestDetail(legacyId)).data?.id).toBe(legacyId);
  });

  it.each(["", "BR7042668913", "not-a-uuid", "60000000-0000-4000-8000-000000000001/extra"])(
    "rejects invalid identifiers before database access: %s",
    async (id) => {
      expect(await getBudgetRequestDetail(id)).toEqual({
        data: null,
        error: "ไม่พบคำของบประมาณหรือคุณไม่มีสิทธิ์เข้าถึง",
      });
      expect(mock.createClient).not.toHaveBeenCalled();
    },
  );

  it("returns the same non-enumerating message when a record is absent or hidden by RLS", async () => {
    mock.request.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await getBudgetRequestDetail(requestId)).toEqual({
      data: null,
      error: "ไม่พบคำของบประมาณหรือคุณไม่มีสิทธิ์เข้าถึง",
    });
    expect(mock.client.from).toHaveBeenCalledOnce();
  });

  it("sanitizes database failures and does not query expenses after a failed source read", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mock.request.maybeSingle.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "sensitive raw database error" },
    });
    const response = await getBudgetRequestDetail(requestId);
    expect(response.data).toBeNull();
    expect(response.error).toBeTruthy();
    expect(response.error).not.toContain("sensitive raw database error");
    expect(mock.lines.limit).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      "[application-error]",
      expect.stringContaining('"operation":"budget_requests.detail"'),
    );
  });

  it.each([
    { proposal_details: { sdgs: ["unknown SDG"] } },
    { proposal_details: { expenseItems: [{ amount: -1 }] } },
    { expense_breakdown: { unexpected: 100 } },
    { requested_amount: Number.NaN },
    { organizations: null },
    { fiscal_years: null },
  ] satisfies Partial<DetailRow>[])(
    "does not fabricate partial detail from malformed data: %j",
    async (override) => {
      mock.request.maybeSingle.mockResolvedValue({
        data: { ...detailRow(), ...override },
        error: null,
      });
      const response = await getBudgetRequestDetail(requestId);
      expect(response.data).toBeNull();
      expect(response.error).toBe("ข้อมูลรายละเอียดคำขอไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ");
      expect(mock.lines.limit).not.toHaveBeenCalled();
    },
  );

  it("reads legacy relational expense lines only when JSON costs and breakdown are absent", async () => {
    mock.request.maybeSingle.mockResolvedValue({
      data: { ...detailRow(), proposal_details: null, submitted_at: null },
      error: null,
    });
    mock.lines.limit.mockResolvedValue({ data: [legacyLine()], error: null, count: 1 });
    const response = await getBudgetRequestDetail(requestId);

    expect(response.error).toBeNull();
    expect(response.data?.submittedAt).toBe("—");
    expect(response.data?.expenseLines).toEqual([
      {
        id: legacyLine().id,
        category: "ค่าใช้สอย",
        description: "รายการเดิม",
        quantity: 2,
        unitPrice: 617.25,
        total: 1234.5,
      },
    ]);
    expect(mock.lines.eq).toHaveBeenCalledExactlyOnceWith("budget_request_id", requestId);
    expect(mock.lines.select).toHaveBeenCalledWith(
      "id,expense_category,description,quantity,unit_price,total",
      { count: "exact" },
    );
    expect(mock.lines.limit).toHaveBeenCalledWith(QUERY_LIMITS.selectOptions);
    expect(mock.client.rpc).not.toHaveBeenCalled();
  });

  it("does not duplicate legacy lines when an expense breakdown already exists", async () => {
    mock.request.maybeSingle.mockResolvedValue({
      data: {
        ...detailRow(),
        proposal_details: {},
        expense_breakdown: { ...createEmptyBudgetExpenseBreakdown(), operating_services: 1234.5 },
      },
      error: null,
    });
    const response = await getBudgetRequestDetail(requestId);
    expect(response.error).toBeNull();
    expect(response.data?.expenseLines).toEqual([]);
    expect(mock.lines.limit).not.toHaveBeenCalled();
  });

  it("fails explicitly instead of presenting a truncated legacy expense table", async () => {
    mock.request.maybeSingle.mockResolvedValue({
      data: { ...detailRow(), proposal_details: {} },
      error: null,
    });
    mock.lines.limit.mockResolvedValue({ data: [legacyLine()], error: null, count: 2 });
    const response = await getBudgetRequestDetail(requestId);
    expect(response.data).toBeNull();
    expect(response.error).toContain("ไม่สามารถแสดงรายละเอียดค่าใช้จ่ายได้ครบ");
  });

  it("does not convert missing legacy totals into zero", async () => {
    mock.request.maybeSingle.mockResolvedValue({
      data: { ...detailRow(), proposal_details: {} },
      error: null,
    });
    mock.lines.limit.mockResolvedValue({
      data: [{ ...legacyLine(), total: null }],
      error: null,
      count: 1,
    });
    const response = await getBudgetRequestDetail(requestId);
    expect(response.data).toBeNull();
    expect(response.error).toBe("ข้อมูลรายละเอียดคำขอไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ");
  });

  it.each([
    { data: null, error: null, count: 0 },
    { data: [], error: null, count: null },
  ])("requires a complete counted result for legacy expenses: %j", async (linesResult) => {
    mock.request.maybeSingle.mockResolvedValue({
      data: { ...detailRow(), proposal_details: {} },
      error: null,
    });
    mock.lines.limit.mockResolvedValue(linesResult);
    const response = await getBudgetRequestDetail(requestId);
    expect(response.data).toBeNull();
    expect(response.error).toContain("ไม่สามารถแสดงรายละเอียดค่าใช้จ่ายได้ครบ");
  });

  it("reports legacy expense failures without presenting a partial request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mock.request.maybeSingle.mockResolvedValue({
      data: { ...detailRow(), proposal_details: {} },
      error: null,
    });
    mock.lines.limit.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "private line detail" },
      count: null,
    });
    const response = await getBudgetRequestDetail(requestId);
    expect(response.data).toBeNull();
    expect(response.error).toBeTruthy();
    expect(response.error).not.toContain("private line detail");
  });
});
