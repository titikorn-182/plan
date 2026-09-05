"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, FileUp, LoaderCircle, Save, Send, ShieldCheck } from "lucide-react";
import { RegisterSection } from "@/components/ui/module-primitives";
import { saveBudgetRequestAction, type BudgetRequestState } from "@/features/budget-requests/actions";
import type { BudgetFormOptions } from "@/features/budget-requests/types";

const steps = ["ข้อมูลทั่วไป", "ความสอดคล้องยุทธศาสตร์", "รายละเอียดงบประมาณ", "ผลผลิตและตัวชี้วัด", "เอกสารแนบ"];

const fieldClass = "mt-1.5 h-11 w-full border border-stone-300 bg-white px-3 text-sm outline-none transition-colors focus:border-[#d8470c] focus:ring-2 focus:ring-orange-100";
const areaClass = "mt-1.5 min-h-28 w-full resize-y border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#d8470c] focus:ring-2 focus:ring-orange-100";

function Label({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return <span className="text-xs font-semibold text-stone-700">{children}{required ? <span className="ml-1 text-red-600">*</span> : null}</span>;
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.map((error) => <span className="mt-1 block text-xs text-red-700" key={error}>{error}</span>);
}

export function BudgetRequestForm({ options }: { options: BudgetFormOptions }) {
  const record = options.record;
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(record?.title ?? "");
  const [organizationId, setOrganizationId] = useState(record?.organizationId ?? options.organizations[0]?.id ?? "");
  const [projectType, setProjectType] = useState(record?.projectType ?? "โครงการพัฒนาการเรียนการสอน");
  const [ownerName, setOwnerName] = useState(record?.ownerName ?? options.defaultOwnerName);
  const [rationale, setRationale] = useState(record?.rationale ?? "");
  const [amount, setAmount] = useState(String(record?.amount ?? 0));
  const [formState, action, pending] = useActionState(saveBudgetRequestAction, {
    id: record?.id,
    code: record?.code,
    version: record?.version,
  } satisfies BudgetRequestState);

  return (
    <form className="budget-request-form pb-24" action={action}>
      <input type="hidden" name="id" value={formState.id ?? ""} />
      <input type="hidden" name="version" value={formState.version ?? 1} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="fiscalYearId" value={options.fiscalYearId} />
      <input type="hidden" name="budgetCycleId" value={options.budgetCycleId} />
      <input type="hidden" name="projectType" value={projectType} />
      <input type="hidden" name="ownerName" value={ownerName} />
      <input type="hidden" name="rationale" value={rationale} />
      <input type="hidden" name="amount" value={amount} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-[#c9440b]" href="/budget-requests"><ArrowLeft size={17} /> กลับทะเบียนคำของบ</Link>
        <span className={`text-xs ${formState.success ? "text-emerald-700" : formState.message ? "text-red-700" : "text-stone-500"}`} role="status" aria-live="polite">{formState.message ?? "ระบบจะบันทึกเมื่อกด “บันทึกฉบับร่าง”"}</span>
      </div>

      <ol className="mb-5 grid overflow-hidden border border-stone-200 bg-white md:grid-cols-5" aria-label="ขั้นตอนการสร้างคำของบ">
        {steps.map((label, index) => (
          <li className={`relative flex min-h-16 items-center gap-3 border-b border-stone-200 px-4 py-3 last:border-b-0 md:border-r md:border-b-0 ${index === step ? "bg-[#fff4eb]" : index < step ? "bg-emerald-50/50" : ""}`} key={label}>
            <span className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${index < step ? "border-emerald-600 bg-emerald-600 text-white" : index === step ? "border-[#d8470c] bg-[#d8470c] text-white" : "border-stone-300 text-stone-500"}`}>{index < step ? <Check size={14} /> : index + 1}</span>
            <span className={`text-xs font-semibold ${index === step ? "text-[#b53807]" : "text-stone-600"}`}>{label}</span>
            {index === step ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#d8470c]" /> : null}
          </li>
        ))}
      </ol>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <RegisterSection title={`${step + 1}. ${steps[step]}`} aside={<span className="text-xs text-stone-500">{formState.code ?? "ยังไม่มีรหัสคำขอ"}</span>}>
          <div className="p-5 sm:p-6">
            {step === 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
                <label className="md:col-span-2"><Label required>ชื่อกิจกรรม/โครงการ</Label><input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={300} required /><FieldError errors={formState.errors?.title} /></label>
                <label><Label required>หน่วยงานเจ้าของคำขอ</Label><select className={fieldClass} value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} required>{options.organizations.map((organization) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}</select><FieldError errors={formState.errors?.organizationId} /></label>
                <label><Label required>ประเภทคำขอ</Label><select className={fieldClass} value={projectType} onChange={(event) => setProjectType(event.target.value)}><option>โครงการพัฒนาการเรียนการสอน</option><option>วิจัยและนวัตกรรม</option><option>บริการวิชาการ</option><option>ครุภัณฑ์</option><option>สิ่งก่อสร้าง</option></select></label>
                <label><Label required>ผู้รับผิดชอบหลัก</Label><input className={fieldClass} value={ownerName} onChange={(event) => setOwnerName(event.target.value)} maxLength={180} required /><FieldError errors={formState.errors?.ownerName} /></label>
                <label><Label required>ปีงบประมาณ</Label><input className={`${fieldClass} bg-stone-50`} value={options.fiscalYearLabel} readOnly aria-readonly="true" /></label>
                <label className="md:col-span-2"><Label required>หลักการและเหตุผล</Label><textarea className={areaClass} value={rationale} onChange={(event) => setRationale(event.target.value)} maxLength={5000} /><FieldError errors={formState.errors?.rationale} /></label>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-5">
                <label className="block"><Label required>ยุทธศาสตร์มหาวิทยาลัย</Label><select className={fieldClass}><option>ยุทธศาสตร์ที่ 2 — ยกระดับคุณภาพบัณฑิตและการเรียนรู้ตลอดชีวิต</option></select></label>
                <div className="grid gap-5 md:grid-cols-2">
                  <label><Label required>เป้าประสงค์</Label><select className={fieldClass}><option>G2.1 หลักสูตรตอบโจทย์อนาคต</option></select></label>
                  <label><Label required>แผนงาน</Label><select className={fieldClass}><option>P2.3 พัฒนาหลักสูตรฐานสมรรถนะ</option></select></label>
                </div>
                <fieldset className="border border-stone-200 p-4"><legend className="px-2 text-xs font-bold">ความเชื่อมโยง SDGs</legend><div className="grid gap-3 sm:grid-cols-3">{["SDG 4 การศึกษาที่มีคุณภาพ", "SDG 8 งานที่มีคุณค่า", "SDG 9 อุตสาหกรรมและนวัตกรรม"].map((label, index) => <label className="flex items-start gap-2 text-sm" key={label}><input className="mt-1" type="checkbox" defaultChecked={index < 2} /> {label}</label>)}</div></fieldset>
                <label className="block"><Label>คำอธิบายความสอดคล้อง</Label><textarea className={areaClass} defaultValue="โครงการยกระดับสมรรถนะผู้เรียนด้านระบบอัตโนมัติและตอบโจทย์อุตสาหกรรมเป้าหมายของภูมิภาค" /></label>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-5"><label className="block max-w-md"><Label required>วงเงินคำขอรวม (บาท)</Label><input className={`${fieldClass} text-right tabular-nums`} type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /><FieldError errors={formState.errors?.amount} /></label><div className="border border-stone-200 bg-stone-50 p-4 text-xs leading-5 text-stone-600">วงเงินรวมนี้ใช้เป็นยอดควบคุมของคำขอและจะแสดงในทะเบียนงบประมาณทันทีหลังบันทึก</div></div>
            ) : null}

            {step === 3 ? (
              <div className="border border-stone-200 bg-stone-50 p-5"><b className="text-sm">ผลผลิตและตัวชี้วัดของคำขอ</b><p className="mt-2 text-xs leading-5 text-stone-600">ส่วนนี้อยู่ในขอบเขต schema ระยะถัดไป ปัจจุบันระบบบันทึกข้อมูลทั่วไปและวงเงินคำขอได้จริงแล้ว</p></div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-5"><div className="grid min-h-44 place-items-center border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center"><span><FileUp className="mx-auto mb-3 text-stone-400" size={30} /><b className="block text-sm">อัปโหลดผ่านทะเบียนหลักฐานส่วนกลาง</b><small className="mt-1 block text-xs text-stone-500">บันทึกคำขอให้ได้รับรหัสก่อน แล้วเลือกคำขอนี้ในเมนูหลักฐานและเอกสาร</small>{formState.id ? <Link className="mt-4 inline-flex bg-[#cf430c] px-4 py-2 text-xs font-semibold text-white" href="/evidence">ไปทะเบียนหลักฐาน</Link> : null}</span></div></div>
            ) : null}
          </div>
        </RegisterSection>

        <aside className="h-fit border border-stone-200 bg-white xl:sticky xl:top-[120px]">
          <header className="border-b border-stone-200 px-4 py-3"><h2 className="text-sm font-bold">ความพร้อมก่อนส่ง</h2></header>
          <div className="space-y-4 p-4">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 text-emerald-600" size={19} /><span><b className="block text-xs">ข้อมูลบังคับ</b><small className="text-[11px] text-stone-500">กรอกแล้ว 18 จาก 20 จุด</small></span></div>
            <div className="h-1.5 bg-stone-200"><div className="h-full w-[90%] bg-emerald-600" /></div>
            <ul className="space-y-2 text-xs text-stone-600"><li className="flex gap-2"><Check size={15} className="text-emerald-600" /> ระบุหน่วยงานและผู้รับผิดชอบ</li><li className="flex gap-2"><Check size={15} className="text-emerald-600" /> ผูกยุทธศาสตร์และแผนงาน</li><li className="flex gap-2"><Check size={15} className="text-emerald-600" /> งบประมาณรวมสมดุล</li><li className="flex gap-2 text-orange-700"><span className="font-bold">!</span> รอตรวจเอกสารแนบ 1 จุด</li></ul>
          </div>
        </aside>
      </div>

      <div className="form-action-bar fixed right-0 bottom-0 left-[206px] z-40 flex min-h-16 flex-wrap items-center justify-between gap-3 border-t border-stone-300 bg-white px-4 py-3 shadow-[0_-4px_14px_rgba(28,25,23,0.08)] max-[960px]:left-[72px] max-[700px]:left-0 lg:px-8">
        <button className="form-action-back inline-flex items-center gap-2 border border-stone-300 px-4 py-2 text-sm font-semibold disabled:opacity-40" type="button" aria-label="ย้อนกลับหนึ่งขั้นตอน" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}><ArrowLeft size={16} /> <span>ย้อนกลับ</span></button>
        <div className="form-action-group flex flex-wrap items-center gap-2">
          <button className="inline-flex items-center gap-2 border border-stone-300 px-4 py-2 text-sm font-semibold hover:border-[#d8470c] disabled:cursor-wait disabled:opacity-60" type="submit" name="intent" value="save" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />} บันทึกฉบับร่าง</button>
          {step < steps.length - 1 ? <button className="inline-flex items-center gap-2 bg-[#cf430c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#ad3507]" type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}>ถัดไป <ArrowRight size={16} /></button> : <button className="inline-flex items-center gap-2 bg-[#cf430c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#ad3507] disabled:cursor-wait disabled:opacity-60" type="submit" name="intent" value="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />} ส่งคำขอ</button>}
        </div>
      </div>
    </form>
  );
}
