import { Search } from "lucide-react";
import { COMMAND_CENTER_STATUS_FILTERS } from "@/features/dashboard/presentation";
import type { CommandCenterStatus } from "@/features/dashboard/types";

export function CommandCenterFilters({
  onQueryChange,
  onStatusChange,
  query,
  status,
}: {
  onQueryChange: (value: string) => void;
  onStatusChange: (value: "all" | CommandCenterStatus) => void;
  query: string;
  status: "all" | CommandCenterStatus;
}) {
  return (
    <section className="cc-filter-panel" aria-label="ตัวกรองข้อมูล">
      <label>
        <Search size={16} />
        <span className="sr-only">ค้นหาหน่วยงาน</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="ค้นหารหัสหรือชื่อหน่วยงาน"
        />
      </label>
      <div role="group" aria-label="กรองตามสถานะ">
        {COMMAND_CENTER_STATUS_FILTERS.map((filter) => (
          <button
            type="button"
            className={status === filter.value ? "active" : ""}
            key={filter.value}
            onClick={() => onStatusChange(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </section>
  );
}
