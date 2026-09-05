import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Save, Send } from "lucide-react";
import type { OperationState } from "@/features/shared/action-state";

export const fieldClass = "mt-1.5 h-11 w-full border border-stone-300 bg-white px-3 text-sm outline-none transition-colors focus:border-[#d8470c] focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-100";
export const areaClass = "mt-1.5 min-h-28 w-full resize-y border border-stone-300 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#d8470c] focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-stone-100";

export function FieldLabel({ children, required = false }: { children: ReactNode; required?: boolean }) {
  return <span className="text-xs font-semibold text-stone-700">{children}{required ? <span className="ml-1 text-red-600">*</span> : null}</span>;
}

export function FieldError({ errors, id }: { errors?: string[]; id?: string }) {
  if (!errors?.length) return null;
  return <span className="mt-1 block text-xs text-red-700" id={id}>{errors.join(" · ")}</span>;
}

export function FormNotice({ state, idle }: { state: OperationState; idle: string }) {
  return <p className={`border px-4 py-3 text-xs ${state.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : state.message ? "border-red-200 bg-red-50 text-red-800" : "border-stone-200 bg-stone-50 text-stone-600"}`} role="status" aria-live="polite">{state.message ?? idle}</p>;
}

export function FormTopbar({ backHref, backLabel, state }: { backHref: string; backLabel: string; state: OperationState }) {
  return <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600 hover:text-[#c9440b]" href={backHref}><ArrowLeft size={17} /> {backLabel}</Link>{state.id ? <span className="border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-bold text-orange-800">บันทึกแล้ว</span> : <span className="text-xs text-stone-500">ช่องที่มี * จำเป็นต้องกรอก</span>}</div>;
}

export function FormActions({ pending, saveLabel = "บันทึกฉบับร่าง", submitLabel = "ส่งอนุมัติ", backHref }: { pending: boolean; saveLabel?: string; submitLabel?: string; backHref: string }) {
  return (
    <div className="form-action-bar fixed right-0 bottom-0 left-[206px] z-40 flex min-h-16 flex-wrap items-center justify-between gap-3 border-t border-stone-300 bg-white px-4 py-3 shadow-[0_-4px_14px_rgba(28,25,23,0.08)] max-[960px]:left-[72px] max-[700px]:left-0 lg:px-8">
      <Link className="form-action-back inline-flex items-center gap-2 border border-stone-300 px-4 py-2 text-sm font-semibold hover:border-orange-400" href={backHref}><ArrowLeft size={16} /><span>ยกเลิก</span></Link>
      <div className="form-action-group flex flex-wrap items-center gap-2">
        <button className="inline-flex min-h-10 items-center gap-2 border border-stone-300 px-4 py-2 text-sm font-semibold hover:border-[#d8470c] disabled:cursor-wait disabled:opacity-60" type="submit" name="intent" value="save" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}{saveLabel}</button>
        <button className="inline-flex min-h-10 items-center gap-2 bg-[#cf430c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#ad3507] disabled:cursor-wait disabled:opacity-60" type="submit" name="intent" value="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}{submitLabel}</button>
      </div>
    </div>
  );
}
