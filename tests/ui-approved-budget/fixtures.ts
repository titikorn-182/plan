import type { ProjectFormOptions } from "@/features/projects/types";
import type { ApprovedBudgetProjectSource } from "@/features/projects/approved-budget-source";
import {
  createEmptyProjectProposalDetails,
  FACULTY_STRATEGIES,
  PROJECT_CHARACTERISTICS,
} from "@/features/projects/proposal-details";
import { SDG_OPTIONS } from "@/features/shared/sdgs";
import { TEST_MASTER_DATA } from "../fixtures/master-data";

export const sourceA: ApprovedBudgetProjectSource = {
  budgetRequestId: "755030d6-709f-4443-9df6-4e07938c6987",
  code: "BR700001",
  title: "กิจกรรมพัฒนาทักษะนักศึกษา",
  organizationId: "unit-a",
  fiscalYearId: "fiscal-2570",
  ownerName: "ผู้รับผิดชอบตัวอย่าง ก",
  startsOn: "2026-10-01",
  endsOn: "2027-03-31",
  requestedAmount: 25000,
  warnings: ["ข้อมูลตัวอย่าง: กรุณาตรวจสอบหน่วย จำนวน ครั้ง ก่อนส่งข้อเสนอ"],
  details: {
    ...createEmptyProjectProposalDetails(),
    characteristics: [PROJECT_CHARACTERISTICS[0]],
    strategies: [FACULTY_STRATEGIES[0]],
    projectHeadPosition: "อาจารย์",
    responsiblePeople: [{ name: "ผู้ประสานงานตัวอย่าง", position: "เจ้าหน้าที่" }],
    rationale: "พัฒนาทักษะการทำงานร่วมกันและการเรียนรู้ของนักศึกษา",
    objectives: "นักศึกษาสามารถทำงานร่วมกันได้",
    targetGroup: "นักศึกษา 50 คน",
    expectedResults: "นักศึกษามีทักษะการทำงานร่วมกันเพิ่มขึ้น",
    sdgs: [SDG_OPTIONS[3]],
    sdgAlignmentDescription: "ส่งเสริมการศึกษาที่มีคุณภาพ",
    outputCode: "1002",
    outputName: "ผู้สำเร็จการศึกษาด้านสังคมศาสตร์",
    operationalPlanCode: "10021023",
    operationalPlanName: "แผนการผลิตบัณฑิตสาขาวิชารัฐประศาสนศาสตร์",
    activityCode: "100210230001",
    projectActivityName: "โครงการผลิตบัณฑิตระดับปริญญาตรี คณะรัฐศาสตร์",
    expenseItems: [
      {
        category: "ค่าใช้สอย",
        description: "วัสดุและบริการสำหรับกิจกรรม",
        rate: 25000,
        units: 1,
        quantity: 1,
        occurrences: 1,
        amount: 25000,
        expenditureBudget: "งบดำเนินงาน",
        expenseSubcategory: "ค่าใช้สอยอื่น ๆ",
      },
    ],
  },
};

export const sourceB: ApprovedBudgetProjectSource = {
  ...structuredClone(sourceA),
  budgetRequestId: "6141321a-459a-4431-a254-54b44a7023ee",
  code: "BR710002",
  title: "กิจกรรมบริการวิชาการชุมชน",
  organizationId: "unit-b",
  fiscalYearId: "fiscal-2571",
  ownerName: "ผู้รับผิดชอบตัวอย่าง ข",
  startsOn: "2027-10-01",
  endsOn: "2028-03-31",
  requestedAmount: 32000,
  details: {
    ...structuredClone(sourceA.details),
    objectives: "นำความรู้ไปใช้บริการชุมชน",
    expenseItems: [{ ...sourceA.details.expenseItems[0], rate: 32000, amount: 32000 }],
  },
};

export const formOptions: ProjectFormOptions = {
  organizations: [
    { id: "unit-a", code: "POL", label: "คณะรัฐศาสตร์" },
    { id: "unit-b", code: "COM", label: "หน่วยบริการวิชาการ" },
  ],
  fiscalYears: [
    { id: "fiscal-2570", label: "2570", buddhistYear: 2570 },
    { id: "fiscal-2571", label: "2571", buddhistYear: 2571 },
  ],
  masterData: [TEST_MASTER_DATA, { ...TEST_MASTER_DATA, fiscalYearId: "fiscal-2571" }],
  budgetRequests: [sourceA, sourceB].map((source) => ({
    id: source.budgetRequestId,
    label: `${source.code} · ${source.title}`,
    code: source.code,
    title: source.title,
    organizationId: source.organizationId,
    fiscalYearId: source.fiscalYearId,
  })),
  defaultOwnerName: "ผู้จัดทำตัวอย่าง",
  record: null,
};
