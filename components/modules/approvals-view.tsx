"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { actOnApprovalAction } from "@/features/approvals/actions";
import type { OperationState } from "@/features/shared/action-state";
import { RegisterSection, StatusPill } from "@/components/ui/module-primitives";
import {
  APPROVAL_ROLE_LABELS,
  WORKFLOW_STATUS_LABELS,
  type WorkflowTask,
} from "@/features/approvals/types";

const typeLabel: Record<string, string> = {
  budget_request: "คำของบ",
  project: "โครงการ",
  quarterly_report: "รายงานไตรมาส",
  kpi_result: "ผล KPI",
};
const roleLabel = APPROVAL_ROLE_LABELS;
const statusLabel = WORKFLOW_STATUS_LABELS;

function entityHref(task: WorkflowTask) {
  if (task.entityType === "project") return `/projects/${task.entityId}/edit`;
  if (task.entityType === "quarterly_report") return `/reports/quarterly/${task.entityId}/edit`;
  if (task.entityType === "kpi_result") return `/kpi/${task.entityId}/edit`;
  return "/budget-requests";
}

function DecisionForm({ task }: { task: WorkflowTask }) {
  const [state, action, pending] = useActionState(actOnApprovalAction, {} satisfies OperationState);
  return (
    <form action={action} className="mt-3 border-t border-stone-200 pt-3">
      <input type="hidden" name="taskId" value={task.id} />
      <label className="block text-[11px] font-semibold text-stone-600">
        ความเห็นประกอบ
        <textarea
          className="mt-1.5 min-h-20 w-full border border-stone-300 px-3 py-2 text-xs font-normal outline-none focus:border-orange-500"
          name="comment"
          maxLength={1000}
          placeholder="จำเป็นเมื่อส่งกลับหรือไม่อนุมัติ"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span
          className={`text-[10px] ${state.success ? "text-emerald-700" : "text-red-700"}`}
          role="status"
          aria-live="polite"
        >
          {state.message}
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-1 border border-stone-300 px-2 py-1.5 text-[11px] font-semibold hover:border-orange-400 disabled:opacity-50"
            name="decision"
            value="revision_required"
            disabled={pending}
          >
            <RotateCcw size={13} />
            ส่งกลับ
          </button>
          <button
            className="inline-flex items-center gap-1 border border-red-300 px-2 py-1.5 text-[11px] font-semibold text-red-700 disabled:opacity-50"
            name="decision"
            value="rejected"
            disabled={pending}
          >
            <XCircle size={13} />
            ไม่อนุมัติ
          </button>
          <button
            className="inline-flex items-center gap-1 bg-emerald-700 px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
            name="decision"
            value="approved"
            disabled={pending}
          >
            {pending ? (
              <LoaderCircle className="animate-spin" size={13} />
            ) : (
              <CheckCircle2 size={13} />
            )}
            อนุมัติ
          </button>
        </div>
      </div>
    </form>
  );
}

export function ApprovalsView({ tasks }: { tasks: WorkflowTask[] }) {
  const [filter, setFilter] = useState<"pending" | "history">("pending");
  const visible = useMemo(
    () =>
      tasks.filter((task) =>
        filter === "pending" ? task.status === "pending" : task.status !== "pending",
      ),
    [filter, tasks],
  );
  const actionable = tasks.filter((task) => task.canAct).length;
  const overdue = tasks.filter((task) => task.overdue).length;
  return (
    <div className="space-y-5">
      <section className="grid border border-stone-200 bg-white sm:grid-cols-3">
        <article className="flex items-center gap-4 border-b border-stone-200 p-5 sm:border-r sm:border-b-0">
          <ShieldCheck className="text-[#c9440b]" />
          <span>
            <b className="block text-2xl">{actionable}</b>
            <small className="text-stone-500">งานที่คุณตัดสินใจได้</small>
          </span>
        </article>
        <article className="flex items-center gap-4 border-b border-stone-200 p-5 sm:border-r sm:border-b-0">
          <Clock3 className="text-orange-700" />
          <span>
            <b className="block text-2xl">
              {tasks.filter((task) => task.status === "pending").length}
            </b>
            <small className="text-stone-500">รอใน workflow</small>
          </span>
        </article>
        <article className="flex items-center gap-4 p-5">
          <XCircle className="text-red-700" />
          <span>
            <b className="block text-2xl">{overdue}</b>
            <small className="text-stone-500">เกิน SLA</small>
          </span>
        </article>
      </section>
      <RegisterSection
        title="กล่องงานอนุมัติ"
        aside={
          <div className="flex border border-stone-300">
            {(["pending", "history"] as const).map((item) => (
              <button
                className={`px-3 py-2 text-xs font-semibold ${filter === item ? "bg-[#cf430c] text-white" : "bg-white"}`}
                key={item}
                onClick={() => setFilter(item)}
              >
                {item === "pending" ? "งานค้าง" : "ประวัติ"}
              </button>
            ))}
          </div>
        }
      >
        <div className="grid gap-px bg-stone-200 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((task) => (
            <article className="bg-white p-4" key={task.id}>
              <div className="flex items-start justify-between gap-3">
                <span>
                  <small className="font-bold text-[#b53807]">
                    {typeLabel[task.entityType] ?? task.entityType}
                  </small>
                  <b className="mt-1 block text-sm">{task.businessId}</b>
                </span>
                <StatusPill
                  tone={
                    task.status === "approved"
                      ? "green"
                      : task.status === "pending"
                        ? "orange"
                        : task.status === "cancelled"
                          ? "gray"
                          : "red"
                  }
                >
                  {statusLabel[task.status] ?? task.status}
                </StatusPill>
              </div>
              <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-bold leading-5">
                {task.title}
              </h3>
              <p className="mt-2 text-xs text-stone-500">{task.unit}</p>
              <dl className="mt-3 grid grid-cols-2 gap-2 border-y border-stone-200 py-3 text-[11px]">
                <div>
                  <dt className="text-stone-500">ขั้นอนุมัติ</dt>
                  <dd className="mt-1 font-semibold">
                    {roleLabel[task.requiredRole] ?? task.requiredRole}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">ครบกำหนด</dt>
                  <dd className="mt-1 font-semibold">{task.dueAt}</dd>
                </div>
              </dl>
              <Link
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-sky-800 hover:underline"
                href={entityHref(task)}
              >
                เปิดข้อมูลประกอบ <ArrowUpRight size={14} />
              </Link>
              {task.canAct ? (
                <DecisionForm task={task} />
              ) : task.status === "pending" ? (
                <p className="mt-3 border-t border-stone-200 pt-3 text-[11px] text-stone-500">
                  รายการนี้แสดงเพื่อการติดตาม ผู้รับมอบหมายเป็นผู้ตัดสินใจ
                </p>
              ) : null}
            </article>
          ))}
          {visible.length === 0 ? (
            <p className="bg-white p-10 text-center text-sm text-stone-500 md:col-span-2 xl:col-span-3">
              ไม่มีรายการในมุมมองนี้
            </p>
          ) : null}
        </div>
      </RegisterSection>
    </div>
  );
}
