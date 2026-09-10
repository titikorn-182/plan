"use client";

import { CircleAlert, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { FieldLabel, fieldClass } from "@/components/ui/operation-form";
import { parseBudgetRequestImportFile } from "@/features/budget-requests/import-file";
import type { BudgetRequestImportedRecord } from "@/features/budget-requests/import-file";
import type { BudgetRequestSourceValues } from "@/features/budget-requests/source-fields";

function recordLabel(record: BudgetRequestImportedRecord): string {
  const values = record.values;
  const identity = values.projectActivityName || values.subActivityName || values.activityCode;
  return `แถว ${record.rowNumber}${identity ? ` — ${identity}` : ""}${record.errors.length ? " (ต้องแก้ไขไฟล์)" : ""}`;
}

export function BudgetRequestImportPanel({
  hasExistingValues,
  locked,
  onApplyRecord,
}: {
  hasExistingValues: boolean;
  locked: boolean;
  onApplyRecord: (record: BudgetRequestSourceValues) => void;
}) {
  const [records, setRecords] = useState<BudgetRequestImportedRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState(0);
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [message, setMessage] = useState(
    "เลือกไฟล์ต้นทางเพื่อเติมข้อมูลอัตโนมัติ หรือกรอกข้อมูลที่ใช้งานด้วยตนเอง",
  );

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setErrors([]);
    setMessage("กำลังตรวจสอบหัวตารางและอ่านข้อมูล…");
    const result = await parseBudgetRequestImportFile(file);
    setImporting(false);
    if (result.errors.length > 0) {
      setErrors(result.errors);
      setMessage("ไฟล์ใหม่ยังไม่พร้อมใช้งาน ข้อมูลในฟอร์มไม่ได้ถูกเปลี่ยน");
      event.target.value = "";
      return;
    }
    setRecords(result.records);
    setSelectedRecord(0);
    setFileName(file.name);
    setConfirmReplace(false);
    setMessage(
      `อ่านได้ ${result.records.length.toLocaleString("th-TH")} รายการ เลือกแถวและตรวจสอบก่อนนำไปใช้`,
    );
    event.target.value = "";
  };

  const activeRecord = records[selectedRecord];
  const applyActiveRecord = () => {
    if (!activeRecord || activeRecord.errors.length > 0) return;
    if (hasExistingValues && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    onApplyRecord(activeRecord.values);
    setConfirmReplace(false);
    setMessage(`นำข้อมูลแถว ${activeRecord.rowNumber} ไปใช้ในแบบฟอร์มแล้ว`);
  };

  return (
    <section className="border-x border-b border-stone-200 bg-[#fff8f4] p-5 sm:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)] lg:items-center">
        <label className="group flex min-h-28 cursor-pointer items-center gap-4 border border-dashed border-orange-300 bg-white px-5 py-4 hover:border-[#ee4f16] focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-orange-500">
          {importing ? (
            <LoaderCircle className="shrink-0 animate-spin text-[#d83b0b]" size={28} />
          ) : (
            <Upload className="shrink-0 text-[#d83b0b]" size={28} />
          )}
          <span>
            <b className="block text-sm text-stone-950">นำเข้าจาก XLSX หรือ CSV</b>
            <small className="mt-1 block text-xs leading-5 text-stone-600">
              หัวตารางอยู่แถวที่ 1 ขนาดไม่เกิน 5 MB และไม่เกิน 500 รายการ
            </small>
          </span>
          <input
            className="sr-only"
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={handleImport}
            disabled={importing || locked}
          />
        </label>

        <div aria-live="polite">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 shrink-0 text-stone-500" size={21} />
            <div className="min-w-0 flex-1">
              <b className="block truncate text-sm text-stone-900">
                {fileName || "ยังไม่ได้เลือกไฟล์"}
              </b>
              <p className="mt-1 text-xs leading-5 text-stone-600">{message}</p>
            </div>
          </div>
          {locked ? (
            <p className="mt-3 border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800">
              บันทึกฉบับร่างแล้ว จึงล็อกการเปลี่ยนไฟล์และแถวเพื่อป้องกันการเขียนทับรายการเดิม
              <a
                className="ml-1 font-bold underline underline-offset-2"
                href="/budget-requests/new"
              >
                สร้างคำขอใหม่
              </a>
            </p>
          ) : null}
          {records.length > 0 ? (
            <label className="mt-3 block">
              <FieldLabel>เลือกรายการที่จะสร้างคำขอ</FieldLabel>
              <select
                className={fieldClass}
                value={selectedRecord}
                onChange={(event) => {
                  const index = Number(event.target.value);
                  setSelectedRecord(index);
                  setConfirmReplace(false);
                }}
                disabled={locked}
              >
                {records.map((record, index) => (
                  <option key={`${record.values.activityCode}-${index}`} value={index}>
                    {recordLabel(record)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {activeRecord && !locked ? (
            <div className="mt-3 border-t border-orange-200 pt-3">
              {activeRecord.errors.length > 0 ? (
                <ul className="mb-3 space-y-1 text-xs text-red-800">
                  {activeRecord.errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
              {activeRecord.warnings.length > 0 ? (
                <ul className="mb-3 space-y-1 text-xs text-orange-900">
                  {activeRecord.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              {confirmReplace ? (
                <div className="flex flex-wrap items-center gap-2 border border-orange-300 bg-orange-50 p-3 text-xs text-orange-950">
                  <span className="mr-auto">ข้อมูลที่กรอกอยู่จะถูกแทนที่ด้วยแถวที่เลือก</span>
                  <button
                    className="border border-stone-300 bg-white px-3 py-2 font-semibold"
                    type="button"
                    onClick={() => setConfirmReplace(false)}
                  >
                    ยกเลิก
                  </button>
                  <button
                    className="bg-[#cf430c] px-3 py-2 font-semibold text-white"
                    type="button"
                    onClick={applyActiveRecord}
                  >
                    ยืนยันการแทนที่
                  </button>
                </div>
              ) : (
                <button
                  className="bg-[#cf430c] px-4 py-2 text-xs font-bold text-white hover:bg-[#ad3507] disabled:cursor-not-allowed disabled:bg-stone-300"
                  type="button"
                  onClick={applyActiveRecord}
                  disabled={activeRecord.errors.length > 0}
                >
                  ใช้ข้อมูลแถวนี้
                </button>
              )}
            </div>
          ) : null}
          {errors.length > 0 ? (
            <ul className="mt-3 space-y-1 border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {errors.map((error) => (
                <li className="flex items-start gap-2" key={error}>
                  <CircleAlert className="mt-0.5 shrink-0" size={14} /> {error}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
