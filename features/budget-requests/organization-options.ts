export const BUDGET_REQUEST_ORGANIZATIONS = [
  { code: "SEC-ADMIN", name: "สำนักงานเลขานุการ-งานสารบรรณและธุรการ" },
  { code: "SEC-VEHICLE", name: "สำนักงานเลขานุการ-งานยานพาหนะ" },
  { code: "SEC-FACILITY", name: "สำนักงานเลขานุการ-งานอาคารสถานที่" },
  { code: "SEC-INTERNATIONAL", name: "สำนักงานเลขานุการ-งานวิเทศนานาชาติ" },
  { code: "SEC-ACADEMIC", name: "สำนักงานเลขานุการ-งานวิชาการและหลักสูตร" },
  { code: "SEC-STUDENT", name: "สำนักงานเลขานุการ-งานพัฒนานักศึกษาและศิษย์เก่า" },
  { code: "SEC-FINANCE", name: "สำนักงานเลขานุการ-งานการเงิน" },
  { code: "SEC-ACCOUNTING", name: "สำนักงานเลขานุการ-งานบัญชี" },
  { code: "SEC-PROCUREMENT", name: "สำนักงานเลขานุการ-งานพัสดุ" },
  { code: "SEC-PLANNING", name: "สำนักงานเลขานุการ-งานแผนและงบประมาณ" },
  { code: "SEC-HR", name: "สำนักงานเลขานุการ-งานบริหารบุคคล" },
  { code: "SEC-RESEARCH", name: "สำนักงานเลขานุการ-งานส่งเสริมการวิจัย" },
  { code: "SEC-ACADEMIC-SERVICE", name: "สำนักงานเลขานุการ-งานบริการวิชาการและการตลาด" },
  { code: "DEPT-POL-IR", name: "ภาควิชาการเมืองและความสัมพันธ์ระหว่างประเทศ" },
  { code: "DEPT-PA", name: "ภาควิชารัฐประศาสนศาสตร์" },
] as const;

export const BUDGET_REQUEST_ORGANIZATION_NAMES = BUDGET_REQUEST_ORGANIZATIONS.map(
  ({ name }) => name,
);

const organizationOrder = new Map<string, number>(
  BUDGET_REQUEST_ORGANIZATIONS.map(({ name }, index) => [name, index]),
);

export function getBudgetRequestOrganizationOrder(name: string): number {
  return organizationOrder.get(name) ?? Number.MAX_SAFE_INTEGER;
}
