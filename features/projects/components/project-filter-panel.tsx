import Link from "next/link";
import { Search, X } from "lucide-react";
import type { ProjectFilters } from "@/features/projects/filters";
import type { OrganizationOption } from "@/features/shared/types";
import { INPUT_LIMITS } from "@/lib/config/limits";

export function ProjectFilterPanel({
  filters,
  organizations,
}: {
  filters: ProjectFilters;
  organizations: OrganizationOption[];
}) {
  return (
    <form
      className="border border-orange-200 bg-[#fffaf6] p-4"
      id="project-advanced-filters"
      method="get"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-stone-700">ค้นหาโครงการ</span>
          <span className="flex items-center border border-stone-300 bg-white px-3 focus-within:border-orange-500">
            <Search size={15} className="text-stone-400" aria-hidden="true" />
            <input
              className="min-h-10 w-full border-0 bg-transparent px-2 text-sm outline-none"
              defaultValue={filters.search}
              maxLength={INPUT_LIMITS.searchText}
              name="search"
              placeholder="รหัส ชื่อโครงการ หรือเจ้าของ"
            />
          </span>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-stone-700">หน่วยงาน</span>
          <select
            className="min-h-10 w-full border border-stone-300 bg-white px-3 text-sm"
            defaultValue={filters.organizationId}
            name="organizationId"
          >
            <option value="">ทุกหน่วยงาน</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-stone-700">สุขภาพโครงการ</span>
          <select
            className="min-h-10 w-full border border-stone-300 bg-white px-3 text-sm"
            defaultValue={filters.health}
            name="health"
          >
            <option value="">ทุกสถานะติดตาม</option>
            <option value="normal">ปกติ</option>
            <option value="watch">เฝ้าระวัง</option>
            <option value="at_risk">เสี่ยงสูง</option>
            <option value="delayed">ล่าช้า</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-semibold text-stone-700">สถานะโครงการ</span>
          <select
            className="min-h-10 w-full border border-stone-300 bg-white px-3 text-sm"
            defaultValue={filters.status}
            name="status"
          >
            <option value="">ทุกสถานะ</option>
            <option value="proposed">ข้อเสนอ</option>
            <option value="active">กำลังดำเนินงาน</option>
            <option value="on_hold">พักโครงการ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
        </label>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-xs font-semibold text-stone-700">งบอนุมัติ (บาท)</legend>
          <input
            aria-label="งบอนุมัติต่ำสุด"
            className="min-h-10 min-w-0 border border-stone-300 bg-white px-3 text-sm"
            defaultValue={filters.minBudget ?? ""}
            min="0"
            name="minBudget"
            placeholder="ต่ำสุด"
            type="number"
          />
          <input
            aria-label="งบอนุมัติสูงสุด"
            className="min-h-10 min-w-0 border border-stone-300 bg-white px-3 text-sm"
            defaultValue={filters.maxBudget ?? ""}
            min="0"
            name="maxBudget"
            placeholder="สูงสุด"
            type="number"
          />
        </fieldset>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 text-xs font-semibold text-stone-700">ความก้าวหน้า (%)</legend>
          <input
            aria-label="ความก้าวหน้าต่ำสุด"
            className="min-h-10 min-w-0 border border-stone-300 bg-white px-3 text-sm"
            defaultValue={filters.minProgress ?? ""}
            max="100"
            min="0"
            name="minProgress"
            placeholder="ต่ำสุด"
            type="number"
          />
          <input
            aria-label="ความก้าวหน้าสูงสุด"
            className="min-h-10 min-w-0 border border-stone-300 bg-white px-3 text-sm"
            defaultValue={filters.maxProgress ?? ""}
            max="100"
            min="0"
            name="maxProgress"
            placeholder="สูงสุด"
            type="number"
          />
        </fieldset>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-orange-200 pt-4">
        <Link
          className="inline-flex min-h-10 items-center gap-2 border border-stone-300 bg-white px-4 text-xs font-semibold"
          href="/projects"
        >
          <X size={14} /> ล้างตัวกรอง
        </Link>
        <button
          className="min-h-10 bg-[#cf430c] px-5 text-xs font-semibold text-white hover:bg-[#ad3507]"
          type="submit"
        >
          ใช้ตัวกรอง
        </button>
      </div>
    </form>
  );
}
