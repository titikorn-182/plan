"use client";

import { useActionState } from "react";
import { updatePasswordAction, type UpdatePasswordState } from "@/app/update-password/actions";

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, {} as UpdatePasswordState);
  return <form action={action} className="mt-7 space-y-4"><label className="block" htmlFor="new-password"><span className="text-xs font-semibold">รหัสผ่านใหม่</span><input className="mt-2 h-12 w-full border border-stone-300 px-3 text-sm outline-none focus:border-[#d8470c] focus:ring-2 focus:ring-orange-100" id="new-password" name="password" type="password" autoComplete="new-password" required /></label><label className="block" htmlFor="confirm-password"><span className="text-xs font-semibold">ยืนยันรหัสผ่านใหม่</span><input className="mt-2 h-12 w-full border border-stone-300 px-3 text-sm outline-none focus:border-[#d8470c] focus:ring-2 focus:ring-orange-100" id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required /></label>{state.error ? <p className="border border-red-200 bg-red-50 p-3 text-xs text-red-800" role="alert">{state.error}</p> : null}<button className="h-12 w-full bg-[#cf430c] text-sm font-bold text-white disabled:opacity-60" disabled={pending} type="submit">{pending ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}</button></form>;
}
