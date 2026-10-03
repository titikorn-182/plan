"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Download, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { areaClass, fieldClass, FieldLabel } from "@/components/ui/operation-form";
import {
  adjustmentSchema,
  adjustmentTotals,
  emptyAdjustmentRow,
  initialAdjustment,
  SIGNER_ROLES,
  type BudgetAdjustment,
} from "@/features/budget-adjustments/schema";

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-stone-300 px-3 py-2 text-sm font-semibold hover:border-orange-600 disabled:opacity-50";
type HeaderField =
  | "department"
  | "phone"
  | "reference"
  | "date"
  | "fiscalYear"
  | "recipient"
  | "project"
  | "head"
  | "schedule"
  | "reason";
const fields: { key: HeaderField; label: string; max: number; type?: string; wide?: boolean }[] = [
  { key: "department", label: "ส่วนงาน", max: 300, wide: true },
  { key: "reference", label: "เลขที่หนังสือ", max: 100 },
  { key: "date", label: "วันที่หนังสือ", type: "date", max: 10 },
  { key: "phone", label: "โทรศัพท์", max: 50 },
  { key: "fiscalYear", label: "ปีงบประมาณ พ.ศ.", max: 4 },
  { key: "recipient", label: "เรียน", max: 150 },
  { key: "head", label: "ชื่อหัวหน้าโครงการ", max: 150 },
  { key: "project", label: "ชื่อโครงการที่ขอปรับงบประมาณ", max: 300, wide: true },
  { key: "schedule", label: "กำหนดดำเนินโครงการ (วันที่หรือช่วงวันที่)", max: 300, wide: true },
  { key: "reason", label: "เหตุผลความจำเป็นในการปรับงบประมาณ", max: 4000, wide: true },
];

export function BudgetAdjustmentForm() {
  const [data, setData] = useState<BudgetAdjustment>(() => initialAdjustment());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const busy = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const totals = adjustmentTotals(data.rows);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    const warnNavigation = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (
        !link ||
        link.download ||
        link.target === "_blank" ||
        link.href.startsWith("blob:") ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      if (!window.confirm("ข้อมูลในแบบฟอร์มไม่ได้บันทึกไว้ในระบบ ต้องการออกจากหน้านี้หรือไม่?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", warnNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", warnNavigation, true);
    };
  }, [dirty]);
  function update(next: BudgetAdjustment) {
    setData(next);
    setDirty(true);
    setMessage("");
  }
  function errorProps(path: string) {
    return {
      id: path,
      "aria-invalid": Boolean(errors[path]),
      "aria-describedby": errors[path] ? `${path}-error` : undefined,
    };
  }
  function errorText(path: string) {
    return errors[path] ? (
      <span className="mt-1 block text-xs text-red-700" id={`${path}-error`}>
        {errors[path]}
      </span>
    ) : null;
  }

  async function download(event: FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    const parsed = adjustmentSchema.safeParse(data);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        nextErrors[issue.path.join(".")] = issue.message;
      });
      setErrors(nextErrors);
      setMessage("กรุณาตรวจสอบช่องที่ระบุ ข้อมูลที่กรอกยังอยู่ครบ");
      requestAnimationFrame(() =>
        form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      );
      return;
    }
    setErrors({});
    busy.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/evidence/budget-adjustment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบในแท็บใหม่ แล้วกลับมากดดาวน์โหลดอีกครั้ง"
            : response.status === 403
              ? "บัญชีนี้ไม่มีสิทธิ์สร้างเอกสาร กรุณาติดต่อผู้ดูแลระบบ"
              : "สร้าง PDF ไม่สำเร็จ กรุณาลองอีกครั้ง ข้อมูลในแบบฟอร์มยังอยู่ครบ",
        );
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `budget-adjustment-${data.fiscalYear}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage(
        "สร้าง PDF แล้ว กรุณาตรวจไฟล์ที่ดาวน์โหลดก่อนเสนออนุมัตินอกระบบ วงเงินในระบบยังไม่เปลี่ยนแปลง",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "ดาวน์โหลดไม่สำเร็จ ข้อมูลยังอยู่ครบ กรุณาลองอีกครั้ง",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form ref={form} onSubmit={download} noValidate className="budget-adjustment-form pb-28">
      <Link
        href="/evidence"
        className="inline-flex min-h-11 items-center gap-2 text-sm text-stone-700"
      >
        <ArrowLeft size={16} />
        กลับทะเบียนหลักฐานและเอกสาร
      </Link>
      <p className="mt-3 text-sm leading-7 text-stone-700">
        กรอกเพื่อดาวน์โหลดบันทึกข้อความเสนออนุมัตินอกระบบ ไม่ส่งเข้า Workflow และไม่ปรับวงเงินในระบบ
      </p>
      <p className="text-xs leading-6 text-stone-600">
        ข้อมูลอยู่ในหน้านี้ชั่วคราว ไม่ได้บันทึกฉบับร่าง กรุณาดาวน์โหลดก่อนปิดหน้า • ช่องที่มี *
        จำเป็นต้องกรอก
      </p>
      <fieldset disabled={pending}>
        <section className="adjustment-section" aria-labelledby="memo-heading">
          <h2 id="memo-heading">ข้อมูลบันทึกข้อความ</h2>
          <div className="adjustment-fields">
            {fields.map(({ key, label, max, type, wide }) => (
              <label key={key} className={wide ? "md:col-span-2" : ""}>
                <FieldLabel required>{label}</FieldLabel>
                {key === "reason" ? (
                  <textarea
                    {...errorProps(key)}
                    className={areaClass}
                    maxLength={max}
                    value={data[key]}
                    onChange={(event) => update({ ...data, [key]: event.target.value })}
                  />
                ) : (
                  <input
                    {...errorProps(key)}
                    type={type ?? "text"}
                    className={fieldClass}
                    maxLength={max}
                    value={data[key]}
                    onChange={(event) => update({ ...data, [key]: event.target.value })}
                  />
                )}
                {errorText(key)}
              </label>
            ))}
          </div>
        </section>
        <section className="adjustment-section" aria-labelledby="comparison-heading">
          <h2 id="comparison-heading">รายละเอียดการปรับงบประมาณ</h2>
          <p className="mb-4 text-sm leading-6 text-stone-600">
            ระบุรหัสโครงการ ชื่อโครงการ รายการค่าใช้จ่าย และงบประมาณทั้งสองฝั่ง
            หากเพิ่มหรือตัดรายการ ให้ใส่ 0 ในฝั่งที่ไม่มีงบประมาณ (สูงสุด 30 รายการ)
          </p>
          {data.rows.map((row, index) => (
            <div className="adjustment-pair" key={index}>
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="font-semibold">รายการที่ {index + 1}</h3>
                <button
                  type="button"
                  className={buttonClass}
                  disabled={data.rows.length === 1}
                  aria-label={`ลบรายการที่ ${index + 1}`}
                  onClick={() => {
                    if (window.confirm(`ลบรายการที่ ${index + 1} ออกจากแบบฟอร์มหรือไม่?`))
                      update({ ...data, rows: data.rows.filter((_, i) => i !== index) });
                  }}
                >
                  <Trash2 size={16} />
                  ลบรายการ
                </button>
              </div>
              <div className="adjustment-fields">
                {(["before", "after"] as const).map((side) => (
                  <fieldset className="adjustment-entry" key={side}>
                    <legend>{side === "before" ? "เดิม" : "ปรับเป็น"}</legend>
                    {(
                      [
                        ["code", "รหัสโครงการ", 50],
                        ["project", "ชื่อโครงการ", 300],
                        ["expense", "รายการค่าใช้จ่าย", 500],
                        ["amount", "งบประมาณ (บาท)", 13],
                      ] as const
                    ).map(([key, label, max]) => {
                      const path = `rows.${index}.${side}.${key}`;
                      return (
                        <label key={key}>
                          <FieldLabel required>{label}</FieldLabel>
                          <input
                            {...errorProps(path)}
                            className={fieldClass}
                            inputMode={key === "amount" ? "decimal" : undefined}
                            maxLength={max}
                            value={row[side][key]}
                            onChange={(event) =>
                              update({
                                ...data,
                                rows: data.rows.map((current, i) =>
                                  i === index
                                    ? {
                                        ...current,
                                        [side]: { ...current[side], [key]: event.target.value },
                                      }
                                    : current,
                                ),
                              })
                            }
                          />
                          {errorText(path)}
                        </label>
                      );
                    })}
                  </fieldset>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            className={`${buttonClass} mb-6`}
            disabled={data.rows.length >= 30}
            onClick={() => update({ ...data, rows: [...data.rows, emptyAdjustmentRow()] })}
          >
            <Plus size={16} />
            เพิ่มรายการปรับงบประมาณ
          </button>
          <dl className="adjustment-totals" aria-label="สรุปวงเงิน">
            <div>
              <dt>รวมงบประมาณเดิม</dt>
              <dd>{money(totals.before)} บาท</dd>
            </div>
            <div>
              <dt>รวมงบประมาณที่ขอปรับ</dt>
              <dd>{money(totals.after)} บาท</dd>
            </div>
            <div>
              <dt>ส่วนต่าง (ปรับเป็น − เดิม)</dt>
              <dd>
                {totals.difference > 0 ? "+" : ""}
                {money(totals.difference)} บาท
              </dd>
            </div>
          </dl>
        </section>
        <section className="adjustment-section" aria-labelledby="signatures-heading">
          <h2 id="signatures-heading">ผู้ลงนามตามแบบฟอร์ม</h2>
          <p className="mb-6 text-sm leading-6 text-stone-600">
            ชื่อและตำแหน่งเริ่มต้นมาจากไฟล์แนบ กรุณาตรวจสอบก่อนดาวน์โหลด
            เว้นชื่อว่างเพื่อเขียนภายหลังได้ ช่องลงนามและวันที่จะเว้นว่างสำหรับลงนามจริง
          </p>
          <div className="adjustment-fields">
            {data.signers.map((signer, index) => (
              <fieldset key={index} className="adjustment-entry border-t border-stone-200 pt-4">
                <legend>
                  {index + 1}) {SIGNER_ROLES[index]}
                </legend>
                {(
                  [
                    ["name", "ชื่อผู้ลงนาม", 150],
                    ["position", "ตำแหน่ง", 250],
                  ] as const
                ).map(([key, label, max]) => {
                  const path = `signers.${index}.${key}`;
                  return (
                    <label key={key}>
                      <FieldLabel>{label}</FieldLabel>
                      <textarea
                        {...errorProps(path)}
                        className={`${areaClass} min-h-20`}
                        maxLength={max}
                        value={signer[key]}
                        onChange={(event) =>
                          update({
                            ...data,
                            signers: data.signers.map((current, i) =>
                              i === index ? { ...current, [key]: event.target.value } : current,
                            ),
                          })
                        }
                      />
                      {errorText(path)}
                    </label>
                  );
                })}
              </fieldset>
            ))}
          </div>
        </section>
      </fieldset>
      <p role="status" aria-live="polite" className="my-5 text-sm leading-6 text-stone-800">
        {message}
      </p>
      <div className="adjustment-actions form-action-bar fixed right-0 bottom-0 left-[206px] z-40 flex min-h-16 flex-wrap items-center justify-between gap-3 border-t border-stone-300 bg-white px-4 py-3 max-[960px]:left-[72px] max-[700px]:left-0 lg:px-8">
        <span className="text-xs text-stone-600">สำหรับเสนออนุมัตินอกระบบ</span>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#cf430c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#ad3507] disabled:opacity-60"
        >
          {pending ? <LoaderCircle size={17} className="animate-spin" /> : <Download size={17} />}
          {pending ? "กำลังสร้าง PDF…" : "ดาวน์โหลด PDF"}
        </button>
      </div>
    </form>
  );
}
