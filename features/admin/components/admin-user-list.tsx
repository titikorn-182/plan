"use client";

import { Check } from "lucide-react";
import { PaginationNav } from "@/components/ui/pagination-nav";
import { RegisterSection, StatusPill } from "@/components/ui/module-primitives";
import type { AdminUser, AdminUsersData } from "@/features/admin/types";
import { APP_ROLE_LABELS } from "@/features/auth/types";

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

function PermissionMark({ value }: { value: boolean | "own" }) {
  if (value === "own") {
    return <span className="text-[10px] font-semibold text-orange-700">เฉพาะตนเอง</span>;
  }
  return value ? (
    <Check className="mx-auto text-emerald-700" size={16} />
  ) : (
    <span className="text-stone-300">—</span>
  );
}

export function AdminUserList({
  users,
  totalUsersOnPage,
  pagination,
  selectedId,
  onSelect,
  onClearFilters,
}: {
  users: AdminUser[];
  totalUsersOnPage: number;
  pagination: AdminUsersData["pagination"];
  selectedId?: string;
  onSelect: (userId: string) => void;
  onClearFilters: () => void;
}) {
  return (
    <div className="space-y-5">
      <RegisterSection title="รายชื่อผู้ใช้งาน">
        <div className="overflow-x-auto">
          <table className="admin-users-table w-full text-left text-sm">
            <caption className="sr-only">รายชื่อผู้ใช้ เลือกชื่อเพื่อแก้ไขสิทธิ์</caption>
            <thead className="bg-stone-50 text-stone-600">
              <tr>
                <th className="px-4 py-3">ผู้ใช้งาน</th>
                <th className="px-3 py-3">บทบาท</th>
                <th className="px-3 py-3">หน่วยงานในสิทธิ์</th>
                <th className="px-3 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  className={`border-t border-stone-200 hover:bg-orange-50 ${selectedId === user.id ? "bg-[#fff4eb] shadow-[inset_3px_0_0_#df4a0c]" : ""}`}
                  key={user.id}
                >
                  <td className="p-0">
                    <button
                      className="w-full px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-500"
                      type="button"
                      onClick={() => onSelect(user.id)}
                      aria-controls="admin-user-editor"
                      aria-pressed={selectedId === user.id}
                    >
                      <b className="block text-sm">{user.fullName}</b>
                      <small className="break-all text-stone-600">{user.email}</small>
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    {user.roles.map((role) => APP_ROLE_LABELS[role]).join(", ") ||
                      "ยังไม่กำหนดบทบาท"}
                  </td>
                  <td className="px-3 py-3">{user.organizationIds.length} แห่ง</td>
                  <td className="px-3 py-3">
                    <StatusPill tone={user.active ? "green" : "gray"}>
                      {user.active ? "ใช้งาน" : "ระงับ"}
                    </StatusPill>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center">
                    <p className="font-semibold">
                      {totalUsersOnPage
                        ? "ไม่พบผู้ใช้ที่ตรงกับตัวกรอง"
                        : "ยังไม่มีรายชื่อผู้ใช้ในหน้านี้"}
                    </p>
                    <p className="mt-2 text-stone-600">
                      {totalUsersOnPage
                        ? "ลองค้นหาด้วยคำอื่น หรือล้างตัวกรองเพื่อแสดงรายชื่อทั้งหมดในหน้านี้"
                        : "ใช้ปุ่มเชิญผู้ใช้ใหม่เพื่อเพิ่มบัญชี"}
                    </p>
                    {totalUsersOnPage > 0 ? (
                      <button
                        type="button"
                        className="admin-secondary-button mt-4"
                        onClick={onClearFilters}
                      >
                        ล้างตัวกรอง
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <PaginationNav basePath="/admin" pagination={pagination} query={{ section: "users" }} />
      </RegisterSection>
      <details className="border border-stone-200">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-stone-700">
          ดูคำอธิบายสิทธิ์มาตรฐานตามบทบาท
        </summary>
        <RegisterSection
          title="สิทธิ์มาตรฐานตามบทบาท"
          aside={
            <span className="text-xs text-stone-600">
              ขอบเขตข้อมูลขึ้นอยู่กับสิทธิ์ของแต่ละบัญชี
            </span>
          }
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
      </details>
    </div>
  );
}
