"use client";

import { useActionState, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  FileSearch,
  FileUp,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { reviewEvidenceAction } from "@/features/evidence/actions";
import {
  createEvidenceStoragePath,
  EVIDENCE_ACCEPT,
  EVIDENCE_BUCKET,
  EVIDENCE_MAX_FILE_SIZE_LABEL,
  isEvidenceMimeType,
  validateEvidenceFile,
} from "@/features/evidence/upload-config";
import type { OperationState } from "@/features/shared/action-state";
import { FieldLabel, FormNotice, fieldClass } from "@/components/ui/operation-form";
import { RegisterSection, StatusPill } from "@/components/ui/module-primitives";
import { PaginationNav } from "@/components/ui/pagination-nav";
import type { AppRole } from "@/features/auth/types";
import type { EvidenceEntityOption, EvidenceRow } from "@/features/evidence/types";
import { formatThaiNumber } from "@/features/shared/formatters";
import type { PaginationMeta } from "@/features/shared/pagination";
import { createClient } from "@/lib/supabase/client";
import { INPUT_LIMITS } from "@/lib/config/limits";

const entityLabel: Record<string, string> = {
  budget_request: "คำของบ",
  project: "โครงการ",
  quarterly_report: "รายงานไตรมาส",
  project_completion_report: "รายงานผลโครงการ",
  kpi_result: "ผล KPI",
};

function EvidenceReview({ row }: { row: EvidenceRow }) {
  const [state, action, pending] = useActionState(
    reviewEvidenceAction,
    {} satisfies OperationState,
  );
  return (
    <form action={action} className="mt-3 border-t border-stone-200 pt-3">
      <input type="hidden" name="id" value={row.id} />
      <textarea
        className="min-h-16 w-full border border-stone-300 px-2 py-1.5 text-xs outline-none focus:border-orange-500"
        name="comment"
        placeholder="เหตุผลเมื่อส่งกลับแก้ไข"
        maxLength={1000}
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`text-[10px] ${state.success ? "text-emerald-700" : "text-red-700"}`}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </span>
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-1 border border-stone-300 px-2 py-1.5 text-[11px] font-semibold disabled:opacity-50"
            name="decision"
            value="return"
            disabled={pending}
          >
            <RotateCcw size={13} />
            ส่งกลับ
          </button>
          <button
            className="inline-flex items-center gap-1 bg-emerald-700 px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
            name="decision"
            value="verify"
            disabled={pending}
          >
            <CheckCircle2 size={13} />
            รับรอง
          </button>
        </div>
      </div>
    </form>
  );
}

export function EvidenceView({
  rows,
  entities,
  pagination,
  role,
  initialEntityId,
  initialEntityType,
}: {
  rows: EvidenceRow[];
  entities: EvidenceEntityOption[];
  pagination: PaginationMeta;
  role: AppRole;
  initialEntityId?: string;
  initialEntityType?: string;
}) {
  const router = useRouter();
  const uploadFormRef = useRef<HTMLFormElement>(null);
  const [uploadState, setUploadState] = useState<OperationState>({});
  const [uploading, setUploading] = useState(false);
  const initialEntity = entities.find(
    (item) => item.id === initialEntityId && item.entityType === initialEntityType,
  );
  const [entityId, setEntityId] = useState(initialEntity?.id ?? entities[0]?.id ?? "");
  const selected = useMemo(
    () => entities.find((item) => item.id === entityId),
    [entities, entityId],
  );
  const verified = rows.filter((row) => row.verified).length;
  const canReview = role === "admin" || role === "user";

  async function uploadEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) {
      setUploadState({ success: false, message: "กรุณาเลือกรายการที่จะผูกหลักฐาน" });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");
    if (!(file instanceof File)) {
      setUploadState({ success: false, message: "กรุณาเลือกไฟล์หลักฐาน" });
      return;
    }
    const validationMessage = validateEvidenceFile(file);
    if (validationMessage || !isEvidenceMimeType(file.type)) {
      setUploadState({
        success: false,
        message: validationMessage ?? "ชนิดไฟล์ไม่ถูกต้อง",
      });
      return;
    }

    setUploading(true);
    setUploadState({ message: "กำลังอัปโหลดไฟล์ไปยังพื้นที่จัดเก็บที่ปลอดภัย…" });
    const supabase = createClient();
    let storagePath: string | null = null;

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setUploadState({ success: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
        return;
      }

      storagePath = createEvidenceStoragePath({
        organizationId: selected.organizationId,
        entityType: selected.entityType,
        entityId: selected.id,
        userId: userData.user.id,
        mimeType: file.type,
      });
      const { error: uploadError } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setUploadState({
          success: false,
          message: "อัปโหลดไฟล์ไม่สำเร็จ กรุณาตรวจสอบเครือข่ายและลองใหม่",
        });
        return;
      }

      const response = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: selected.id,
          entityType: selected.entityType,
          organizationId: selected.organizationId,
          fileName: file.name.slice(0, INPUT_LIMITS.fileName),
          storagePath,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : null;

      if (!response.ok) {
        await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
        setUploadState({
          success: false,
          message: message ?? "ลงทะเบียนไฟล์ไม่สำเร็จ กรุณาลองใหม่",
        });
        return;
      }

      setUploadState({ success: true, message: message ?? `อัปโหลด ${file.name} แล้ว` });
      uploadFormRef.current?.reset();
      router.refresh();
    } catch {
      if (storagePath) await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
      setUploadState({
        success: false,
        message: "การเชื่อมต่อขัดข้อง กรุณาตรวจสอบเครือข่ายและลองใหม่",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="grid border border-stone-200 bg-white sm:grid-cols-3">
        <article className="flex items-center gap-4 border-b border-stone-200 p-5 sm:border-r sm:border-b-0">
          <FileSearch className="text-sky-700" />
          <span>
            <b className="block text-2xl">{pagination.total}</b>
            <small className="text-stone-500">หลักฐานทั้งหมด</small>
          </span>
        </article>
        <article className="flex items-center gap-4 border-b border-stone-200 p-5 sm:border-r sm:border-b-0">
          <ShieldCheck className="text-emerald-700" />
          <span>
            <b className="block text-2xl">{verified}</b>
            <small className="text-stone-500">รับรองแล้ว (หน้านี้)</small>
          </span>
        </article>
        <article className="flex items-center gap-4 p-5">
          <RotateCcw className="text-orange-700" />
          <span>
            <b className="block text-2xl">{rows.length - verified}</b>
            <small className="text-stone-500">รอตรวจสอบ (หน้านี้)</small>
          </span>
        </article>
      </section>
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <RegisterSection
          title="อัปโหลดหลักฐาน"
          aside={<FileUp size={18} className="text-[#c9440b]" />}
        >
          <form ref={uploadFormRef} onSubmit={uploadEvidence} className="space-y-4 p-5">
            <label className="block">
              <FieldLabel required>ผูกกับรายการ</FieldLabel>
              <select
                className={fieldClass}
                name="entityId"
                value={entityId}
                onChange={(event) => setEntityId(event.target.value)}
                required
              >
                {entities.map((item) => (
                  <option key={`${item.entityType}-${item.id}`} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <FieldLabel required>ไฟล์หลักฐาน</FieldLabel>
              <input
                className="mt-1.5 block w-full border border-dashed border-stone-300 bg-stone-50 p-4 text-xs file:mr-3 file:border-0 file:bg-[#cf430c] file:px-3 file:py-2 file:font-semibold file:text-white"
                name="file"
                type="file"
                accept={EVIDENCE_ACCEPT}
                required
              />
            </label>
            <p className="text-[11px] leading-5 text-stone-500">
              รองรับ PDF, JPG, PNG, XLSX และ CSV ขนาดไม่เกิน {EVIDENCE_MAX_FILE_SIZE_LABEL}{" "}
              ไฟล์ทั้งหมดเก็บใน private bucket
            </p>
            <FormNotice state={uploadState} idle="ตรวจชนิดและขนาดไฟล์ก่อนบันทึก metadata" />
            <button
              className="inline-flex w-full items-center justify-center gap-2 bg-[#cf430c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              disabled={uploading || entities.length === 0}
            >
              {uploading ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <FileUp size={16} />
              )}
              อัปโหลดหลักฐาน
            </button>
          </form>
        </RegisterSection>
        <RegisterSection
          title="ทะเบียนและการตรวจหลักฐาน"
          aside={<span className="text-xs text-stone-500">แสดงล่าสุด {rows.length} ไฟล์</span>}
        >
          <div className="grid gap-px bg-stone-200 md:grid-cols-2 2xl:grid-cols-3">
            {rows.map((row) => (
              <article className="bg-white p-4" key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <small className="font-bold text-[#b53807]">
                      {entityLabel[row.entityType] ?? row.entityType} · {row.businessId}
                    </small>
                    <b className="mt-1 block truncate text-sm" title={row.fileName}>
                      {row.fileName}
                    </b>
                  </span>
                  <StatusPill tone={row.verified ? "green" : "orange"}>
                    {row.verified ? "รับรองแล้ว" : "รอตรวจ"}
                  </StatusPill>
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-stone-600">{row.title}</p>
                <dl className="mt-3 space-y-1 text-[11px] text-stone-500">
                  <div className="flex justify-between gap-2">
                    <dt>หน่วยงาน</dt>
                    <dd className="truncate text-right">{row.unit}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>ขนาดไฟล์</dt>
                    <dd>
                      {formatThaiNumber(row.sizeBytes / 1024 / 1024, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      MB
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>อัปโหลด</dt>
                    <dd>{row.uploadedAt}</dd>
                  </div>
                </dl>
                <a
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-800 hover:underline"
                  href={`/evidence/${row.id}/download`}
                >
                  <Download size={14} />
                  ดาวน์โหลดแบบลงชื่อ
                </a>
                {canReview && !row.verified ? <EvidenceReview row={row} /> : null}
              </article>
            ))}
            {rows.length === 0 ? (
              <p className="bg-white p-8 text-center text-sm text-stone-500 md:col-span-2 2xl:col-span-3">
                ยังไม่มีหลักฐานในขอบเขตสิทธิ์
              </p>
            ) : null}
          </div>
          <PaginationNav basePath="/evidence" pagination={pagination} />
        </RegisterSection>
      </div>
    </div>
  );
}
