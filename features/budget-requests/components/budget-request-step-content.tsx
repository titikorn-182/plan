import { FileUp } from "lucide-react";
import Link from "next/link";
import { areaClass, FieldError, FieldLabel, fieldClass } from "@/components/ui/operation-form";
import type { BudgetRequestState } from "@/features/budget-requests/actions";
import type { BudgetFormOptions } from "@/features/budget-requests/types";

interface BudgetRequestStepContentProps {
  amount: string;
  errors: BudgetRequestState["errors"];
  onAmountChange: (value: string) => void;
  onFiscalYearChange: (value: string) => void;
  onOrganizationChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onProjectTypeChange: (value: string) => void;
  onRationaleChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  options: BudgetFormOptions;
  fiscalYearId: string;
  organizationId: string;
  ownerName: string;
  projectType: string;
  rationale: string;
  requestId?: string;
  step: number;
  title: string;
}

function GeneralStep({
  errors,
  fiscalYearId,
  onOrganizationChange,
  onFiscalYearChange,
  onOwnerChange,
  onProjectTypeChange,
  onRationaleChange,
  onTitleChange,
  options,
  organizationId,
  ownerName,
  projectType,
  rationale,
  title,
}: Omit<BudgetRequestStepContentProps, "amount" | "onAmountChange" | "requestId" | "step">) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <label className="md:col-span-2">
        <FieldLabel required>ชื่อกิจกรรม/โครงการ</FieldLabel>
        <input
          className={fieldClass}
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          maxLength={300}
          required
        />
        <FieldError errors={errors?.title} />
      </label>
      <label>
        <FieldLabel required>หน่วยงานเจ้าของคำขอ</FieldLabel>
        <select
          className={fieldClass}
          value={organizationId}
          onChange={(event) => onOrganizationChange(event.target.value)}
          aria-describedby="budget-request-organization-help budget-request-organization-error"
          aria-invalid={Boolean(errors?.organizationId?.length)}
          required
        >
          {options.organizations.length === 0 ? (
            <option value="">ไม่พบหน่วยงานที่เปิดใช้งาน</option>
          ) : null}
          {options.organizations.map((organization) => (
            <option value={organization.id} key={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
        <span id="budget-request-organization-help" className="mt-1.5 block text-xs text-stone-500">
          รายการหน่วยงานตามโครงสร้างคณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี
        </span>
        <FieldError errors={errors?.organizationId} id="budget-request-organization-error" />
      </label>
      <label>
        <FieldLabel required>ประเภทคำขอ</FieldLabel>
        <select
          className={fieldClass}
          value={projectType}
          onChange={(event) => onProjectTypeChange(event.target.value)}
        >
          <option>โครงการพัฒนาการเรียนการสอน</option>
          <option>วิจัยและนวัตกรรม</option>
          <option>บริการวิชาการ</option>
          <option>ครุภัณฑ์</option>
          <option>สิ่งก่อสร้าง</option>
        </select>
      </label>
      <label>
        <FieldLabel required>ผู้รับผิดชอบหลัก</FieldLabel>
        <input
          className={fieldClass}
          value={ownerName}
          onChange={(event) => onOwnerChange(event.target.value)}
          placeholder="กรอกชื่อ-นามสกุล"
          autoComplete="off"
          maxLength={180}
          required
        />
        <FieldError errors={errors?.ownerName} />
      </label>
      <label>
        <FieldLabel required>ปีงบประมาณ</FieldLabel>
        <select
          className={fieldClass}
          value={fiscalYearId}
          onChange={(event) => onFiscalYearChange(event.target.value)}
          required
          aria-invalid={Boolean(errors?.fiscalYearId?.length)}
          aria-describedby={errors?.fiscalYearId?.length ? "budget-fiscal-year-error" : undefined}
        >
          {options.fiscalYears.map((fiscalYear) => (
            <option value={fiscalYear.id} key={fiscalYear.id}>
              {fiscalYear.label}
            </option>
          ))}
        </select>
        <FieldError errors={errors?.fiscalYearId} id="budget-fiscal-year-error" />
      </label>
      <label className="md:col-span-2">
        <FieldLabel required>หลักการและเหตุผล</FieldLabel>
        <textarea
          className={areaClass}
          value={rationale}
          onChange={(event) => onRationaleChange(event.target.value)}
          maxLength={5000}
        />
        <FieldError errors={errors?.rationale} />
      </label>
    </div>
  );
}

function StrategyStep() {
  return (
    <div className="space-y-5">
      <label className="block">
        <FieldLabel required>ยุทธศาสตร์มหาวิทยาลัย</FieldLabel>
        <select className={fieldClass}>
          <option>ยุทธศาสตร์ที่ 2 — ยกระดับคุณภาพบัณฑิตและการเรียนรู้ตลอดชีวิต</option>
        </select>
      </label>
      <div className="grid gap-5 md:grid-cols-2">
        <label>
          <FieldLabel required>เป้าประสงค์</FieldLabel>
          <select className={fieldClass}>
            <option>G2.1 หลักสูตรตอบโจทย์อนาคต</option>
          </select>
        </label>
        <label>
          <FieldLabel required>แผนงาน</FieldLabel>
          <select className={fieldClass}>
            <option>P2.3 พัฒนาหลักสูตรฐานสมรรถนะ</option>
          </select>
        </label>
      </div>
      <fieldset className="border border-stone-200 p-4">
        <legend className="px-2 text-xs font-bold">ความเชื่อมโยง SDGs</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {["SDG 4 การศึกษาที่มีคุณภาพ", "SDG 8 งานที่มีคุณค่า", "SDG 9 อุตสาหกรรมและนวัตกรรม"].map(
            (label, index) => (
              <label className="flex items-start gap-2 text-sm" key={label}>
                <input className="mt-1" type="checkbox" defaultChecked={index < 2} /> {label}
              </label>
            ),
          )}
        </div>
      </fieldset>
      <label className="block">
        <FieldLabel>คำอธิบายความสอดคล้อง</FieldLabel>
        <textarea
          className={areaClass}
          defaultValue="โครงการยกระดับสมรรถนะผู้เรียนด้านระบบอัตโนมัติและตอบโจทย์อุตสาหกรรมเป้าหมายของภูมิภาค"
        />
      </label>
    </div>
  );
}

function AmountStep({
  amount,
  errors,
  onAmountChange,
}: Pick<BudgetRequestStepContentProps, "amount" | "errors" | "onAmountChange">) {
  return (
    <div className="space-y-5">
      <label className="block max-w-md">
        <FieldLabel required>วงเงินคำขอรวม (บาท)</FieldLabel>
        <input
          className={`${fieldClass} text-right tabular-nums`}
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => onAmountChange(event.target.value)}
          required
        />
        <FieldError errors={errors?.amount} />
      </label>
      <div className="border border-stone-200 bg-stone-50 p-4 text-xs leading-5 text-stone-600">
        วงเงินรวมนี้ใช้เป็นยอดควบคุมของคำขอและจะแสดงในทะเบียนงบประมาณทันทีหลังบันทึก
      </div>
    </div>
  );
}

function OutputsStep() {
  return (
    <div className="border border-stone-200 bg-stone-50 p-5">
      <b className="text-sm">ผลผลิตและตัวชี้วัดของคำขอ</b>
      <p className="mt-2 text-xs leading-5 text-stone-600">
        ส่วนนี้อยู่ในขอบเขต schema ระยะถัดไป ปัจจุบันระบบบันทึกข้อมูลทั่วไปและวงเงินคำขอได้จริงแล้ว
      </p>
    </div>
  );
}

function EvidenceStep({ requestId }: { requestId?: string }) {
  return (
    <div className="space-y-5">
      <div className="grid min-h-44 place-items-center border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center">
        <span>
          <FileUp className="mx-auto mb-3 text-stone-400" size={30} />
          <b className="block text-sm">อัปโหลดผ่านทะเบียนหลักฐานส่วนกลาง</b>
          <small className="mt-1 block text-xs text-stone-500">
            บันทึกคำขอให้ได้รับรหัสก่อน แล้วเลือกคำขอนี้ในเมนูหลักฐานและเอกสาร
          </small>
          {requestId ? (
            <Link
              className="mt-4 inline-flex bg-[#cf430c] px-4 py-2 text-xs font-semibold text-white"
              href="/evidence"
            >
              ไปทะเบียนหลักฐาน
            </Link>
          ) : null}
        </span>
      </div>
    </div>
  );
}

export function BudgetRequestStepContent(props: BudgetRequestStepContentProps) {
  if (props.step === 0) return <GeneralStep {...props} />;
  if (props.step === 1) return <StrategyStep />;
  if (props.step === 2) return <AmountStep {...props} />;
  if (props.step === 3) return <OutputsStep />;
  return <EvidenceStep requestId={props.requestId} />;
}
