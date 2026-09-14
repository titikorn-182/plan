"use client";

import { useActionState } from "react";
import { LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { restoreArchivedRecordAction } from "@/features/admin/actions";
import type { ArchivedRecord } from "@/features/admin/types";
import type { OperationState } from "@/features/shared/action-state";

const entityLabel: Record<ArchivedRecord["entityType"], string> = {
  budget_request: "คำของบประมาณ",
  project: "โครงการ",
  attachment: "หลักฐาน",
  comment: "ความคิดเห็น",
  fiscal_year: "ปีงบประมาณ",
};

function RestoreButton({ record }: { record: ArchivedRecord }) {
  const [state, action, pending] = useActionState(
    restoreArchivedRecordAction,
    {} satisfies OperationState,
  );
  return (
    <form action={action} className="admin-restore-form">
      <input type="hidden" name="id" value={record.id} />
      <input type="hidden" name="entityType" value={record.entityType} />
      <button disabled={pending} type="submit">
        {pending ? <LoaderCircle className="animate-spin" size={15} /> : <RotateCcw size={15} />}
        กู้คืน
      </button>
      {state.message ? (
        <small className={state.success ? "success" : "error"}>{state.message}</small>
      ) : null}
    </form>
  );
}

export function AdminTrashSection({ records }: { records: ArchivedRecord[] }) {
  return (
    <section className="admin-register">
      <header className="admin-register__header">
        <div>
          <p>RECOVERY</p>
          <h3>ถังขยะ</h3>
          <small>กู้คืนข้อมูลที่ถูกเก็บถาวรโดยไม่ลบข้อมูลออกจากระบบ</small>
        </div>
        <span className="admin-register__count">
          <Trash2 size={17} />
          {records.length.toLocaleString("th-TH")} รายการ
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="admin-table min-w-[700px]">
          <thead>
            <tr>
              <th>ประเภท</th>
              <th>รหัส</th>
              <th>รายการ</th>
              <th>เก็บถาวรเมื่อ</th>
              <th aria-label="การดำเนินการ" />
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={`${record.entityType}-${record.id}`}>
                <td>{entityLabel[record.entityType]}</td>
                <td>
                  <code>{record.code}</code>
                </td>
                <td>
                  <b>{record.title}</b>
                </td>
                <td>{record.archivedAt}</td>
                <td>
                  <RestoreButton record={record} />
                </td>
              </tr>
            ))}
            {records.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-empty">
                  ไม่มีข้อมูลในถังขยะ
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <footer className="admin-register__note">
        ระบบยังไม่เปิดให้ลบถาวร เพื่อป้องกันการสูญหายของข้อมูลสำคัญ
      </footer>
    </section>
  );
}
