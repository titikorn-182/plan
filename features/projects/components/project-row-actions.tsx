"use client";

import Link from "next/link";
import { ChevronDown, Pencil, Trash2, RotateCcw } from "lucide-react";
import type { ProjectRow } from "@/features/projects/types";

export function ProjectRowActions({
  project,
  onDelete,
  onRevision,
}: {
  project: ProjectRow;
  onDelete: (project: ProjectRow) => void;
  onRevision: (project: ProjectRow) => void;
}) {
  return (
    <details
      className="min-w-24"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        aria-label={`จัดการโครงการ ${project.id}`}
        className="flex min-h-11 cursor-pointer list-none items-center gap-1 px-2 font-semibold hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-[#ad3507] [&::-webkit-details-marker]:hidden"
      >
        จัดการ <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <div className="mt-1 w-44 border border-stone-300 bg-white p-1">
        {(project.canRequestRevision || project.canReviewRevision || project.revision) && (
          <div className="border-b border-stone-200 pb-1">
            <button
              type="button"
              onClick={() => onRevision(project)}
              className="flex min-h-11 w-full items-center gap-2 px-2 text-left text-sm text-[#ad3507] hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-[#ad3507]"
            >
              <RotateCcw size={15} aria-hidden="true" />
              {project.canReviewRevision
                ? "ส่งกลับแก้ไข"
                : project.canRequestRevision
                  ? "ขอแก้ไขหลังอนุมัติ"
                  : "ดูผลคำขอแก้ไข"}
            </button>
            {project.revision?.status === "pending" && (
              <p className="px-2 pb-2 text-[11px] leading-5 text-stone-600">
                รอผู้ดูแลระบบพิจารณาคำขอแก้ไข
              </p>
            )}
          </div>
        )}
        {project.editable ? (
          <Link
            href={`/projects/${project.uuid}/edit`}
            className="flex min-h-11 items-center gap-2 px-2 text-sm hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-[#ad3507]"
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
              แก้ไขได้เฉพาะข้อเสนอที่ยังไม่อยู่ระหว่างอนุมัติและอยู่ในสิทธิ์ของคุณ
            </p>
          </div>
        )}
        <button
          type="button"
          disabled={!project.deletable || !project.version}
          onClick={() => onDelete(project)}
          className="flex min-h-11 w-full items-center gap-2 px-2 text-left text-sm text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:text-stone-500 disabled:hover:bg-white"
        >
          <Trash2 size={15} aria-hidden="true" /> ลบ
        </button>
        <p className="px-2 pb-2 text-[11px] leading-5 text-stone-600">
          ผู้ดูแลระบบลบได้เฉพาะข้อเสนอที่ยังไม่อยู่ระหว่างอนุมัติและไม่มีรายการเบิกจ่ายหรือรายงานอ้างอิง
        </p>
      </div>
    </details>
  );
}
