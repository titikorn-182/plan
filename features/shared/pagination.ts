export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedData<T> = {
  items: T[];
  pagination: PaginationMeta;
};

export type SearchParamValue = string | string[] | undefined;

const MAX_PAGE_NUMBER = 10_000;

export function parsePage(value: SearchParamValue): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, MAX_PAGE_NUMBER) : 1;
}

export function getPaginationRange(page: number, pageSize: number): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}

export function createPagination(
  total: number | null,
  page: number,
  pageSize: number,
): PaginationMeta {
  const safeTotal = Math.max(0, total ?? 0);
  return {
    page,
    pageSize,
    total: safeTotal,
    totalPages: Math.max(1, Math.ceil(safeTotal / pageSize)),
  };
}
