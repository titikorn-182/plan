"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, LoaderCircle, MailPlus, Save, Search } from "lucide-react";
import { inviteUserAction, updateUserAccessAction } from "@/features/admin/actions";
import type { OperationState } from "@/features/shared/action-state";
import { FieldLabel, FormNotice, fieldClass } from "@/components/ui/operation-form";
import { RegisterSection, StatusPill } from "@/components/ui/module-primitives";
import { PaginationNav } from "@/components/ui/pagination-nav";
import type { AdminUsersData, AdminUser } from "@/features/admin/types";
import { APP_ROLE_NAMES, APP_ROLES } from "@/features/auth/types";
import type { OrganizationOption } from "@/features/shared/types";

const permissionRows = [
  ["Dashboard ส่วนบุคคล", true, true, true, true],
  ["คำของบประมาณ", true, true, false, "own"],
  ["ข้อเสนอโครงการ", true, true, false, "own"],
  ["อนุมัติ/ส่งกลับ", true, false, true, false],
  ["รายงานผลรายไตรมาส", true, true, true, "own"],
  ["ข้อมูลเบิกจ่าย", true, true, true, "own"],
  ["KPI EdPEx & AUN-QA", true, true, true, "own"],
  ["ผู้ใช้และข้อมูลหลัก", true, false, false, false],
] as const;
const roleLabel = APP_ROLE_NAMES;

function PermissionMark({ value }: { value: boolean | "own" }) {
  if (value === "own")
    return <span className="text-[10px] font-semibold text-orange-700">เฉพาะตนเอง</span>;
  return value ? (
    <Check className="mx-auto text-emerald-700" size={16} />
  ) : (
    <span className="text-stone-300">—</span>
  );
}

function InvitePanel() {
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
            <option value="staff">Staff</option>
            <option value="user">User</option>
            <option value="executive">Executive</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <FormNotice state={state} idle="ต้องตั้งค่า service role key เฉพาะฝั่งเซิร์ฟเวอร์" />
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

function AccessEditor({
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
          {APP_ROLES.map((value) => (
            <label
              className="flex items-center gap-2 border border-stone-200 p-2 text-xs"
              key={value}
            >
              <input
                name="roles"
                type="checkbox"
                value={value}
                defaultChecked={user.roles.includes(value)}
              />
              {roleLabel[value]}
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
      <FormNotice state={state} idle="การแก้ไขมีผลกับ RLS หลังบันทึกทันที" />
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

export function AdminView({
  data,
  organizations,
  viewerId,
}: {
  data: AdminUsersData;
  organizations: OrganizationOption[];
  viewerId: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(data.users[0]?.id ?? "");
  const matchingUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th");
    return data.users.filter((user) =>
      [user.fullName, user.email, ...user.roles]
        .join(" ")
        .toLocaleLowerCase("th")
        .includes(normalized),
    );
  }, [data.users, query]);
  const selected = data.users.find((user) => user.id === selectedId) ?? data.users[0];
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <RegisterSection
            title="ผู้ใช้งานและสิทธิ์"
            aside={
              <label className="flex h-9 items-center gap-2 border border-stone-300 px-3 focus-within:border-orange-500">
                <Search size={15} />
                <input
                  className="w-44 text-xs outline-none"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ค้นหาในหน้านี้"
                />
              </label>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="px-4 py-3">ผู้ใช้งาน</th>
                    <th className="px-3 py-3">บทบาท</th>
                    <th className="px-3 py-3">หน่วยงานในสิทธิ์</th>
                    <th className="px-3 py-3">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {matchingUsers.map((user) => (
                    <tr
                      className={`border-t border-stone-200 hover:bg-orange-50 ${selected?.id === user.id ? "bg-[#fff4eb] shadow-[inset_3px_0_0_#df4a0c]" : ""}`}
                      key={user.id}
                    >
                      <td className="p-0">
                        <button
                          className="w-full px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"
                          type="button"
                          onClick={() => setSelectedId(user.id)}
                          aria-pressed={selected?.id === user.id}
                        >
                          <b className="block text-sm">{user.fullName}</b>
                          <small className="text-stone-500">{user.email}</small>
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        {user.roles.map((role) => roleLabel[role] ?? role).join(", ") || "—"}
                      </td>
                      <td className="px-3 py-3">{user.organizationIds.length} แห่ง</td>
                      <td className="px-3 py-3">
                        <StatusPill tone={user.active ? "green" : "gray"}>
                          {user.active ? "ใช้งาน" : "ระงับ"}
                        </StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationNav basePath="/admin" pagination={data.pagination} />
          </RegisterSection>
          <RegisterSection
            title="สิทธิ์มาตรฐานตามบทบาท"
            aside={<StatusPill tone="green">RLS เปิดใช้งาน</StatusPill>}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="px-4 py-3">โมดูล</th>
                    <th className="px-3 py-3 text-center">Admin</th>
                    <th className="px-3 py-3 text-center">User</th>
                    <th className="px-3 py-3 text-center">Executive</th>
                    <th className="px-3 py-3 text-center">Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionRows.map(([label, ...values]) => (
                    <tr className="border-t border-stone-200" key={label}>
                      <th className="px-4 py-3">{label}</th>
                      {values.map((value, index) => (
                        <td className="px-3 py-3 text-center" key={index}>
                          <PermissionMark value={value} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </RegisterSection>
        </div>
        <aside className="space-y-5">
          {selected ? (
            <section className="border border-stone-200 bg-white" key={selected.id}>
              <AccessEditor user={selected} organizations={organizations} viewerId={viewerId} />
            </section>
          ) : null}
          <InvitePanel />
        </aside>
      </div>
    </div>
  );
}
