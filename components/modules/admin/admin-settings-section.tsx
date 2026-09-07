"use client";

import { useActionState } from "react";
import { LoaderCircle, Save, Settings2 } from "lucide-react";
import { updateSystemSettingsAction } from "@/features/admin/actions";
import type { AdminSettings, ReferenceFiscalYear } from "@/features/admin/types";
import type { OperationState } from "@/features/shared/action-state";
import { FieldLabel, FormNotice, fieldClass } from "@/components/ui/operation-form";

export function AdminSettingsSection({
  settings,
  fiscalYears,
}: {
  settings: AdminSettings;
  fiscalYears: ReferenceFiscalYear[];
}) {
  const [state, action, pending] = useActionState(
    updateSystemSettingsAction,
    {} satisfies OperationState,
  );
  return (
    <section className="admin-register">
      <header className="admin-register__header">
        <div>
          <p>SYSTEM POLICY</p>
          <h3>ตั้งค่าระบบ</h3>
          <small>กำหนดค่าเริ่มต้นและกติกากลางสำหรับการใช้งาน</small>
        </div>
        <Settings2 size={21} />
      </header>
      <form action={action} className="admin-settings-form">
        <input type="hidden" name="id" value={settings.id} />
        <fieldset>
          <legend>บัญชีผู้ใช้งาน</legend>
          <label>
            <FieldLabel required>โดเมนอีเมลที่อนุญาต</FieldLabel>
            <div className="admin-domain-input">
              <span>@</span>
              <input
                className={fieldClass}
                name="allowedEmailDomain"
                defaultValue={settings.allowedEmailDomain}
                required
              />
            </div>
            <small>ใช้ตรวจสอบอีเมลใหม่ที่ผู้ดูแลระบบส่งคำเชิญ</small>
          </label>
        </fieldset>
        <fieldset>
          <legend>รอบรายงานเริ่มต้น</legend>
          <div className="admin-form-grid">
            <label>
              <FieldLabel>ปีงบประมาณเริ่มต้น</FieldLabel>
              <select
                className={fieldClass}
                name="defaultFiscalYearId"
                defaultValue={settings.defaultFiscalYearId ?? ""}
              >
                <option value="">เลือกอัตโนมัติตามวันที่</option>
                {fiscalYears
                  .filter((year) => year.status !== "archived")
                  .map((year) => (
                    <option value={year.id} key={year.id}>
                      {year.label}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <FieldLabel required>ไตรมาสเริ่มต้น</FieldLabel>
              <select
                className={fieldClass}
                name="defaultQuarter"
                defaultValue={settings.defaultQuarter}
              >
                {[1, 2, 3, 4].map((quarter) => (
                  <option value={quarter} key={quarter}>
                    ไตรมาส {quarter}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="admin-setting-help">
            ผู้ใช้ยังสามารถเลือกปีและไตรมาสของตนเองได้ ค่านี้ใช้เมื่อยังไม่เคยเลือกเท่านั้น
          </p>
        </fieldset>
        <fieldset>
          <legend>การแจ้งเตือน</legend>
          <label className="admin-number-setting">
            <span>
              <FieldLabel required>แจ้งเตือนก่อนถึงกำหนด</FieldLabel>
              <small>ใช้เป็นนโยบายกลางสำหรับงานที่มีวันครบกำหนด</small>
            </span>
            <input
              className={fieldClass}
              name="reminderDaysBefore"
              type="number"
              min="1"
              max="90"
              defaultValue={settings.reminderDaysBefore}
              required
            />
            <b>วัน</b>
          </label>
        </fieldset>
        <FormNotice
          state={state}
          idle={`แก้ไขล่าสุด ${settings.updatedAt} · การเปลี่ยนแปลงจะบันทึกในประวัติระบบ`}
        />
        <button className="admin-action-button" disabled={pending} type="submit">
          {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
          บันทึกการตั้งค่า
        </button>
      </form>
    </section>
  );
}
