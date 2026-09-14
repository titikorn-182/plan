"use client";

import { useActionState } from "react";
import { LoaderCircle, MailPlus } from "lucide-react";
import { inviteUserAction } from "@/features/admin/actions";
import type { OperationState } from "@/features/shared/action-state";
import { FieldLabel, FormNotice, fieldClass } from "@/components/ui/operation-form";
import { APP_ROLE_LABELS, APP_ROLE_NAMES, APP_ROLES } from "@/lib/auth/types";

export function AdminInvitePanel() {
  const [state, action, pending] = useActionState(inviteUserAction, {} satisfies OperationState);

  return (
    <section className="border border-stone-200 bg-white">
      <header className="flex items-center gap-2 border-b border-stone-200 bg-[#fff4eb] px-4 py-3">
        <MailPlus size={17} className="text-[#c9440b]" />
        <h2 className="text-sm font-bold">เชิญผู้ใช้ใหม่</h2>
      </header>
      <form action={action} className="space-y-3 p-4">
        <label className="block">
          <FieldLabel required>ชื่อ–นามสกุล</FieldLabel>
          <input className={fieldClass} name="fullName" required />
        </label>
        <label className="block">
          <FieldLabel required>อีเมล</FieldLabel>
          <input className={fieldClass} name="email" type="email" required />
        </label>
        <label className="block">
          <FieldLabel required>บทบาทเริ่มต้น</FieldLabel>
          <select className={fieldClass} name="role" defaultValue="staff">
            {APP_ROLES.map((role) => (
              <option key={role} value={role}>
                {APP_ROLE_LABELS[role]} ({APP_ROLE_NAMES[role]})
              </option>
            ))}
          </select>
        </label>
        <FormNotice
          state={state}
          idle="ระบบจะส่งคำเชิญไปยังอีเมลที่ระบุ ตรวจสอบอีเมลและบทบาทก่อนส่ง"
        />
        <button
          className="inline-flex w-full items-center justify-center gap-2 bg-[#cf430c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          disabled={pending}
        >
          {pending ? <LoaderCircle className="animate-spin" size={16} /> : <MailPlus size={16} />}
          ส่งคำเชิญ
        </button>
      </form>
    </section>
  );
}
