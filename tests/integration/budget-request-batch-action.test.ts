import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveBudgetRequestBatchAction } from "@/features/budget-requests/batch-actions";
import { createEmptyBudgetRequestSourceValues } from "@/features/budget-requests/source-fields";

vi.mock("@/features/shared/master-data-queries", async () => {
  const { TEST_MASTER_DATA } = await import("@/tests/fixtures/master-data");
  return {
    getFiscalYearMasterDataCatalogs: vi.fn(async (fiscalYearIds: readonly string[]) => ({
      data: fiscalYearIds.map((fiscalYearId) => ({ ...TEST_MASTER_DATA, fiscalYearId })),
      error: null,
    })),
  };
});

type QueryResponse = {
  data: Record<string, unknown> | Record<string, unknown>[] | null;
  error: { message: string } | null;
};
const mock = vi.hoisted(() => {
  const responses: QueryResponse[] = [];
  const terminal = vi.fn(async () => {
    const result = responses.shift();
    if (!result) throw new Error("Unexpected database call: add an explicit test response");
    return result;
  });
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: terminal,
    single: terminal,
    insert: vi.fn(() => ({ select: terminal })),
  };
  const client = {
    from: vi.fn(() => chain),
    auth: {
      getClaims: vi.fn(async () => ({
        data: { claims: { sub: "10000000-0000-4000-8000-000000000004" } },
        error: null,
      })),
    },
  };
  return { responses, chain, client, revalidate: vi.fn() };
});
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.client }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));

const legacyFiscalYearId = "20000000-0000-0000-0000-000000000001";
const organizationId = "20000000-0000-4000-8000-000000000001";

function batchForm(fiscalYearId: string) {
  const formData = new FormData();
  formData.set(
    "batchPayload",
    JSON.stringify({
      fiscalYearId,
      budgetCycleId: "40000000-0000-4000-8000-000000000001",
      groups: [
        {
          id: "310132000001",
          organizationId,
          rowNumbers: [2],
          projectMembers: [],
          values: {
            ...createEmptyBudgetRequestSourceValues(),
            activityCode: "310132000001",
            projectActivityName: "โครงการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ",
            projectType: "2 โครงการประจำตามภารกิจ",
            organizationCode: "2301",
            organizationName: "สำนักงานเลขานุการ-งานแผนและงบประมาณ",
            ownerName: "หัวหน้าโครงการ ทดสอบ",
          },
          expenseItems: [
            {
              expenditureBudget: "งบดำเนินงาน",
              expenseCategory: "ค่าใช้สอย",
              expenseSubcategory: "ค่าจ้างเหมาบริการ",
              description: "ค่าจ้างจัดทำเอกสาร",
              amount: 1000,
            },
          ],
        },
      ],
    }),
  );
  return formData;
}

function lookupResponses(cycleFiscalYearId = legacyFiscalYearId) {
  mock.responses.push(
    { data: { buddhist_year: 2570 }, error: null },
    { data: { fiscal_year_id: cycleFiscalYearId }, error: null },
    {
      data: [{ id: organizationId, name_th: "สำนักงานเลขานุการ-งานแผนและงบประมาณ" }],
      error: null,
    },
    { data: [], error: null },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mock.responses.length = 0;
});

describe("batch budget requests with the retained fiscal-year 2570 ID", () => {
  it("inserts the draft using the unchanged legacy fiscal-year ID", async () => {
    lookupResponses();
    mock.responses.push({ data: [{ code: "TEST-BR-BATCH" }], error: null });

    const result = await saveBudgetRequestBatchAction({}, batchForm(legacyFiscalYearId));

    expect(result).toMatchObject({
      success: true,
      createdCount: 1,
      createdCodes: ["TEST-BR-BATCH"],
    });
    expect(mock.chain.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        fiscal_year_id: legacyFiscalYearId,
        organization_id: organizationId,
        requested_amount: 1000,
        status: "draft",
      }),
    ]);
    expect(mock.revalidate).toHaveBeenCalledWith("/budget-requests");
  });

  it("rejects a cycle from a different fiscal year before inserting", async () => {
    lookupResponses("30000000-0000-4000-8000-000000000002");

    const result = await saveBudgetRequestBatchAction({}, batchForm(legacyFiscalYearId));

    expect(result).toMatchObject({
      success: false,
      message: "ปีงบประมาณไม่ตรงกับรอบรับคำขอ กรุณาเลือกใหม่",
    });
    expect(mock.chain.insert).not.toHaveBeenCalled();
  });

  it.each(["", "2570", "20000000-0000-0000-0000-00000000000g"])(
    "rejects malformed fiscal-year ID %j before authentication or insertion",
    async (fiscalYearId) => {
      const result = await saveBudgetRequestBatchAction({}, batchForm(fiscalYearId));

      expect(result).toMatchObject({
        success: false,
        errors: ["กรุณาเลือกปีงบประมาณ"],
      });
      expect(mock.client.auth.getClaims).not.toHaveBeenCalled();
      expect(mock.client.from).not.toHaveBeenCalled();
      expect(mock.chain.insert).not.toHaveBeenCalled();
    },
  );
});
