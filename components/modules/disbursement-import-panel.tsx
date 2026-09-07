"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileDown, LoaderCircle, Upload } from "lucide-react";
import {
  confirmDisbursementImport,
  previewDisbursementImport,
} from "@/features/disbursements/import-actions";
import type {
  DisbursementImportPreview,
  DisbursementImportResult,
} from "@/features/disbursements/import-types";
import type { ReportingPeriod } from "@/features/shared/types";
import { formatThaiNumber } from "@/features/shared/formatters";

const EMPTY_PREVIEW: DisbursementImportPreview = {
  errors: [],
  fileName: "",
  message: "เลือกไฟล์ .xlsx หรือ .csv เพื่อเริ่มตรวจสอบ",
  rows: [],
  success: false,
};

export function DisbursementImportPanel({
  onClose,
  period,
}: {
  onClose: () => void;
  period: ReportingPeriod;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState(EMPTY_PREVIEW);
  const [result, setResult] = useState<DisbursementImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    setResult(null);
    setPreview({ ...EMPTY_PREVIEW, fileName: file.name, message: "กำลังอ่านและตรวจสอบไฟล์…" });
    startTransition(async () => setPreview(await previewDisbursementImport(formData)));
  }

  function confirmImport() {
    startTransition(async () => {
      const next = await confirmDisbursementImport(preview.rows);
      setResult(next);
      if (next.success) {
        setPreview(EMPTY_PREVIEW);
        router.refresh();
      }
    });
  }

  return (
    <section className="border-b border-orange-200 bg-[#fffaf6] p-4" aria-labelledby="import-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold" id="import-title">
            นำเข้ารายการเบิกจ่าย
          </h3>
          <p className="mt-1 text-xs text-stone-600">
            รอบ {period.fiscalYearLabel} · {period.quarterLabel} · สูงสุด 500 รายการ/ไฟล์ 2 MB
          </p>
        </div>
        <button
          className="text-xs font-semibold text-stone-600 hover:text-stone-950"
          type="button"
          onClick={onClose}
        >
          ปิด
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="flex min-h-12 cursor-pointer items-center gap-3 border border-dashed border-orange-400 bg-white px-4 text-sm font-semibold text-[#b53807] hover:bg-orange-50">
          <Upload size={18} aria-hidden="true" />
          <span>{preview.fileName || "เลือกไฟล์จากเครื่อง"}</span>
          <input
            className="sr-only"
            type="file"
            accept=".xlsx,.csv"
            disabled={pending}
            onChange={handleFile}
          />
        </label>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-2 border border-stone-300 bg-white px-4 text-xs font-semibold"
          href="/api/disbursements/template"
        >
          <FileDown size={16} /> ดาวน์โหลดแม่แบบ
        </Link>
      </div>

      <p
        className={`mt-3 flex items-center gap-2 text-xs ${preview.errors.length ? "text-red-700" : preview.success ? "text-emerald-700" : "text-stone-600"}`}
        role="status"
        aria-live="polite"
      >
        {pending ? (
          <LoaderCircle className="animate-spin motion-reduce:animate-none" size={15} />
        ) : preview.success ? (
          <CheckCircle2 size={15} />
        ) : preview.errors.length ? (
          <AlertCircle size={15} />
        ) : null}
        {preview.message}
      </p>

      {preview.errors.length ? (
        <div className="mt-3 max-h-40 overflow-y-auto border border-red-200 bg-red-50 p-3">
          <ul className="space-y-1 text-xs text-red-800">
            {preview.errors.slice(0, 25).map((issue, index) => (
              <li key={`${issue.rowNumber}-${issue.field}-${index}`}>
                แถว {issue.rowNumber}: {issue.message}
              </li>
            ))}
          </ul>
          {preview.errors.length > 25 ? (
            <p className="mt-2 text-xs text-red-700">และอีก {preview.errors.length - 25} จุด</p>
          ) : null}
        </div>
      ) : null}

      {preview.success ? (
        <div className="mt-4 border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-stone-100 text-stone-600">
                <tr>
                  <th className="px-3 py-2">แถว</th>
                  <th className="px-3 py-2">โครงการ</th>
                  <th className="px-3 py-2">ไตรมาส</th>
                  <th className="px-3 py-2 text-right">จำนวนเงิน</th>
                  <th className="px-3 py-2">วันที่</th>
                  <th className="px-3 py-2">เลขอ้างอิง</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 10).map((row) => (
                  <tr className="border-t border-stone-200" key={row.rowNumber}>
                    <td className="px-3 py-2">{row.rowNumber}</td>
                    <td className="px-3 py-2 font-semibold">{row.projectCode}</td>
                    <td className="px-3 py-2">Q{row.quarter}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatThaiNumber(row.amount)}
                    </td>
                    <td className="px-3 py-2">{row.disbursedOn}</td>
                    <td className="px-3 py-2">{row.referenceNo || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 p-3">
            <span className="text-xs text-stone-600">
              แสดงตัวอย่าง {Math.min(10, preview.rows.length)} จาก {preview.rows.length} รายการ
            </span>
            <button
              className="inline-flex min-h-10 items-center gap-2 bg-[#cf430c] px-5 text-xs font-semibold text-white disabled:opacity-50"
              type="button"
              disabled={pending}
              onClick={confirmImport}
            >
              {pending ? (
                <LoaderCircle className="animate-spin motion-reduce:animate-none" size={15} />
              ) : null}
              ยืนยันบันทึก {preview.rows.length} รายการ
            </button>
          </div>
        </div>
      ) : null}

      {result ? (
        <p
          className={`mt-3 text-xs font-semibold ${result.success ? "text-emerald-700" : "text-red-700"}`}
          role="status"
        >
          {result.message}
        </p>
      ) : null}
    </section>
  );
}
