import { ListFilter } from "lucide-react";
import { hasProjectFilters, type ProjectFilters } from "@/features/projects/filters";

export function ProjectFilterToggle({
  expanded,
  filters,
  onToggle,
}: {
  expanded: boolean;
  filters: ProjectFilters;
  onToggle: () => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-2 text-xs font-semibold text-[#b53807]"
      type="button"
      aria-expanded={expanded}
      aria-controls="project-advanced-filters"
      onClick={onToggle}
    >
      <ListFilter size={15} /> ตัวกรองขั้นสูง
      {hasProjectFilters(filters) ? (
        <span className="grid size-5 place-items-center bg-[#cf430c] text-[10px] text-white">
          ●
        </span>
      ) : null}
    </button>
  );
}
