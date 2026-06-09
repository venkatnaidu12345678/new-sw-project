import { useEffect, useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 8;

/**
 * Client-side pagination for admin tables.
 * Resets to page 1 when `resetDeps` values change (e.g. search/filter).
 */
export function usePagination(items, { pageSize = DEFAULT_PAGE_SIZE, resetDeps = [] } = {}) {
  const [page, setPage] = useState(1);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setPage(1);
  }, [totalItems, pageSize, ...resetDeps]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
  };
}
