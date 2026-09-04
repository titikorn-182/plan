"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type ResetState } from "@/app/forgot-password/actions";

export function ResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, {} as ResetState);
  return (
    <form action={action} className="mt-7 space-y-4">
      <label className="block" htmlFor="reset-email"><span className="text-xs font-semibold">อีเมลสถาบัน</span><input className="mt-2 h-12 w-full border border-stone-300 px-3 text-sm outline-none focus:border-[#d8470c] focus:ring-2 focus:ring-orange-100" id="reset-email" name="email" type="email" autoComplete="email" required /></label>
      {state.error ? <p className="border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert">{state.error}</p> : null}
      {state.message ? <p className="border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800" role="status">{state.message}</p> : null}
      <button className="h-12 w-full bg-[#cf430c] text-sm font-bold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "กำลังส่ง..." : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}</button>
      <Link className="block text-center text-xs font-semibold text-[#b53807]" href="/login">กลับหน้าเข้าสู่ระบบ</Link>
    </form>
  );
}
