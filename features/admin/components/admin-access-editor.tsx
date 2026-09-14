"use client";

import { useActionState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { updateUserAccessAction } from "@/features/admin/actions";
import type { AdminUser } from "@/features/admin/types";
import { APP_ROLE_LABELS, APP_ROLE_NAMES, APP_ROLES } from "@/lib/auth/types";
import type { OperationState } from "@/features/shared/action-state";
import type { OrganizationOption } from "@/features/shared/types";
import { FieldLabel, FormNotice, fieldClass } from "@/components/ui/operation-form";
import { StatusPill } from "@/components/ui/module-primitives";

export function AdminAccessEditor({
  user,
  organizations,
  viewerId,
}: {
  user: AdminUser;
  organizations: OrganizationOption[];
  viewerId: string;
}) {
  const [state, action, pending] = useActionState(
    updateUserAccessAction,
    {} satisfies OperationState,
  );

  return (
    <form action={action} className="space-y-4 p-5">
      <input type="hidden" name="profileId" value={user.id} />
      <div className="flex items-start justify-between gap-3">
        <span>
          <b className="block text-sm">แก้ไขสิทธิ์ผู้ใช้งาน</b>
          <small className="text-stone-500">{user.email}</small>
        </span>
        {user.id === viewerId ? <StatusPill tone="blue">บัญชีของคุณ</StatusPill> : null}
      </div>
      <label className="block">
        <FieldLabel required>ชื่อที่แสดง</FieldLabel>
        <input className={fieldClass} name="fullName" defaultValue={user.fullName} required />
      </label>
      <fieldset>
        <legend className="text-xs font-semibold text-stone-700">บทบาท</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {APP_ROLES.map((role) => (
            <label
              className="flex items-center gap-2 border border-stone-200 p-2 text-xs"
              key={role}
            >
              <input
                name="roles"
                type="checkbox"
                value={role}
                defaultChecked={user.roles.includes(role)}
              />
              {APP_ROLE_LABELS[role]} ({APP_ROLE_NAMES[role]})
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-xs font-semibold text-stone-700">ขอบเขตหน่วยงาน</legend>
        <div className="mt-2 max-h-48 space-y-1 overflow-y-auto border border-stone-200 p-2">
          {organizations.map((organization) => (
            <label
              className="flex items-start gap-2 p-1.5 text-xs hover:bg-orange-50"
              key={organization.id}
            >
              <input
                className="mt-0.5"
                name="organizationIds"
                type="checkbox"
                value={organization.id}
                defaultChecked={user.organizationIds.includes(organization.id)}
              />
              <span>
                {organization.code} · {organization.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center justify-between border border-stone-200 p-3 text-xs font-semibold">
        เปิดใช้งานบัญชี
        <input name="active" type="checkbox" defaultChecked={user.active} />
      </label>
      <FormNotice
        state={state}
        idle="สิทธิ์และสถานะบัญชีจะเปลี่ยนหลังบันทึก ตรวจสอบบทบาทและหน่วยงานให้ครบก่อนยืนยัน"
      />
      <button
        className="inline-flex w-full items-center justify-center gap-2 bg-[#cf430c] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        disabled={pending}
      >
        {pending ? <LoaderCircle className="animate-spin" size={16} /> : <Save size={16} />}
        บันทึกสิทธิ์
      </button>
    </form>
  );
}
