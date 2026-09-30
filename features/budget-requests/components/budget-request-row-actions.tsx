"use client";

import Link from "next/link";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import { StatusPill } from "@/components/ui/module-primitives";
import type { BudgetRequest } from "@/features/budget-requests/types";

const statusTone: Record<BudgetRequest["status"], "orange" | "red" | "green" | "gray"> = {
  ฉบับร่าง: "gray",
  รอตรวจสอบ: "orange",
  รออนุมัติ: "orange",
  อนุมัติแล้ว: "green",
  ส่งกลับแก้ไข: "red",
  ยกเลิก: "gray",
};

export function BudgetRequestRowActions({
  request,
  canDelete,
  onDelete,
}: {
  request: BudgetRequest;
  canDelete: boolean;
  onDelete: (request: BudgetRequest) => void;
}) {
  const deletable = canDelete && request.deletable && request.version > 0;
  return (
    <details
      className="min-w-36"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        className="flex min-h-10 cursor-pointer list-none items-center gap-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad3507] [&::-webkit-details-marker]:hidden"
        aria-label={`สถานะและเมนู ${request.id}`}
      >
        <StatusPill tone={statusTone[request.status]}>{request.status}</StatusPill>
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <div className="mt-1 w-44 border border-stone-300 bg-white p-1">
        {request.editable ? (
          <Link
            className="flex min-h-11 items-center gap-2 px-2 text-sm hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-[#ad3507]"
            href={`/budget-requests/${request.uuid}/edit`}
          >
            <Pencil size={15} aria-hidden="true" /> แก้ไข
          </Link>
        ) : (
          <div className="px-2 py-2">
            <button
              type="button"
              disabled
              className="flex min-h-11 items-center gap-2 text-sm text-stone-500"
            >
              <Pencil size={15} aria-hidden="true" /> แก้ไข
            </button>
            <p className="text-[11px] leading-5 text-stone-600">
              {request.editDeniedReason ?? "คำขอนี้ไม่อยู่ในสถานะที่คุณแก้ไขได้"}
            </p>
          </div>
        )}
        <button
          type="button"
          disabled={!deletable}
          onClick={() => onDelete(request)}
          className="flex min-h-11 w-full items-center gap-2 px-2 text-left text-sm text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:text-stone-500 disabled:hover:bg-white"
        >
          <Trash2 size={15} aria-hidden="true" /> ลบ
        </button>
        {!deletable && (
          <p className="px-2 pb-2 text-[11px] leading-5 text-stone-600">
            {canDelete ? "ลบได้เฉพาะฉบับร่างหรือยกเลิก" : "ลบได้เฉพาะผู้ดูแลระบบ"}
          </p>
        )}
      </div>
    </details>
  );
}
