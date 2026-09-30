"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { archiveBudgetRequestAction } from "@/features/budget-requests/archive-action";
import type { BudgetRequest } from "@/features/budget-requests/types";

export function BudgetRequestDeleteDialog({
  request,
  onClose,
  onDeleted,
}: {
  request: BudgetRequest;
  onClose: () => void;
  onDeleted: (message: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

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

  function confirmDelete() {
    if (submitting.current) return;
    submitting.current = true;
    setError("");
    startTransition(async () => {
      try {
        const result = await archiveBudgetRequestAction({
          id: request.uuid,
          version: request.version,
        });
        if (result.success) onDeleted(result.message ?? "ย้ายคำขอไปถังขยะแล้ว");
        else setError(result.message ?? "ลบคำขอไม่สำเร็จ กรุณาเปิดทะเบียนใหม่");
      } catch {
        setError(
          "ยังยืนยันผลการลบไม่ได้ กรุณาปิดหน้าต่างนี้และเปิดทะเบียนใหม่เพื่อตรวจสอบก่อนลองอีกครั้ง",
        );
      } finally {
        submitting.current = false;
      }
    });
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="delete-budget-title"
      aria-describedby="delete-budget-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto border border-stone-300 bg-white p-5 text-stone-950 backdrop:bg-black/40"
    >
      <h2 id="delete-budget-title" className="text-lg font-bold">
        ยืนยันลบคำขอ {request.id}?
      </h2>
      <p className="mt-3 text-sm leading-6 [overflow-wrap:anywhere]">{request.title}</p>
      <p id="delete-budget-description" className="mt-3 text-sm leading-6 text-stone-600">
        รายการจะถูกย้ายออกจากทะเบียนไปยังถังขยะ ไม่ลบข้อมูลถาวร
        ผู้ดูแลระบบสามารถกู้คืนได้ในหน้ากำกับและตั้งค่าระบบ
      </p>
      {error && (
        <p
          role="alert"
          className="mt-4 border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-800"
        >
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2" aria-busy={pending}>
        <button
          ref={cancel}
          type="button"
          disabled={pending}
          onClick={onClose}
          className="min-h-11 border border-stone-300 px-4 text-sm font-semibold hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-[#ad3507] disabled:opacity-50"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={confirmDelete}
          className="min-h-11 bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50"
        >
          {pending ? "กำลังย้ายไปถังขยะ…" : "ยืนยันลบ"}
        </button>
      </div>
    </dialog>
  );
}
