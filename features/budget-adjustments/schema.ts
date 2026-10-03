import { z } from "zod";

const text = (max = 300) =>
  z
    .string()
    .trim()
    .min(1, "กรุณากรอกข้อมูล")
    .max(max, `ไม่เกิน ${max} ตัวอักษร`)
    .refine(
      (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),
      "มีอักขระที่ไม่รองรับ",
    );
const optionalText = (max = 150) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value),
      "มีอักขระที่ไม่รองรับ",
    );
const amount = z
  .string()
  .regex(/^\d{1,10}(\.\d{1,2})?$/, "กรอกจำนวนเงินตั้งแต่ 0 ทศนิยมไม่เกิน 2 ตำแหน่ง");
const entry = z.object({ code: text(50), project: text(300), expense: text(500), amount });
const date = z.iso.date("กรุณาระบุวันที่ให้ถูกต้อง");
export const adjustmentSchema = z.object({
  department: text(300),
  phone: text(50),
  reference: text(100),
  date,
  fiscalYear: z.string().regex(/^25\d{2}$/, "ระบุปี พ.ศ. 4 หลัก เช่น 2570"),
  recipient: text(150),
  project: text(300),
  head: text(150),
  schedule: text(300),
  reason: text(4000),
  rows: z
    .array(z.object({ before: entry, after: entry }))
    .min(1)
    .max(30),
  signers: z.array(z.object({ name: optionalText(), position: optionalText(250) })).length(6),
});
export type BudgetAdjustment = z.infer<typeof adjustmentSchema>;
export const SIGNER_ROLES = [
  "หัวหน้าโครงการ/ผู้รับผิดชอบโครงการ",
  "รองคณบดี/หัวหน้าภาควิชา/หัวหน้าสำนักงาน",
  "ตรวจสอบแล้ว/บันทึกงบประมาณแล้ว",
  "เห็นควรอนุมัติ/เป็นไปตามระเบียบ งบประมาณเพียงพอ",
  "เห็นควรอนุมัติ",
  "อนุมัติตามเสนอ",
] as const;
export function emptyAdjustmentRow() {
  return {
    before: { code: "", project: "", expense: "", amount: "" },
    after: { code: "", project: "", expense: "", amount: "" },
  };
}
export function adjustmentTotals(rows: BudgetAdjustment["rows"]) {
  const sum = (side: "before" | "after") =>
    rows.reduce((total, row) => {
      const value = Number(row[side].amount);
      return total + (Number.isFinite(value) ? Math.round(value * 100) : 0);
    }, 0);
  const before = sum("before");
  const after = sum("after");
  return { before: before / 100, after: after / 100, difference: (after - before) / 100 };
}
export function initialAdjustment(date = ""): BudgetAdjustment {
  return {
    department: "สำนักงานเลขานุการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี",
    phone: "3944",
    reference: "อว 0604.19 /",
    date,
    fiscalYear: "2570",
    recipient: "คณบดีคณะรัฐศาสตร์",
    project: "",
    head: "",
    schedule: "",
    reason: "",
    rows: [emptyAdjustmentRow()],
    signers: [
      { name: "", position: "" },
      { name: "", position: "" },
      { name: "นายเพชร เสาร์ศรี", position: "นักวิเคราะห์นโยบายและแผนปฏิบัติการ" },
      {
        name: "นายฐิติกรณ์รัศมิ์ ภัททสิริภูวดล",
        position: "เจ้าหน้าที่บริหารงานทั่วไปชำนาญการพิเศษ\nหัวหน้าสำนักงานเลขานุการคณะรัฐศาสตร์",
      },
      { name: "นายวรุตม์ อิงคถาวรวงศ์", position: "รองคณบดีฝ่ายบริหารและพัฒนาองค์การ" },
      {
        name: "นางสาวศิริพร จันทนสกุลวงศ์",
        position: "คณบดีคณะรัฐศาสตร์ ปฏิบัติการแทน\nอธิการบดีมหาวิทยาลัยอุบลราชธานี",
      },
    ],
  };
}
