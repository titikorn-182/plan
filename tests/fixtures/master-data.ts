import type { FiscalYearMasterData } from "@/features/shared/master-data";
import { createBudgetRequestSourceOptions } from "@/features/budget-requests/source-options";

export const TEST_FISCAL_YEAR_ID = "fiscal-2570";

export const TEST_MASTER_DATA: FiscalYearMasterData = {
  fiscalYearId: TEST_FISCAL_YEAR_ID,
  planStructures: [
    {
      level: "output",
      code: "3101",
      name: "ผลงานการให้บริการวิชาการ",
      parentCode: null,
    },
    {
      level: "operational_plan",
      code: "31013200",
      name: "แผนการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ",
      parentCode: "3101",
    },
    {
      level: "activity",
      code: "310132000001",
      name: "โครงการสนับสนุนส่งเสริมการดำเนินงานด้านบริการวิชาการ",
      parentCode: "31013200",
    },
    {
      level: "output",
      code: "1002",
      name: "ผู้สำเร็จการศึกษาด้านสังคมศาสตร์",
      parentCode: null,
    },
    {
      level: "operational_plan",
      code: "10021023",
      name: "แผนการผลิตบัณฑิตสาขาวิชารัฐประศาสนศาสตร์",
      parentCode: "1002",
    },
    {
      level: "activity",
      code: "100210230001",
      name: "โครงการผลิตบัณฑิตระดับปริญญาตรี คณะรัฐศาสตร์",
      parentCode: "10021023",
    },
  ],
  expenseOptions: [
    {
      expenditureBudget: "งบดำเนินงาน",
      expenseCategory: "ค่าใช้สอย",
      expenseSubcategory: "ค่าใช้สอยอื่น ๆ",
    },
    {
      expenditureBudget: "งบดำเนินงาน",
      expenseCategory: "ค่าใช้สอย",
      expenseSubcategory: "ค่าจ้างเหมาบริการ",
    },
    {
      expenditureBudget: "งบลงทุน",
      expenseCategory: "ครุภัณฑ์",
      expenseSubcategory: "ครุภัณฑ์สำนักงาน",
    },
    {
      expenditureBudget: "งบลงทุน",
      expenseCategory: "ค่าสิ่งก่อสร้าง",
      expenseSubcategory: "สิ่งก่อสร้าง",
    },
  ],
};

export const TEST_BUDGET_SOURCE_OPTIONS = createBudgetRequestSourceOptions(TEST_MASTER_DATA);
