"use client";

import { useActionState, useState } from "react";
import { CalendarRange, Database, LoaderCircle, Plus, Save } from "lucide-react";
import {
  saveBudgetCycleAction,
  saveFiscalYearAction,
  saveOrganizationAction,
} from "@/features/admin/actions";
import type {
  AdminReferenceData,
  ReferenceBudgetCycle,
  ReferenceFiscalYear,
  ReferenceOrganization,
} from "@/features/admin/types";
import type { OperationState } from "@/features/shared/action-state";
import { FieldLabel, FormNotice, fieldClass } from "@/components/ui/operation-form";
import { StatusPill } from "@/components/ui/module-primitives";

type ReferenceTab = "organizations" | "fiscal-years" | "budget-cycles";

const statusLabel = { open: "เปิดใช้งาน", closed: "ปิดรอบ", archived: "เก็บถาวร" } as const;

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button className="admin-action-button" disabled={pending} type="submit">
      {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
      บันทึก
    </button>
  );
}

function getDescendantOrganizationIds(
  organizationId: string | undefined,
  organizations: ReferenceOrganization[],
): Set<string> {
  if (!organizationId) return new Set();
  const descendants = new Set<string>();
  const pending = [organizationId];
  while (pending.length > 0) {
    const parentId = pending.shift();
    for (const item of organizations) {
      if (item.parentId === parentId && !descendants.has(item.id)) {
        descendants.add(item.id);
        pending.push(item.id);
      }
    }
  }
  return descendants;
}

function OrganizationEditor({
  organization,
  organizations,
}: {
  organization?: ReferenceOrganization;
  organizations: ReferenceOrganization[];
}) {
  const [state, action, pending] = useActionState(
    saveOrganizationAction,
    {} satisfies OperationState,
  );
  const descendants = getDescendantOrganizationIds(organization?.id, organizations);
  return (
    <form action={action} className="admin-editor" key={organization?.id ?? "new"}>
      <input type="hidden" name="id" value={organization?.id ?? ""} />
      <div className="admin-editor__heading">
        <span>
          <Database size={18} />
          <b>{organization ? "แก้ไขหน่วยงาน" : "เพิ่มหน่วยงาน"}</b>
        </span>
        {organization ? (
          <StatusPill tone={organization.active ? "green" : "gray"}>
            {organization.active ? "ใช้งาน" : "ระงับ"}
          </StatusPill>
        ) : null}
      </div>
      <div className="admin-form-grid">
        <label>
          <FieldLabel required>รหัสหน่วยงาน</FieldLabel>
          <input className={fieldClass} name="code" defaultValue={organization?.code} required />
        </label>
        <label>
          <FieldLabel required>ประเภทหน่วยงาน</FieldLabel>
          <input
            className={fieldClass}
            name="organizationType"
            defaultValue={organization?.organizationType ?? "department"}
            required
          />
        </label>
        <label className="sm:col-span-2">
          <FieldLabel required>ชื่อภาษาไทย</FieldLabel>
          <input
            className={fieldClass}
            name="nameTh"
            defaultValue={organization?.nameTh}
            required
          />
        </label>
        <label className="sm:col-span-2">
          <FieldLabel>ชื่อภาษาอังกฤษ</FieldLabel>
          <input className={fieldClass} name="nameEn" defaultValue={organization?.nameEn} />
        </label>
        <label className="sm:col-span-2">
          <FieldLabel>หน่วยงานต้นสังกัด</FieldLabel>
          <select
            className={fieldClass}
            name="parentId"
            defaultValue={organization?.parentId ?? ""}
          >
            <option value="">ไม่มี</option>
            {organizations
              .filter((item) => item.id !== organization?.id && !descendants.has(item.id))
              .map((item) => (
                <option value={item.id} key={item.id}>
                  {item.code} · {item.nameTh}
                </option>
              ))}
          </select>
        </label>
      </div>
      <label className="admin-check-row">
        <input name="active" type="checkbox" defaultChecked={organization?.active ?? true} />
        เปิดใช้งานหน่วยงานนี้
      </label>
      <FormNotice state={state} idle="ข้อมูลนี้ใช้กำหนดขอบเขตสิทธิ์และรายงานทั้งระบบ" />
      <SaveButton pending={pending} />
    </form>
  );
}

function FiscalYearEditor({ fiscalYear }: { fiscalYear?: ReferenceFiscalYear }) {
  const [state, action, pending] = useActionState(
    saveFiscalYearAction,
    {} satisfies OperationState,
  );
  const nextYear = new Date().getFullYear() + 544;
  return (
    <form action={action} className="admin-editor" key={fiscalYear?.id ?? "new"}>
      <input type="hidden" name="id" value={fiscalYear?.id ?? ""} />
      <div className="admin-editor__heading">
        <span>
          <CalendarRange size={18} />
          <b>{fiscalYear ? "แก้ไขปีงบประมาณ" : "เพิ่มปีงบประมาณ"}</b>
        </span>
      </div>
      <div className="admin-form-grid">
        <label>
          <FieldLabel required>พ.ศ.</FieldLabel>
          <input
            className={fieldClass}
            name="buddhistYear"
            type="number"
            min="2500"
            max="3000"
            defaultValue={fiscalYear?.buddhistYear ?? nextYear}
            required
          />
        </label>
        <label>
          <FieldLabel required>สถานะ</FieldLabel>
          <select className={fieldClass} name="status" defaultValue={fiscalYear?.status ?? "open"}>
            <option value="open">เปิดใช้งาน</option>
            <option value="closed">ปิดรอบ</option>
            <option value="archived">เก็บถาวร</option>
          </select>
        </label>
        <label className="sm:col-span-2">
          <FieldLabel required>ชื่อที่แสดง</FieldLabel>
          <input
            className={fieldClass}
            name="label"
            defaultValue={fiscalYear?.label ?? `ปีงบประมาณ ${nextYear}`}
            required
          />
        </label>
        <label>
          <FieldLabel required>วันเริ่มต้น</FieldLabel>
          <input
            className={fieldClass}
            name="startsOn"
            type="date"
            defaultValue={fiscalYear?.startsOn}
            required
          />
        </label>
        <label>
          <FieldLabel required>วันสิ้นสุด</FieldLabel>
          <input
            className={fieldClass}
            name="endsOn"
            type="date"
            defaultValue={fiscalYear?.endsOn}
            required
          />
        </label>
      </div>
      <FormNotice state={state} idle="ปีที่เก็บถาวรสามารถกู้คืนได้จากเมนูถังขยะ" />
      <SaveButton pending={pending} />
    </form>
  );
}

const bangkokInputFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toDateTimeLocal(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return bangkokInputFormatter.format(date).replace(" ", "T");
}

function BudgetCycleEditor({
  cycle,
  fiscalYears,
}: {
  cycle?: ReferenceBudgetCycle;
  fiscalYears: ReferenceFiscalYear[];
}) {
  const [state, action, pending] = useActionState(
    saveBudgetCycleAction,
    {} satisfies OperationState,
  );
  return (
    <form action={action} className="admin-editor" key={cycle?.id ?? "new"}>
      <input type="hidden" name="id" value={cycle?.id ?? ""} />
      <div className="admin-editor__heading">
        <span>
          <CalendarRange size={18} />
          <b>{cycle ? "แก้ไขรอบคำของบ" : "เพิ่มรอบคำของบ"}</b>
        </span>
      </div>
      <div className="admin-form-grid">
        <label>
          <FieldLabel required>ปีงบประมาณ</FieldLabel>
          <select
            className={fieldClass}
            name="fiscalYearId"
            defaultValue={cycle?.fiscalYearId ?? fiscalYears[0]?.id}
            required
          >
            {fiscalYears.map((year) => (
              <option value={year.id} key={year.id}>
                {year.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldLabel required>สถานะ</FieldLabel>
          <select className={fieldClass} name="status" defaultValue={cycle?.status ?? "open"}>
            <option value="open">เปิดรับคำขอ</option>
            <option value="closed">ปิดรอบ</option>
            <option value="archived">เก็บถาวร</option>
          </select>
        </label>
        <label className="sm:col-span-2">
          <FieldLabel required>ชื่อรอบ</FieldLabel>
          <input className={fieldClass} name="name" defaultValue={cycle?.name} required />
        </label>
        <label>
          <FieldLabel required>เปิดรับตั้งแต่</FieldLabel>
          <input
            className={fieldClass}
            name="opensAt"
            type="datetime-local"
            defaultValue={toDateTimeLocal(cycle?.opensAt)}
            required
          />
        </label>
        <label>
          <FieldLabel required>ปิดรับเมื่อ</FieldLabel>
          <input
            className={fieldClass}
            name="closesAt"
            type="datetime-local"
            defaultValue={toDateTimeLocal(cycle?.closesAt)}
            required
          />
        </label>
      </div>
      <label className="admin-check-row">
        <input
          name="allowStaffSubmit"
          type="checkbox"
          defaultChecked={cycle?.allowStaffSubmit ?? true}
        />
        อนุญาตให้ Staff ส่งคำขอในรอบนี้
      </label>
      <FormNotice state={state} idle="ช่วงเวลานี้ควบคุมการสร้างและส่งคำของบประมาณ" />
      <SaveButton pending={pending} />
    </form>
  );
}

export function AdminReferenceSection({ data }: { data: AdminReferenceData }) {
  const [tab, setTab] = useState<ReferenceTab>("organizations");
  const [selectedId, setSelectedId] = useState<string>("");
  const tabs = [
    { id: "organizations", label: "หน่วยงาน", count: data.organizations.length },
    { id: "fiscal-years", label: "ปีงบประมาณ", count: data.fiscalYears.length },
    { id: "budget-cycles", label: "รอบคำของบ", count: data.budgetCycles.length },
  ] as const;
  const organization = data.organizations.find((item) => item.id === selectedId);
  const fiscalYear = data.fiscalYears.find((item) => item.id === selectedId);
  const budgetCycle = data.budgetCycles.find((item) => item.id === selectedId);
  const items =
    tab === "organizations"
      ? data.organizations
      : tab === "fiscal-years"
        ? data.fiscalYears
        : data.budgetCycles;

  return (
    <section className="admin-register">
      <header className="admin-register__header">
        <div>
          <p>REFERENCE DATA</p>
          <h3>ข้อมูลอ้างอิง</h3>
          <small>จัดการค่ากลางที่ใช้ร่วมกันทุกโมดูล</small>
        </div>
        <button type="button" className="admin-secondary-button" onClick={() => setSelectedId("")}>
          <Plus size={15} />
          เพิ่มรายการ
        </button>
      </header>
      <div className="admin-tabs" role="tablist" aria-label="ประเภทข้อมูลอ้างอิง">
        {tabs.map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? "active" : ""}
            key={item.id}
            onClick={() => {
              setTab(item.id);
              setSelectedId("");
            }}
          >
            {item.label}
            <b>{item.count}</b>
          </button>
        ))}
      </div>
      <div className="admin-reference-grid">
        <div className="admin-record-list">
          {items.map((item) => {
            const label =
              "nameTh" in item ? item.nameTh : "buddhistYear" in item ? item.label : item.name;
            const meta =
              "code" in item
                ? item.code
                : "buddhistYear" in item
                  ? `${item.buddhistYear}`
                  : item.fiscalYearLabel;
            const status =
              "active" in item ? (item.active ? "ใช้งาน" : "ระงับ") : statusLabel[item.status];
            return (
              <button
                type="button"
                className={selectedId === item.id ? "active" : ""}
                onClick={() => setSelectedId(item.id)}
                key={item.id}
              >
                <span>
                  <b>{label}</b>
                  <small>{meta}</small>
                </span>
                <em>{status}</em>
              </button>
            );
          })}
          {items.length === 0 ? <p className="admin-empty">ยังไม่มีข้อมูลในหมวดนี้</p> : null}
        </div>
        {tab === "organizations" ? (
          <OrganizationEditor organization={organization} organizations={data.organizations} />
        ) : null}
        {tab === "fiscal-years" ? <FiscalYearEditor fiscalYear={fiscalYear} /> : null}
        {tab === "budget-cycles" ? (
          <BudgetCycleEditor cycle={budgetCycle} fiscalYears={data.fiscalYears} />
        ) : null}
      </div>
    </section>
  );
}
