import Link from "next/link";
import type { PaginationMeta } from "@/features/shared/pagination";
import { formatThaiInteger } from "@/features/shared/formatters";

type PaginationNavProps = {
  basePath: string;
  pagination: PaginationMeta;
  query?: Readonly<Record<string, string | undefined>>;
};

function pageHref(
  basePath: string,
  page: number,
  query: Readonly<Record<string, string | undefined>>,
) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export function PaginationNav({ basePath, pagination, query = {} }: PaginationNavProps) {
  if (pagination.totalPages <= 1) {
    return (
      <p className="border-t border-stone-200 px-4 py-3 text-xs text-stone-500">
        ทั้งหมด {formatThaiInteger(pagination.total)} รายการ
      </p>
    );
  }

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3 text-xs"
      aria-label="การแบ่งหน้า"
    >
      <span className="text-stone-500">
        หน้า {formatThaiInteger(pagination.page)} จาก {formatThaiInteger(pagination.totalPages)} ·
        ทั้งหมด {formatThaiInteger(pagination.total)} รายการ
      </span>
      <div className="flex gap-1">
        {pagination.page > 1 ? (
          <Link
            className="border border-stone-300 px-3 py-1.5 hover:border-orange-500 hover:text-[#b53807]"
            href={pageHref(basePath, pagination.page - 1, query)}
          >
            ก่อนหน้า
          </Link>
        ) : (
          <span className="border border-stone-200 px-3 py-1.5 text-stone-300">ก่อนหน้า</span>
        )}
        <span className="bg-[#cf430c] px-3 py-1.5 font-semibold text-white" aria-current="page">
          {formatThaiInteger(pagination.page)}
        </span>
        {pagination.page < pagination.totalPages ? (
          <Link
            className="border border-stone-300 px-3 py-1.5 hover:border-orange-500 hover:text-[#b53807]"
            href={pageHref(basePath, pagination.page + 1, query)}
          >
            ถัดไป
          </Link>
        ) : (
          <span className="border border-stone-200 px-3 py-1.5 text-stone-300">ถัดไป</span>
        )}
      </div>
    </nav>
  );
}
