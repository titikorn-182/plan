import type { BudgetRequestDetail } from "@/features/budget-requests/detail-types";
import { createEmptyBudgetProposalDetails } from "@/features/budget-requests/proposal-details";
import { SDG_OPTIONS } from "@/features/shared/sdgs";

export const escapedText = '<img src=x onerror="document.body.dataset.injected=1">';
export const longToken = `https://example.invalid/${"budget-detail-readable-".repeat(14)}`;

export const detailedRequest: BudgetRequestDetail = {
  id: "59958810-932c-4b48-b227-985ba2f9b1d1",
  code: "BR70TEST001",
  version: 2,
  title: "โครงการส่งเสริมและสนับสนุนกิจกรรมเสริมหลักสูตรเพื่อพัฒนาศักยภาพนักศึกษาอย่างยั่งยืน",
  organizationId: "organization-test",
  organizationName: "คณะรัฐศาสตร์",
  fiscalYearId: "fiscal-2570",
  fiscalYearLabel: "2570",
  budgetCycleId: "cycle-test",
  projectType: "พัฒนานักศึกษา",
  ownerName: "หัวหน้าโครงการตัวอย่าง",
  rationale:
    "ส่งเสริมให้นักศึกษามีทักษะการทำงานร่วมกันและมีส่วนร่วมในการพัฒนาชุมชนอย่างยั่งยืน\n" +
    "การเรียนรู้จากการลงมือปฏิบัติช่วยเชื่อมโยงองค์ความรู้กับการทำงานในสถานการณ์จริง ".repeat(6),
  amount: 88399.94,
  expenseBreakdown: null,
  status: "under_review",
  updatedAt: "23 ก.ย. 2569",
  submittedAt: "22 ก.ย. 2569",
  expenseLines: [],
  proposalDetails: {
    ...createEmptyBudgetProposalDetails(),
    organizationCode: "2301",
    organizationName: "สำนักงานเลขานุการ-งานพัฒนานักศึกษาและศิษย์เก่า",
    fundingSource: "เงินรายได้",
    fundingSourceDetail: "รายได้จากการจัดการศึกษา",
    missionName: "ผลิตบัณฑิตที่มีคุณภาพ",
    universityStrategy: "พัฒนานักศึกษาและส่งเสริมการเรียนรู้ตลอดชีวิต",
    goalName: "นักศึกษามีทักษะที่จำเป็นต่อการทำงาน",
    strategyName: "ส่งเสริมการเรียนรู้จากประสบการณ์",
    fundCode: "8",
    fundName: "กองทุนกิจการนักศึกษา",
    outputCode: "1002",
    outputName: "ผู้สำเร็จการศึกษาด้านสังคมศาสตร์",
    operationalPlanCode: "10021023",
    operationalPlanName: "แผนการผลิตบัณฑิตสาขาวิชารัฐประศาสนศาสตร์",
    activityCode: "100210230001",
    subActivityName: "กิจกรรมพัฒนาทักษะการทำงานร่วมกันของนักศึกษา",
    targetGroup: "นักศึกษา 80 คน และบุคลากร 5 คน",
    startsOn: "2026-11-01",
    endsOn: "2026-11-30",
    expectedBenefits: "นักศึกษาสามารถวางแผนและทำกิจกรรมเพื่อประโยชน์ของชุมชนได้",
    objectives: `พัฒนาทักษะการทำงานร่วมกัน\nข้อความที่ต้องแสดงเป็นข้อความธรรมดา: ${escapedText}\n${longToken}`,
    ownerPosition: "อาจารย์ผู้รับผิดชอบกิจกรรม",
    alignmentDescription: "ส่งเสริมโอกาสทางการเรียนรู้อย่างเท่าเทียมและการพัฒนาที่ยั่งยืน",
    successIndicators: "ผู้เข้าร่วมอย่างน้อยร้อยละ 80 ผ่านเกณฑ์การประเมิน",
    sdgs: [SDG_OPTIONS[3], SDG_OPTIONS[9]],
    projectMembers: [
      { name: "ผู้รับผิดชอบตัวอย่างหนึ่ง", position: "นักวิชาการศึกษา" },
      { name: "ผู้รับผิดชอบตัวอย่างสอง", position: "เจ้าหน้าที่บริหารงานทั่วไป" },
    ],
    expenseItems: [
      {
        expenditureBudget: "งบดำเนินงาน",
        expenseCategory: "ค่าใช้สอย",
        expenseSubcategory: "ค่าใช้สอยอื่น ๆ",
        subActivityName: "การอบรมเชิงปฏิบัติการผู้นำนักศึกษา",
        fundingSource: "เงินรายได้กิจกรรม",
        fundingSourceDetail: "เงินสนับสนุนการพัฒนานักศึกษา",
        fundCode: "8",
        fundName: "กองทุนกิจการนักศึกษา",
        description: "ค่าอาหารและวัสดุประกอบการอบรมสำหรับผู้เข้าร่วมกิจกรรมตลอดระยะเวลาโครงการ",
        amount: 58399.94,
      },
      {
        expenditureBudget: "งบดำเนินงาน",
        expenseCategory: "ค่าตอบแทน",
        expenseSubcategory: "ค่าวิทยากร",
        description: "ค่าตอบแทนวิทยากรที่มีความเชี่ยวชาญในการพัฒนาศักยภาพนักศึกษา",
        amount: 30000,
      },
    ],
  },
};

export const legacyRequest: BudgetRequestDetail = {
  ...detailedRequest,
  title: "คำของบประมาณรูปแบบเดิม",
  rationale: "ข้อมูลคำขอที่บันทึกไว้ก่อนมีแบบฟอร์มรายละเอียดใหม่",
  amount: 900,
  proposalDetails: createEmptyBudgetProposalDetails(),
  expenseLines: [
    {
      id: "expense-legacy",
      category: "วัสดุสำนักงาน",
      description: "กระดาษสำหรับกิจกรรมรูปแบบเดิม",
      quantity: 3,
      unitPrice: 300,
      total: 900,
    },
  ],
};

export const emptyRequest: BudgetRequestDetail = {
  ...legacyRequest,
  title: "คำขอที่ยังไม่มีรายละเอียดค่าใช้จ่าย",
  amount: 0,
  expenseLines: [],
};
