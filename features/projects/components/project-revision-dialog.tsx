"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { projectRevisionAction } from "@/features/projects/revision-action";
import type { ProjectRow } from "@/features/projects/types";

export function ProjectRevisionDialog({
  project,
  onClose,
  onSaved,
}: {
  project: ProjectRow;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const reviewing = Boolean(project.canReviewRevision);
  const requesting = !reviewing && Boolean(project.canRequestRevision);
  const title = reviewing
    ? "พิจารณาคำขอแก้ไขโครงการ"
    : requesting
      ? "ขอแก้ไขโครงการหลังอนุมัติ"
      : "ผลการขอแก้ไขโครงการ";
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    cancel.current?.focus();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  function submit(operation: "request" | "return" | "decline") {
    if (submitting.current) return;
    if (reason.trim().length < 5 || reason.trim().length > 1000) {
      setError("กรุณาระบุเหตุผล 5–1,000 ตัวอักษร");
      return;
    }
    submitting.current = true;
    setError("");
    startTransition(async () => {
      try {
        const result = await projectRevisionAction({
          projectId: project.uuid,
          version: project.version ?? 0,
          requestId: project.revision?.id,
          operation,
          reason,
        });
        if (result.success) onSaved(result.message ?? "บันทึกแล้ว");
        else setError(result.message ?? "บันทึกไม่สำเร็จ กรุณาเปิดทะเบียนใหม่");
      } catch {
        setError("ยังยืนยันผลไม่ได้ กรุณาปิดหน้าต่างและเปิดทะเบียนใหม่เพื่อตรวจสอบก่อนลองอีกครั้ง");
      } finally {
        submitting.current = false;
      }
    });
  }
  const button =
    "min-h-11 border border-stone-300 px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad3507] disabled:opacity-50";
  return (
    <dialog
      ref={dialog}
      aria-labelledby="project-revision-title"
      aria-describedby="project-revision-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto border border-stone-300 bg-white p-5 text-stone-950 backdrop:bg-black/40"
    >
      <h2 id="project-revision-title" className="text-lg font-bold">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 [overflow-wrap:anywhere]">
        {project.id} · {project.title}
      </p>
      <p id="project-revision-description" className="mt-3 text-sm leading-6 text-stone-600">
        {requesting
          ? "เจ้าของโครงการส่งคำขอพร้อมเหตุผลได้ แต่ยังแก้ไขไม่ได้จนกว่าผู้ดูแลระบบจะส่งกลับ"
          : reviewing
            ? "เมื่อส่งกลับ เจ้าหน้าที่จะแก้ไขโครงการเดิมและต้องส่งอนุมัติใหม่ รหัสโครงการและประวัติเดิมยังคงอยู่ โครงการที่มีเบิกจ่ายหรือรายงานอ้างอิงจะส่งกลับไม่ได้"
            : "คำขอและผลพิจารณาล่าสุดของโครงการนี้"}
      </p>
      {project.revision && (
        <div className="mt-4 space-y-2 border border-stone-200 p-3 text-sm leading-6 [overflow-wrap:anywhere]">
          <p className="font-semibold">
            {project.revision.status === "pending"
              ? "รอผู้ดูแลระบบพิจารณา"
              : project.revision.status === "returned"
                ? "ผู้ดูแลระบบส่งกลับแก้ไขแล้ว"
                : "ไม่อนุญาตให้แก้ไข"}
          </p>
          <p className="whitespace-pre-wrap">เหตุผลที่ขอ: {project.revision.reason}</p>
          {project.revision.decisionReason && (
            <p className="whitespace-pre-wrap">
              เหตุผลผู้ดูแลระบบ: {project.revision.decisionReason}
            </p>
          )}
        </div>
      )}
      {(requesting || reviewing) && (
        <div className="mt-4">
          <label htmlFor="project-revision-reason" className="block text-sm font-semibold">
            {reviewing ? "เหตุผลประกอบการพิจารณา" : "เหตุผลที่ขอแก้ไข"} *
          </label>
          <textarea
            id="project-revision-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError("");
            }}
            required
            minLength={5}
            maxLength={1000}
            disabled={pending}
            rows={4}
            aria-describedby="project-revision-reason-help"
            aria-invalid={Boolean(error)}
            className="mt-2 w-full border border-stone-300 p-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-[#ad3507] disabled:bg-stone-50"
          />
          <p id="project-revision-reason-help" className="mt-1 text-xs text-stone-600">
            ระบุ 5–1,000 ตัวอักษร เช่น รายละเอียดที่ต้องการแก้ไขและสาเหตุ
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2" aria-busy={pending}>
        <button
          ref={cancel}
          type="button"
          disabled={pending}
          onClick={onClose}
          className={`${button} hover:bg-stone-50`}
        >
          {requesting || reviewing ? "ยกเลิก" : "ปิด"}
        </button>
        {reviewing && (
          <button
            type="button"
            disabled={pending}
            onClick={() => submit("decline")}
            className={`${button} text-red-700 hover:bg-red-50`}
          >
            ไม่อนุญาต
          </button>
        )}
        {(requesting || reviewing) && (
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(reviewing ? "return" : "request")}
            className={`${button} border-[#cf430c] bg-[#cf430c] text-white hover:bg-[#ad3507]`}
          >
            {pending ? "กำลังบันทึก…" : reviewing ? "ยืนยันส่งกลับแก้ไข" : "ส่งคำขอแก้ไข"}
          </button>
        )}
      </div>
    </dialog>
  );
}
