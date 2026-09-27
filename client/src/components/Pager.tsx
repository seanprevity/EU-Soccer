"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";


// Used for pagination on recent form
const Pager = ({
  page,
  pageSize,
  total,
  totalPages,
  disabled,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  disabled?: boolean;
  onChange: (page: number) => void;
}) => {
  if (!total) return null;
  const first = page * pageSize + 1;
  const last = Math.min((page + 1) * pageSize, total);
  const btn =
    "rounded p-1 hover:bg-gray-200 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-gray-800";

  return (
    <div className="flex items-center gap-2 text-xs tabular-nums text-gray-500 dark:text-gray-400">
      <span>
        {first}–{last} of {total}
      </span>
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0 || disabled}
        aria-label="Previous page"
        className={btn}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages - 1 || disabled}
        aria-label="Next page"
        className={btn}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Pager;
