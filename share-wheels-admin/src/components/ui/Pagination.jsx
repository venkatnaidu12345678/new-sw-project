import { btnClass } from "./primitives";
import { IconChevronLeft, IconChevronRight } from "./icons";

export default function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = "",
}) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const go = (next) => {
    if (next < 1 || next > totalPages) return;
    onPageChange(next);
  };

  const pageNumbers = [];
  const windowSize = 5;
  let from = Math.max(1, page - Math.floor(windowSize / 2));
  let to = Math.min(totalPages, from + windowSize - 1);
  from = Math.max(1, to - windowSize + 1);
  for (let i = from; i <= to; i += 1) pageNumbers.push(i);

  return (
    <div
      className={`flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm ${className}`}
    >
      <p className="text-xs font-medium text-slate-500">
        Showing <span className="font-semibold text-slate-700">{start}–{end}</span> of{" "}
        <span className="font-semibold text-slate-700">{totalItems}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btnClass("ghost", "sm")}
          disabled={!canPrev}
          onClick={() => go(page - 1)}
          aria-label="Previous page"
        >
          <IconChevronLeft className="h-4 w-4" />
        </button>

        {pageNumbers.map((n) => (
          <button
            key={n}
            type="button"
            className={
              n === page
                ? `${btnClass("primary", "sm")} min-w-[2rem] px-2`
                : `${btnClass("ghost", "sm")} min-w-[2rem] px-2`
            }
            onClick={() => go(n)}
            aria-current={n === page ? "page" : undefined}
          >
            {n}
          </button>
        ))}

        <button
          type="button"
          className={btnClass("ghost", "sm")}
          disabled={!canNext}
          onClick={() => go(page + 1)}
          aria-label="Next page"
        >
          <IconChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
