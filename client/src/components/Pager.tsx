"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PageItem = number | "gap";

// 0-based page indexes to show: first, last, and a window around the current page.
// A gap that would hide a single page shows that page instead of "…".
const pageItems = (current: number, count: number): PageItem[] => {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);

  const keep = new Set([0, count - 1, current - 1, current, current + 1]);
  if (current <= 2) [1, 2, 3].forEach((p) => keep.add(p));
  if (current >= count - 3)
    [count - 4, count - 3, count - 2].forEach((p) => keep.add(p));

  const pages = [...keep]
    .filter((p) => p >= 0 && p < count)
    .sort((a, b) => a - b);
  const items: PageItem[] = [];
  pages.forEach((p, i) => {
    const prev = pages[i - 1];
    if (prev != null && p - prev === 2) items.push(prev + 1);
    else if (prev != null && p - prev > 2) items.push("gap");
    items.push(p);
  });
  return items;
};

// Pagination above match lists. `page` is 0-based; pages are shown 1-based.
const Pager = ({
  page,
  pageSize,
  total,
  disabled,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}) => {
  if (!total) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages - 1);
  const first = current * pageSize + 1;
  const last = Math.min((current + 1) * pageSize, total);

  const go = (p: number) => {
    if (!disabled && p !== current && p >= 0 && p < totalPages) onChange(p);
  };

  const arrow =
    "flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-gray-200 disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-gray-800";

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center gap-1 text-xs tabular-nums text-gray-500 dark:text-gray-400"
    >
      <span className="mr-1 hidden sm:inline">
        {first}–{last} of {total}
      </span>

      {totalPages > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(current - 1)}
            disabled={current === 0 || disabled}
            aria-label="Previous page"
            className={arrow}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pageItems(current, totalPages).map((item, i) =>
            item === "gap" ? (
              <span key={`gap-${i}`} aria-hidden className="w-4 text-center">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => go(item)}
                disabled={disabled && item !== current}
                aria-label={`Page ${item + 1}`}
                aria-current={item === current ? "page" : undefined}
                className={cn(
                  "h-6 min-w-6 rounded px-1 font-medium transition-colors",
                  item === current
                    ? "cursor-default bg-[#38003c] text-white dark:bg-gray-600"
                    : "cursor-pointer hover:bg-gray-200 disabled:opacity-30 dark:hover:bg-gray-800",
                )}
              >
                {item + 1}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => go(current + 1)}
            disabled={current >= totalPages - 1 || disabled}
            aria-label="Next page"
            className={arrow}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}
    </nav>
  );
};

export default Pager;
