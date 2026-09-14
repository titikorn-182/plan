"use client";

import { useMemo, useState } from "react";
import { MailPlus, Search } from "lucide-react";
import { AdminAccessEditor } from "@/components/modules/admin/admin-access-editor";
import { AdminInvitePanel } from "@/components/modules/admin/admin-invite-panel";
import { AdminUserList } from "@/components/modules/admin/admin-user-list";
import type { AdminUsersData } from "@/features/admin/types";
import { APP_ROLE_LABELS, APP_ROLES } from "@/features/auth/types";
import type { OrganizationOption } from "@/features/shared/types";

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
  const [selectedId, setSelectedId] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const matchingUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("th");
    return data.users.filter(
      (user) =>
        (!roleFilter || user.roles.some((role) => role === roleFilter)) &&
        (!statusFilter || user.active === (statusFilter === "active")) &&
        [
          user.fullName,
          user.email,
          ...user.roles,
          ...user.roles.map((role) => APP_ROLE_LABELS[role]),
        ]
          .join(" ")
          .toLocaleLowerCase("th")
          .includes(normalized),
    );
  }, [data.users, query, roleFilter, statusFilter]);
  const selected = data.users.find((user) => user.id === selectedId);

  function clearFilters() {
    setQuery("");
    setRoleFilter("");
    setStatusFilter("");
  }

  function focusEditor() {
    requestAnimationFrame(() => document.getElementById("admin-user-editor")?.focus());
  }

  return (
    <div className="space-y-5">
      <div className="admin-users-heading">
        <div>
          <h2 className="text-xl font-bold">ผู้ใช้งานและสิทธิ์</h2>
          <p className="mt-1 text-sm text-stone-600">
            ค้นหาบัญชี แล้วเลือกชื่อเพื่อแก้ไขบทบาท หน่วยงาน หรือสถานะการใช้งาน
          </p>
        </div>
        <button
          type="button"
          className="admin-action-button"
          aria-expanded={showInvite}
          aria-controls="admin-user-editor"
          onClick={() => {
            setSelectedId("");
            setShowInvite(true);
            focusEditor();
          }}
        >
          <MailPlus size={17} /> เชิญผู้ใช้ใหม่
        </button>
      </div>
      <div className="admin-user-filters">
        <label>
          <span>ค้นหาผู้ใช้ในหน้านี้</span>
          <div className="admin-user-search">
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ชื่อ อีเมล หรือบทบาท"
            />
          </div>
        </label>
        <label>
          <span>บทบาท</span>
          <select
            aria-label="กรองตามบทบาท"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="">ทุกบทบาท</option>
            {APP_ROLES.map((role) => (
              <option key={role} value={role}>
                {APP_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>สถานะบัญชี</span>
          <select
            aria-label="สถานะบัญชี"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">ทุกสถานะ</option>
            <option value="active">เปิดใช้งาน</option>
            <option value="inactive">ระงับการใช้งาน</option>
          </select>
        </label>
        <button
          type="button"
          className="admin-secondary-button"
          onClick={clearFilters}
          disabled={!query && !roleFilter && !statusFilter}
        >
          ล้างตัวกรอง
        </button>
      </div>
      <p className="text-xs text-stone-600" role="status">
        แสดง {matchingUsers.length} จาก {data.users.length} บัญชีในหน้านี้ ·
        ตัวกรองใช้กับรายชื่อในหน้าปัจจุบัน
      </p>
      <div
        className={`grid items-start gap-5 ${selected || showInvite ? "2xl:grid-cols-[minmax(0,1fr)_360px]" : ""}`}
      >
        <AdminUserList
          users={matchingUsers}
          totalUsersOnPage={data.users.length}
          pagination={data.pagination}
          selectedId={selected?.id}
          onClearFilters={clearFilters}
          onSelect={(userId) => {
            setSelectedId(userId);
            setShowInvite(false);
            focusEditor();
          }}
        />
        {selected || showInvite ? (
          <aside
            id="admin-user-editor"
            tabIndex={-1}
            aria-label={showInvite ? "เชิญผู้ใช้ใหม่" : "แก้ไขสิทธิ์ผู้ใช้"}
            className="admin-user-editor space-y-3"
          >
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => {
                setSelectedId("");
                setShowInvite(false);
              }}
            >
              ปิดแผงและกลับไปรายชื่อ
            </button>
            {selected ? (
              <section className="border border-stone-200 bg-white" key={selected.id}>
                <AdminAccessEditor
                  user={selected}
                  organizations={organizations}
                  viewerId={viewerId}
                />
              </section>
            ) : null}
            {showInvite ? <AdminInvitePanel /> : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
